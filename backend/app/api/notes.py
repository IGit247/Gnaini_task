import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.note import AudioNote
from backend.app.schemas.note import AudioNoteListItem, AudioNoteDetail, AudioNoteUpdate
from backend.app.services.storage import storage_service
from backend.app.worker import process_audio_note_job

router = APIRouter(tags=["Notes"])

@router.get("/notes", response_model=List[AudioNoteListItem])
def list_notes(
    search: Optional[str] = Query(None, description="Search by title or filename"),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db)
):
    """
    Returns list of all past uploads and audio notes, sorted by newest first.
    Supports optional search query and status filtering.
    """
    query = db.query(AudioNote)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter((AudioNote.title.ilike(s)) | (AudioNote.filename.ilike(s)))
    if status_filter:
        query = query.filter(AudioNote.status == status_filter.upper())
    
    notes = query.order_by(AudioNote.created_at.desc()).all()
    return notes

@router.get("/notes/{note_id}", response_model=AudioNoteDetail)
def get_note_detail(
    note_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieves full transcript, structured summary, action items, and metadata for a note.
    """
    note = db.query(AudioNote).filter(AudioNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Audio note not found")
    return note

@router.get("/notes/{note_id}/audio")
def stream_audio(
    note_id: str,
    db: Session = Depends(get_db)
):
    """
    Streams audio file directly for HTML5 playback in the frontend media player.
    """
    note = db.query(AudioNote).filter(AudioNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Audio note not found")
    
    try:
        return storage_service.get_audio_response(note.file_path, note.mime_type)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Audio file could not be found in storage")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stream audio: {str(e)}")

@router.patch("/notes/{note_id}", response_model=AudioNoteDetail)
def update_note(
    note_id: str,
    payload: AudioNoteUpdate,
    db: Session = Depends(get_db)
):
    """Updates note title"""
    note = db.query(AudioNote).filter(AudioNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Audio note not found")

    if payload.title is not None and payload.title.strip():
        note.title = payload.title.strip()
        db.commit()
        db.refresh(note)

    return note

@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: str,
    db: Session = Depends(get_db)
):
    """Deletes note and removes its audio file if present"""
    note = db.query(AudioNote).filter(AudioNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Audio note not found")

    # Attempt to remove local file
    try:
        local_p = storage_service.get_local_path(note.file_path)
        if os.path.exists(local_p):
            os.remove(local_p)
    except Exception:
        pass

    db.delete(note)
    db.commit()
    return None

@router.post("/notes/{note_id}/retry", response_model=AudioNoteDetail)
def retry_failed_note(
    note_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Allows user to visibly retry a note that previously failed
    (e.g., after API downtime, transient network blip, or updating API credentials).
    """
    note = db.query(AudioNote).filter(AudioNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Audio note not found")

    note.status = "QUEUED"
    note.progress_percent = 5
    note.progress_message = "Retry requested. Enqueuing for re-processing..."
    note.error_message = None
    db.commit()
    db.refresh(note)

    background_tasks.add_task(process_audio_note_job, note.id)
    return note
