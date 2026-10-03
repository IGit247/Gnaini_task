import os
import json
import time
import glob
import shutil
import asyncio
import logging
import subprocess
from typing import Dict, Any, Optional, Callable, List

import httpx

from backend.app.core.config import settings

logger = logging.getLogger("gnani_asr")

# Gnani's REST endpoint rejects audio longer than 30 seconds.
# We keep a safety margin, and never trust a config value above it.
GNANI_REST_HARD_LIMIT = 25
REST_MAX_SECONDS = min(
    int(getattr(settings, "REST_STT_MAX_DURATION_SECONDS", GNANI_REST_HARD_LIMIT)),
    GNANI_REST_HARD_LIMIT,
)
# Set USE_GNANI_BATCH=true in settings to route long audio to the Batch API
# instead of chunking. Chunking is the default because it is simpler and reliable.
USE_BATCH = bool(getattr(settings, "USE_GNANI_BATCH", False))


# ----------------------------------------------------------------------------
# ffmpeg helpers (blocking; always call through asyncio.to_thread)
# ----------------------------------------------------------------------------
def _require_ffmpeg() -> None:
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise RuntimeError(
            "ffmpeg/ffprobe not found on PATH. Install ffmpeg "
            "(Windows: 'winget install Gyan.FFmpeg', then restart the terminal)."
        )


def _is_real_wav(path: str) -> bool:
    try:
        with open(path, "rb") as f:
            return f.read(4) == b"RIFF"
    except OSError:
        return False


def _convert_to_wav(src_path: str) -> str:
    """Convert ANY audio (webm/mp3/m4a/...) to 16 kHz mono PCM WAV."""
    _require_ffmpeg()
    out_path = os.path.splitext(src_path)[0] + "_16k.wav"
    proc = subprocess.run(
        ["ffmpeg", "-y", "-i", src_path, "-vn", "-ar", "16000", "-ac", "1",
         "-c:a", "pcm_s16le", out_path],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg could not decode the audio: {proc.stderr[-500:]}")
    return out_path


def _get_duration(path: str) -> float:
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True,
    )
    try:
        return float(proc.stdout.strip())
    except ValueError:
        return 0.0


