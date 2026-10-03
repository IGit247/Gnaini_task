import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Path as PathParam
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.note import AudioNote
from backend.app.schemas.note import JobStatusResponse

router = APIRouter(tags=["Jobs"])

@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_job_status(
    job_id: str = PathParam(..., description="Audio note identifier"),
    db: Session = Depends(get_db)
):
    """
    Returns current processing status, progress percentage, stage message, and error if any.
    Used for frontend progress polling.
    """
    note = db.query(AudioNote).filter(AudioNote.id == job_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Job/Note not found")

    return JobStatusResponse(
        id=note.id,
        status=note.status,
        progress_percent=note.progress_percent,
        progress_message=note.progress_message,
        error_message=note.error_message,
        duration_seconds=note.duration_seconds,
        updated_at=note.updated_at
    )

@router.get("/jobs/{job_id}/events")
async def stream_job_events(
    job_id: str = PathParam(...),
    db: Session = Depends(get_db)
):
    """
    Server-Sent Events (SSE) stream delivering real-time progress updates directly to the frontend.
    Allows the UI to update without constant HTTP polling overhead.
    """
    async def event_generator():
        last_percent = -1
        last_status = None
        max_duration_seconds = 300 # 5 min limit for SSE connection
        elapsed = 0
        
        while elapsed < max_duration_seconds:
            # Re-fetch note
            note = db.query(AudioNote).filter(AudioNote.id == job_id).first()
            if not note:
                data = json.dumps({"error": "Job not found"})
                yield f"event: error\ndata: {data}\n\n"
                break

            if note.progress_percent != last_percent or note.status != last_status:
                payload = {
                    "id": note.id,
                    "status": note.status,
                    "progress_percent": note.progress_percent,
                    "progress_message": note.progress_message,
                    "error_message": note.error_message,
                    "duration_seconds": note.duration_seconds
                }
                yield f"data: {json.dumps(payload)}\n\n"
                last_percent = note.progress_percent
                last_status = note.status

            if note.status in ("COMPLETED", "FAILED"):
                break

            await asyncio.sleep(1)
            elapsed += 1

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
