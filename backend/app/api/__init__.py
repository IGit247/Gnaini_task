from fastapi import APIRouter
from backend.app.api.upload import router as upload_router
from backend.app.api.jobs import router as jobs_router
from backend.app.api.notes import router as notes_router
from backend.app.api.health import router as health_router

api_router = APIRouter()
api_router.include_router(upload_router)
api_router.include_router(jobs_router)
api_router.include_router(notes_router)
api_router.include_router(health_router)
