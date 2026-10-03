from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class AudioNoteBase(BaseModel):
    title: str = Field(..., example="Product Sync Meeting")
    language_code: str = Field(default="en-IN", example="en-IN")

class AudioNoteCreateResponse(BaseModel):
    id: str
    title: str
    status: str
    progress_percent: int
    progress_message: str
    message: str

class JobStatusResponse(BaseModel):
    id: str
    status: str
    progress_percent: int
    progress_message: str
    error_message: Optional[str] = None
    duration_seconds: Optional[float] = None
    updated_at: Optional[datetime] = None

class AudioNoteListItem(BaseModel):
    id: str
    title: str
    filename: str
    file_size_bytes: int
    duration_seconds: Optional[float] = None
    language_code: str
    status: str
    progress_percent: int
    summary_tldr: Optional[str] = None
    summary_sentiment: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AudioNoteDetail(BaseModel):
    id: str
    title: str
    filename: str
    file_size_bytes: int
    duration_seconds: Optional[float] = None
    mime_type: str
    language_code: str
    status: str
    progress_percent: int
    progress_message: str
    error_message: Optional[str] = None
    
    transcript_text: Optional[str] = None
    transcript_metadata: Optional[Dict[str, Any]] = None
    
    summary_tldr: Optional[str] = None
    summary_markdown: Optional[str] = None
    summary_key_points: Optional[List[str]] = None
    summary_action_items: Optional[List[str]] = None
    summary_sentiment: Optional[str] = None
    
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AudioNoteUpdate(BaseModel):
    title: Optional[str] = None

class SystemHealthResponse(BaseModel):
    status: str
    database: str
    storage_type: str
    gnani_configured: bool
    gnani_mode: str # 'live' or 'mock_sandbox'
    llm_provider: str
    llm_configured: bool
