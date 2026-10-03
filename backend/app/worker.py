import logging
import traceback
from datetime import datetime
from backend.app.core.database import SessionLocal
from backend.app.models.note import AudioNote
from backend.app.services.storage import storage_service
from backend.app.services.audio_processor import audio_processor
from backend.app.services.gnani_asr import gnani_asr_service
from backend.app.services.llm_summarizer import llm_summarizer_service

logger = logging.getLogger("worker")

async def process_audio_note_job(note_id: str):
    """
    Asynchronous background job pipeline executing:
    Audio Analysis -> Gnani STT Transcription -> LLM Summarization -> DB Persistence
    """
    db = SessionLocal()
    try:
        note = db.query(AudioNote).filter(AudioNote.id == note_id).first()
        if not note:
            logger.error(f"Job failed: Note {note_id} not found in database.")
            return

        def update_progress(percent: int, message: str, status: str = None):
            try:
                # Re-query inside worker to update progress safely
                n = db.query(AudioNote).filter(AudioNote.id == note_id).first()
                if n:
                    n.progress_percent = percent
                    n.progress_message = message
                    if status:
                        n.status = status
                    n.updated_at = datetime.utcnow()
                    db.commit()
            except Exception as pe:
                logger.warning(f"Failed to update progress: {pe}")
                db.rollback()

        # Step 1: Resolve local file path
        local_path = storage_service.get_local_path(note.file_path)

        # Step 2: Audio Analysis & Duration Detection
        update_progress(10, "Inspecting audio format and speech duration...", "PROCESSING_AUDIO")
        try:
            audio_info = audio_processor.get_audio_info(local_path)
            note.duration_seconds = audio_info["duration_seconds"]
            db.commit()
            dur_str = audio_processor.format_duration(note.duration_seconds)
            update_progress(20, f"Audio validated ({dur_str}). Preparing transcription...")
        except Exception as ae:
            raise ValueError(f"Audio inspection failed: {str(ae)}")

        # Step 3: Transcription with Gnani ASR
        update_progress(30, "Connecting to Gnani ASR...", "TRANSCRIBING")
        asr_result = await gnani_asr_service.transcribe(
            file_path=local_path,
            language_code=note.language_code,
            duration_seconds=note.duration_seconds or 0.0,
            progress_callback=lambda p, msg: update_progress(p, msg)
        )

        transcript = asr_result.get("transcript", "").strip()
        if not transcript:
            raise RuntimeError("Gnani ASR returned an empty transcript. Please check audio quality or language.")

        note.transcript_text = transcript
        note.transcript_metadata = asr_result
        db.commit()

        # Step 4: Summarization with LLM
        update_progress(75, "Generating executive summary, key takeaways, and action items...", "SUMMARIZING")
        summary_result = await llm_summarizer_service.summarize(transcript, title=note.title)

        note.summary_tldr = summary_result.get("tldr")
        note.summary_markdown = summary_result.get("markdown_content")
        note.summary_key_points = summary_result.get("key_points", [])
        note.summary_action_items = summary_result.get("action_items", [])
        note.summary_sentiment = summary_result.get("sentiment")

        # Step 5: Mark Completed
        note.status = "COMPLETED"
        note.progress_percent = 100
        note.progress_message = "Transcription and AI summary completed!"
        note.error_message = None
        note.updated_at = datetime.utcnow()
        db.commit()
        logger.info(f"Successfully processed note {note_id} ({note.title})")

    except Exception as e:
        db.rollback()
        err_str = str(e)
        logger.error(f"Error in background pipeline for note {note_id}: {err_str}\n{traceback.format_exc()}")
        try:
            failed_note = db.query(AudioNote).filter(AudioNote.id == note_id).first()
            if failed_note:
                failed_note.status = "FAILED"
                failed_note.progress_message = f"Processing stopped: {err_str[:120]}"
                failed_note.error_message = f"{err_str}\n\nTechnical details:\n{traceback.format_exc()}"
                failed_note.updated_at = datetime.utcnow()
                db.commit()
        except Exception as dbe:
            logger.critical(f"Failed to record failure state for note {note_id}: {dbe}")
    finally:
        db.close()
