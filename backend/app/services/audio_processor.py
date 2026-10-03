import os
import wave
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from mutagen import File as MutagenFile

class AudioProcessor:
    @staticmethod
    def get_audio_info(file_path: str) -> Dict[str, Any]:
        """
        Inspects audio file using mutagen and wave to safely extract
        duration, channels, sample rate, and validate basic integrity.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Audio file not found: {file_path}")

        file_size = os.path.getsize(file_path)
        if file_size == 0:
            raise ValueError("Uploaded file is empty (0 bytes).")

        extension = Path(file_path).suffix.lower()
        duration = 0.0
        channels = 1
        sample_rate = 16000

        # Try Mutagen first (handles MP3, AAC, M4A, OGG, FLAC, WAV)
        try:
            audio = MutagenFile(file_path)
            if audio is not None and audio.info is not None:
                duration = float(getattr(audio.info, "length", 0.0))
                channels = int(getattr(audio.info, "channels", 1))
                sample_rate = int(getattr(audio.info, "sample_rate", 16000))
        except Exception:
            pass

        # Fallback for WAV via standard wave module
        if duration <= 0.0 and extension in [".wav", ".wave"]:
            try:
                with wave.open(file_path, "rb") as wf:
                    frames = wf.getnframes()
                    rate = wf.getframerate()
                    channels = wf.getnchannels()
                    sample_rate = rate
                    if rate > 0:
                        duration = frames / float(rate)
            except Exception as e:
                # If both fail, estimate or raise if corrupted
                pass

        # Fallback estimation for standard bitrates if metadata couldn't be parsed
        if duration <= 0.0:
            # Estimate assuming ~128 kbps (16 KB/sec) if non-empty
            duration = max(1.0, round(file_size / 16000.0, 2))

        return {
            "duration_seconds": round(duration, 2),
            "channels": channels,
            "sample_rate": sample_rate,
            "file_size_bytes": file_size,
            "extension": extension
        }

    @staticmethod
    def format_duration(seconds: Optional[float]) -> str:
        """Formats seconds into mm:ss or hh:mm:ss"""
        if not seconds or seconds < 0:
            return "00:00"
        total_secs = int(seconds)
        mins, secs = divmod(total_secs, 60)
        hours, mins = divmod(mins, 60)
        if hours > 0:
            return f"{hours:02d}:{mins:02d}:{secs:02d}"
        return f"{mins:02d}:{secs:02d}"

    @staticmethod
    def split_wav_file(file_path: str, chunk_duration_sec: int = 45) -> List[str]:
        """
        Slices a long WAV file into smaller contiguous chunks.
        Used for chunked STT processing when processing files via REST STT.
        """
        chunk_paths = []
        try:
            with wave.open(file_path, "rb") as wf:
                params = wf.getparams()
                frame_rate = wf.getframerate()
                chunk_frames = frame_rate * chunk_duration_sec
                total_frames = wf.getnframes()

                base_dir = os.path.dirname(file_path)
                stem = Path(file_path).stem

                part_idx = 0
                while wf.tell() < total_frames:
                    frames_to_read = min(chunk_frames, total_frames - wf.tell())
                    data = wf.readframes(frames_to_read)
                    part_path = os.path.join(base_dir, f"{stem}_chunk_{part_idx}.wav")
                    
                    with wave.open(part_path, "wb") as out_wf:
                        out_wf.setparams(params)
                        out_wf.writeframes(data)
                        
                    chunk_paths.append(part_path)
                    part_idx += 1
            return chunk_paths
        except Exception:
            return [file_path]

audio_processor = AudioProcessor()
