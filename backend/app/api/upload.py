from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.note import AudioNote
from backend.app.schemas.note import AudioNoteCreateResponse
from backend.app.services.storage import storage_service
from backend.app.worker import process_audio_note_job

router = APIRouter(tags=["Upload"])

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".wave", ".m4a", ".aac", ".ogg", ".flac", ".webm", ".wma"}

@router.post("/upload", response_model=AudioNoteCreateResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_audio_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(None),
    language_code: str = Form(None),
    db: Session = Depends(get_db)
):
    """
    Upload an audio file of any length (handles 2 min+ seamlessly).
    Stores audio, creates record, and enqueues transcription & summarization pipeline.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No audio file was provided.")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format '{ext}'. Supported formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # Note title fallback to sanitized filename
    note_title = title.strip() if title and title.strip() else Path(file.filename).stem.replace("_", " ").replace("-", " ").title()
    lang = language_code.strip() if language_code and language_code.strip() else settings.GNANI_DEFAULT_LANGUAGE

    try:
        # Save audio file to storage (local disk or S3 bucket)
        stored_path, file_size = storage_service.save_file(file.file, file.filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to persist uploaded audio: {str(e)}")

    # Check maximum file size
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum upload size of {settings.MAX_FILE_SIZE_MB}MB (received {round(file_size/(1024*1024), 2)}MB)"
        )

    # Create AudioNote record
    note = AudioNote(
        title=note_title,
        filename=file.filename,
        file_path=stored_path,
        file_size_bytes=file_size,
        mime_type=file.content_type or "audio/mpeg",
        language_code=lang,
        status="QUEUED",
        progress_percent=5,
        progress_message="Upload received. Queued for background processing..."
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    # Enqueue background pipeline task
    background_tasks.add_task(process_audio_note_job, note.id)

    return AudioNoteCreateResponse(
        id=note.id,
        title=note.title,
        status=note.status,
        progress_percent=note.progress_percent,
        progress_message=note.progress_message,
        message="Audio file accepted. Background processing started."
    )
