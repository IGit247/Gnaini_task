import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, JSON
from backend.app.core.database import Base

class AudioNote(Base):
    __tablename__ = "audio_notes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    title = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, nullable=False, default=0)
    duration_seconds = Column(Float, nullable=True, default=0.0)
    mime_type = Column(String(100), nullable=False, default="audio/mpeg")
    language_code = Column(String(20), nullable=False, default="en-IN")
    
    # State tracking: QUEUED -> PROCESSING_AUDIO -> TRANSCRIBING -> SUMMARIZING -> COMPLETED / FAILED
    status = Column(String(50), nullable=False, default="QUEUED", index=True)
    progress_percent = Column(Integer, nullable=False, default=0)
    progress_message = Column(String(255), nullable=False, default="Note queued for processing...")
    error_message = Column(Text, nullable=True)

    # Transcription results
    transcript_text = Column(Text, nullable=True)
    transcript_metadata = Column(JSON, nullable=True) # ASR request ID, timestamps, segments, engine info

    # LLM Summarization results
    summary_tldr = Column(Text, nullable=True)
    summary_markdown = Column(Text, nullable=True)
    summary_key_points = Column(JSON, nullable=True) # list of strings
    summary_action_items = Column(JSON, nullable=True) # list of strings
    summary_sentiment = Column(String(50), nullable=True) # e.g. Positive, Neutral, Action-oriented

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "filename": self.filename,
            "file_size_bytes": self.file_size_bytes,
            "duration_seconds": self.duration_seconds,
            "mime_type": self.mime_type,
            "language_code": self.language_code,
            "status": self.status,
            "progress_percent": self.progress_percent,
            "progress_message": self.progress_message,
            "error_message": self.error_message,
            "transcript_text": self.transcript_text,
            "transcript_metadata": self.transcript_metadata,
            "summary_tldr": self.summary_tldr,
            "summary_markdown": self.summary_markdown,
            "summary_key_points": self.summary_key_points,
            "summary_action_items": self.summary_action_items,
            "summary_sentiment": self.summary_sentiment,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
