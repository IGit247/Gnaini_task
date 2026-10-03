from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.schemas.note import SystemHealthResponse
from backend.app.services.gnani_asr import gnani_asr_service
from backend.app.services.llm_summarizer import llm_summarizer_service

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=SystemHealthResponse)
def check_health(db: Session = Depends(get_db)):
    """Health check reporting database, storage, and external API readiness"""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    gnani_configured = gnani_asr_service.is_configured
    gnani_mode = "live" if gnani_configured else "mock_sandbox"
    
    active_llm = llm_summarizer_service._determine_active_provider()
    llm_configured = active_llm in ("gemini", "openai", "groq")

    return SystemHealthResponse(
        status="ok" if db_status == "connected" else "degraded",
        database=db_status,
        storage_type=settings.STORAGE_TYPE,
        gnani_configured=gnani_configured,
        gnani_mode=gnani_mode,
        llm_provider=active_llm,
        llm_configured=llm_configured
    )
