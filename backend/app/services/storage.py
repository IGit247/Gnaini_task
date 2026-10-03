import os
import shutil
import uuid
from pathlib import Path
from typing import BinaryIO, Optional, Tuple
from fastapi.responses import FileResponse, StreamingResponse
from backend.app.core.config import settings

class StorageService:
    def __init__(self):
        self.storage_type = settings.STORAGE_TYPE.lower()
        self.local_dir = Path(settings.STORAGE_LOCAL_DIR).resolve()
        self.local_dir.mkdir(parents=True, exist_ok=True)
        
        self.s3_client = None
        if self.storage_type == "s3" and settings.S3_BUCKET_NAME:
            import boto3
            self.s3_client = boto3.client(
                "s3",
                endpoint_url=settings.S3_ENDPOINT_URL,
                aws_access_key_id=settings.S3_ACCESS_KEY_ID,
                aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
                region_name=settings.S3_REGION
            )

    def save_file(self, file_content: BinaryIO, original_filename: str) -> Tuple[str, int]:
        """
        Saves uploaded file to local disk or S3 bucket.
        Returns a tuple of (stored_file_path_or_key, file_size_in_bytes)
        """
        extension = Path(original_filename).suffix.lower()
        if not extension:
            extension = ".mp3"
        unique_name = f"{uuid.uuid4().hex}{extension}"
        
        # Save locally first
        local_target = self.local_dir / unique_name
        file_content.seek(0)
        with open(local_target, "wb") as buffer:
            shutil.copyfileobj(file_content, buffer)
        
        file_size = os.path.getsize(local_target)
        
        if self.storage_type == "s3" and self.s3_client:
            s3_key = f"audio/{unique_name}"
            with open(local_target, "rb") as f:
                self.s3_client.upload_fileobj(f, settings.S3_BUCKET_NAME, s3_key)
            return s3_key, file_size
        
        return str(local_target), file_size

    def get_local_path(self, stored_path_or_key: str) -> str:
        """
        Ensures the file is accessible locally for processing.
        If stored in S3, downloads to cache directory.
        """
        if os.path.exists(stored_path_or_key):
            return stored_path_or_key
            
        # Check if it's a relative path in uploads
        candidate = self.local_dir / Path(stored_path_or_key).name
        if candidate.exists():
            return str(candidate)

        if self.storage_type == "s3" and self.s3_client:
            dest_path = self.local_dir / Path(stored_path_or_key).name
            if not dest_path.exists():
                self.s3_client.download_file(settings.S3_BUCKET_NAME, stored_path_or_key, str(dest_path))
            return str(dest_path)
            
        return stored_path_or_key

    def get_audio_response(self, stored_path_or_key: str, mime_type: str = "audio/mpeg"):
        """
        Returns a FastAPI response to stream audio directly to the frontend player.
        """
        local_path = self.get_local_path(stored_path_or_key)
        if os.path.exists(local_path):
            return FileResponse(
                path=local_path,
                media_type=mime_type,
                filename=os.path.basename(local_path)
            )
        raise FileNotFoundError(f"Audio file at {stored_path_or_key} could not be retrieved")

storage_service = StorageService()