def _split_wav(path: str, seconds: int) -> List[str]:
    base = os.path.splitext(path)[0]
    for old in glob.glob(f"{base}_part*.wav"):
        os.remove(old)
    proc = subprocess.run(
        ["ffmpeg", "-y", "-i", path, "-f", "segment", "-segment_time", str(seconds),
         "-c", "copy", f"{base}_part%03d.wav"],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg could not split the audio: {proc.stderr[-500:]}")
    return sorted(glob.glob(f"{base}_part*.wav"))


def _extract_error(response: httpx.Response) -> str:
    """Gnani nests errors as {"error": {"type": ..., "message": ...}}."""
    try:
        data = response.json()
        err = data.get("error")
        if isinstance(err, dict):
            return f"{err.get('type', 'ERROR')}: {err.get('message', '')}"[:500]
        if isinstance(err, str):
            return err[:500]
        return str(data.get("message", response.text))[:500]
    except Exception:
        return response.text[:500]


class GnaniASRService:
    def __init__(self):
        self.api_key = settings.GNANI_API_KEY
        self.base_url = settings.GNANI_API_BASE_URL.rstrip("/")
        self.default_language = settings.GNANI_DEFAULT_LANGUAGE
        self.timeout = httpx.Timeout(120.0, connect=20.0)

    @property
    def is_configured(self) -> bool:
        return bool(
            self.api_key
            and len(self.api_key.strip()) > 5
            and not self.api_key.startswith("mock_")
        )

    async def transcribe(
        self,
        file_path: str,
        language_code: Optional[str] = None,
        duration_seconds: float = 0.0,
        progress_callback: Optional[Callable[[int, str], None]] = None,
    ) -> Dict[str, Any]:
        """
        1. Convert whatever was uploaded/recorded into a real 16 kHz mono WAV.
        2. Measure the real duration with ffprobe (browser recordings often
           carry no duration metadata, so the passed-in value is not trusted).
        3. <= 25s  -> Gnani REST in one call.
           >  25s  -> split into 25s chunks and transcribe each (default),
                      or use the Batch API if USE_GNANI_BATCH is enabled.
        """
        lang = language_code or self.default_language

        if not self.is_configured:
            logger.info("Gnani API key not configured. Running Sandbox simulation.")
            return await self._mock_transcription(
                file_path, lang, duration_seconds, progress_callback
            )

        temp_files: List[str] = []
        try:
            if progress_callback:
                progress_callback(20, "Converting audio to WAV...")
            wav_path = await asyncio.to_thread(_convert_to_wav, file_path)
            temp_files.append(wav_path)

            # If the stored file is named .wav but is really WebM/other, replace it
            # with the real WAV so the browser audio player can play it too.
            if file_path.lower().endswith(".wav") and not _is_real_wav(file_path):
                shutil.copyfile(wav_path, file_path)
                logger.info("Repaired mislabeled audio file for playback: %s", file_path)

            real_duration = await asyncio.to_thread(_get_duration, wav_path)
            if real_duration <= 0:
                real_duration = duration_seconds
            logger.info("Audio duration: %.1fs", real_duration)

            if real_duration <= REST_MAX_SECONDS:
                if progress_callback:
                    progress_callback(30, "Transcribing with Gnani REST ASR...")
                return await self._transcribe_rest(wav_path, lang)

            if USE_BATCH:
                if progress_callback:
                    progress_callback(
                        30,
                        f"Long audio ({round(real_duration)}s). Submitting to Gnani Batch ASR...",
                    )
                return await self._transcribe_batch(wav_path, lang, progress_callback)

            return await self._transcribe_chunked(
                wav_path, lang, real_duration, temp_files, progress_callback
            )
        except Exception as e:
            logger.error(f"Gnani ASR live call encountered an error: {str(e)}")
            raise RuntimeError(f"Gnani ASR Service Error: {str(e)}")
        finally:
            for p in temp_files:
                try:
                    if os.path.exists(p):
                        os.remove(p)
                except OSError:
                    pass

    async def _transcribe_chunked(
        self,
        wav_path: str,
        language_code: str,
        duration: float,
        temp_files: List[str],
        progress_callback: Optional[Callable[[int, str], None]] = None,
    ) -> Dict[str, Any]:
        parts = await asyncio.to_thread(_split_wav, wav_path, REST_MAX_SECONDS)
        temp_files.extend(parts)
        if not parts:
            raise RuntimeError("Audio splitting produced no chunks")

        texts: List[str] = []
        raw: List[Any] = []
        total = len(parts)
        for i, part in enumerate(parts, start=1):
            if progress_callback:
                pct = 30 + int(35 * (i - 1) / total)
                progress_callback(pct, f"Transcribing chunk {i}/{total} with Gnani ASR...")
            result = await self._transcribe_rest(part, language_code)
            text = (result.get("transcript") or "").strip()
            if text:
                texts.append(text)
            raw.append(result.get("raw_response"))

        return {
            "transcript": " ".join(texts).strip(),
            "engine": "gnani-rest-v3-chunked",
            "chunks": total,
            "duration_seconds": round(duration, 1),
            "raw_response": raw,
        }

    async def _transcribe_rest(self, file_path: str, language_code: str) -> Dict[str, Any]:
        """
        Calls Gnani REST STT: POST https://api.vachana.ai/stt/v3
        Header: X-API-Key-ID: <api_key>
        Form: audio_file, language_code, format=transcribe
        """
        url = f"{self.base_url}/stt/v3"
        headers = {"X-API-Key-ID": self.api_key}

        filename = os.path.basename(file_path)
        with open(file_path, "rb") as f:
            audio_bytes = f.read()

        files = {"audio_file": (filename, audio_bytes, "audio/wav")}
        data = {
            "language_code": language_code,
            "format": "transcribe",
            "itn_native_numerals": "false",
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, headers=headers, files=files, data=data)

            if response.status_code != 200:
                raise RuntimeError(
                    f"Gnani REST ASR failed (HTTP {response.status_code}): "
                    f"{_extract_error(response)}"
                )

            result = response.json()
            transcript = result.get("transcript", "")
            return {
                "transcript": transcript,
                "engine": "gnani-rest-v3",
                "request_id": result.get("request_id"),
                "timestamp": result.get("timestamp"),
                "raw_response": result,
            }

    async def _transcribe_batch(
        self,
        file_path: str,
        language_code: str,
        progress_callback: Optional[Callable[[int, str], None]] = None,
    ) -> Dict[str, Any]:
        """
        Gnani Batch STT workflow:
        1. POST /stt/v3/batch/jobs -> create job
        2. POST /stt/v3/batch/jobs/{id}/start -> start job
        3. Poll GET /stt/v3/batch/jobs/{id} until COMPLETED
        4. GET /stt/v3/batch/jobs/{id}/files -> get transcript_url
        5. Download full_transcript
        """
        headers = {"X-API-Key-ID": self.api_key}
        filename = os.path.basename(file_path)

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            create_url = f"{self.base_url}/stt/v3/batch/jobs"
            job_config = {
                "model": "gnani-prisma-v2.5",
                "language_code": language_code,
                "mode": "transcribe",
                "with_diarization": False,
                "is_multi_channel": False,
            }

            with open(file_path, "rb") as f:
                file_content = f.read()

            files = {
                "config": (None, json.dumps(job_config), "application/json"),
                "files": (filename, file_content, "audio/wav"),
            }

            if progress_callback:
                progress_callback(35, "Creating Gnani Batch ASR job...")

            res_create = await client.post(create_url, headers=headers, files=files)
            if res_create.status_code not in (200, 201):
                raise RuntimeError(
                    f"Gnani Batch Job creation failed (HTTP {res_create.status_code}): "
                    f"{_extract_error(res_create)}"
                )

            create_data = res_create.json()
            job_id = create_data.get("job_id")
            if not job_id:
                raise RuntimeError(f"Gnani did not return a job_id: {res_create.text}")

            start_url = f"{self.base_url}/stt/v3/batch/jobs/{job_id}/start"
            if progress_callback:
                progress_callback(40, f"Starting Gnani Batch job ({job_id[:8]}...)...")

            res_start = await client.post(start_url, headers=headers)
            if res_start.status_code not in (200, 202):
                raise RuntimeError(
                    f"Gnani Batch Job start failed (HTTP {res_start.status_code}): "
                    f"{_extract_error(res_start)}"
                )

            poll_url = f"{self.base_url}/stt/v3/batch/jobs/{job_id}"
            max_attempts = 60  # 60 * 5s = up to 5 minutes
            for attempt in range(max_attempts):
                await asyncio.sleep(5)  # FIX: time.sleep() cannot be awaited
                res_status = await client.get(poll_url, headers=headers)
                if res_status.status_code != 200:
                    continue

                status_data = res_status.json()
                current_status = status_data.get("status", "").upper()

                pct = min(40 + (attempt * 2), 65)
                if progress_callback:
                    progress_callback(
                        pct, f"Gnani Batch processing: {current_status} (attempt {attempt + 1})..."
                    )

                if current_status == "COMPLETED":
                    break
                elif current_status in ("FAILED", "CANCELLED", "ERROR"):
                    err_msg = status_data.get("message") or status_data.get("error") or "Unknown error"
                    raise RuntimeError(f"Gnani Batch Job ended with status {current_status}: {err_msg}")
            else:
                raise TimeoutError(f"Gnani Batch STT timed out after {max_attempts * 5} seconds")

            files_url = f"{self.base_url}/stt/v3/batch/jobs/{job_id}/files"
            res_files = await client.get(files_url, headers=headers)
            if res_files.status_code != 200:
                raise RuntimeError(
                    f"Failed to fetch completed batch files (HTTP {res_files.status_code}): "
                    f"{_extract_error(res_files)}"
                )

            files_data = res_files.json()
            file_items = files_data.get("files", [])
            if not file_items:
                raise RuntimeError("Gnani Batch returned empty file list on job completion")

            transcript_url = file_items[0].get("transcript_url")
            if not transcript_url:
                raise RuntimeError(f"Transcript URL missing in Gnani response: {files_data}")

            if progress_callback:
                progress_callback(70, "Downloading final transcript from Gnani...")

            res_transcript = await client.get(transcript_url)
            if res_transcript.status_code != 200:
                raise RuntimeError(f"Failed to download transcript from {transcript_url}")

            trans_json = res_transcript.json()
            full_transcript = trans_json.get("full_transcript") or trans_json.get("transcript", "")

            return {
                "transcript": full_transcript,
                "engine": "gnani-batch-prisma-v2.5",
                "job_id": job_id,
                "raw_response": trans_json,
            }

    async def _mock_transcription(
        self,
        file_path: str,
        language_code: str,
        duration_seconds: float,
        progress_callback: Optional[Callable[[int, str], None]] = None,
    ) -> Dict[str, Any]:
        """Sandbox simulation used when no API key is configured."""
        steps = [
            (30, "Analyzing audio waveform and sample properties..."),
            (45, f"Transcribing audio with simulated Gnani Prisma v2.5 engine ({language_code})..."),
            (60, "Applying Inverse Text Normalization (ITN) & formatting punctuation..."),
        ]
        for pct, msg in steps:
            if progress_callback:
                progress_callback(pct, msg)
            await asyncio.sleep(1.2)

        if duration_seconds > 90:
            transcript = (
                "Hello everyone, thank you for joining today's product strategy review. "
                "Over the past quarter, we have observed a significant increase in user adoption across our voice notes platform. "
                "First, regarding our infrastructure roadmap: we are transitioning our transcription pipeline to use Gnani's "
                "latest Prisma v2.5 ASR models for Indian languages, which has demonstrated over thirty percent lower word error rates. "
                "Second, our backend team needs to optimize the chunking pipeline and background job queue using FastAPI BackgroundTasks "
                "and Celery workers to comfortably handle multi-minute customer recordings. "
                "Third, on the storage side, we are decoupling direct server disk storage in favor of S3-compatible object buckets "
                "with automated presigned streaming URLs for seamless audio playback. "
                "Action items for the upcoming sprint: Rahul will finalize the Gnani batch job polling thresholds, "
                "Priya will integrate structured LLM summarization schemas with Google Gemini, and our QA team will benchmark "
                "resilience against dropped connections and corrupted audio files. Let's aim to review the deployment by Friday."
            )
        else:
            transcript = (
                "Hi team, just a quick audio update regarding our product launch. "
                "The core audio transcription workflow using Gnani Speech-to-Text is now operational and handling uploads seamlessly. "
                "Please verify that the LLM summarizer generates both the executive TL;DR and concrete action items accurately. "
                "Make sure to test the system with audio clips of varying lengths and check that progress bars update in real time. "
                "Thank you everyone!"
            )

        return {
            "transcript": transcript,
            "engine": "gnani-sandbox-simulator",
            "request_id": f"sandbox_{int(time.time())}",
            "language_code": language_code,
            "note": "Sandbox mode active. To switch to live Gnani STT, configure GNANI_API_KEY in .env",
        }


gnani_asr_service = GnaniASRService()