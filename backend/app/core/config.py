import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "Audio Notes Platform"
    API_V1_PREFIX: str = "/api"
    
    # Database
    DATABASE_URL: str = Field(
        default="sqlite:///./audio_notes.db",
        description="PostgreSQL connection string for production or SQLite for local dev"
    )
    
    # Gnani ASR Configuration
    GNANI_API_KEY: Optional[str] = Field(
        default=None,
        description="Gnani Prisma v2.5 STT API Key (from app.gnani.ai)"
    )
    GNANI_API_BASE_URL: str = Field(
        default="https://api.vachana.ai",
        description="Gnani STT Base API endpoint"
    )
    GNANI_DEFAULT_LANGUAGE: str = Field(
        default="en-IN",
        description="Default ASR language code (e.g., en-IN, hi-IN, ta-IN, te-IN, kn-IN)"
    )
    
    # LLM Summarizer Configuration
    # Supported providers: 'gemini', 'openai', 'groq', 'auto', 'mock'
    LLM_PROVIDER: str = Field(
        default="auto",
        description="LLM provider for summarization. 'auto' selects based on available keys"
    )
    GEMINI_API_KEY: Optional[str] = Field(default=None, description="Google Gemini API Key")
    OPENAI_API_KEY: Optional[str] = Field(default=None, description="OpenAI API Key")
    GROQ_API_KEY: Optional[str] = Field(default=None, description="Groq API Key")
    
    # Storage Configuration
    # Supported: 'local', 's3' (covers AWS S3, Supabase Storage, Cloudflare R2, MinIO)
    STORAGE_TYPE: str = Field(
        default="local",
        description="Storage provider: 'local' filesystem or S3-compatible cloud bucket"
    )
    STORAGE_LOCAL_DIR: str = Field(
        default="./uploads",
        description="Local directory for file uploads if STORAGE_TYPE='local'"
    )
    S3_BUCKET_NAME: Optional[str] = Field(default=None)
    S3_ENDPOINT_URL: Optional[str] = Field(default=None) # e.g. for Supabase or Cloudflare R2
    S3_ACCESS_KEY_ID: Optional[str] = Field(default=None)
    S3_SECRET_ACCESS_KEY: Optional[str] = Field(default=None)
    S3_REGION: str = Field(default="us-east-1")
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    
    # Audio Processing Settings
    MAX_FILE_SIZE_MB: int = 100
    REST_STT_MAX_DURATION_SECONDS: int = 60 # Gnani REST endpoint recommended max
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
