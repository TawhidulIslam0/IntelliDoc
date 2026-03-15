import uuid
import boto3
import os

from sqlalchemy import select
from botocore.exceptions import ClientError
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, Optional

from app.database import get_db
from app.api.users import get_current_user 
from app.models.file import File 
from app.models.user import User
from botocore.config import Config
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# AWS S3 Configuration using .env variables
s3 = boto3.client(
    "s3",
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    config=Config(signature_version="s3v4")  # required for AWS4-HMAC-SHA256
)

BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")
PRESIGNED_URL_EXPIRY = 3600

# Pydantic models
class InitiateUploadRequest(BaseModel):
    name: str
    size_bytes: int
    mime_type: str
    folder_id: Optional[uuid.UUID] = None

class InitiateUploadResponse(BaseModel):
    file_id: uuid.UUID
    presigned_url: str

# Router
router = APIRouter(prefix="/files", tags=["files"])

@router.post("/initiate-upload", response_model=InitiateUploadResponse, status_code=status.HTTP_201_CREATED)
async def initiate_upload(
    payload: InitiateUploadRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    # Check for duplicate file name in the folder
    existing_file = db.execute(
        select(File).where(
            File.owner_id == current_user.id,
            File.folder_id == payload.folder_id,
            File.name == payload.name
        )
    ).scalar_one_or_none()

    if existing_file:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A file with the same name already exists in this folder.")

    # Generate S3 key
    file_id = uuid.uuid4()
    s3_key = f"uploads/{current_user.id}/{file_id}/{payload.name}"

    # Generate presigned URL
    try:
        presigned_url = s3.generate_presigned_url(
            "put_object",
            Params={"Bucket": BUCKET_NAME, "Key": s3_key, "ContentType": payload.mime_type},
            ExpiresIn=PRESIGNED_URL_EXPIRY
        )
    except ClientError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate presigned URL")

    now = datetime.now(timezone.utc)
    new_file = File(
        id=file_id,
        owner_id=current_user.id,
        folder_id=payload.folder_id,
        name=payload.name,
        s3_key=s3_key,
        size_bytes=payload.size_bytes,
        mime_type=payload.mime_type,
        status="pending",
        created_at=now,
        updated_at=now
    )

    db.add(new_file)
    db.commit()
    db.refresh(new_file)

    return InitiateUploadResponse(file_id=new_file.id, presigned_url=presigned_url)


# List files for dashboard
@router.get("/")
async def list_files(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    files = db.execute(
        select(File).where(File.owner_id == current_user.id)
    ).scalars().all()

    return [
        {
            "id": str(file.id),
            "name": file.name,
            "size_bytes": file.size_bytes,
            "mime_type": file.mime_type,
            "created_at": file.created_at
        }
        for file in files
    ]


# Preview file using presigned url
@router.get("/{file_id}/preview")
async def preview_file(
    file_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    file = db.get(File, file_id)

    if not file or file.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        presigned_url = s3.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": BUCKET_NAME,
                "Key": file.s3_key
            },
            ExpiresIn=PRESIGNED_URL_EXPIRY
        )
    except ClientError:
        raise HTTPException(status_code=500, detail="Failed to generate preview URL")

    return {"url": presigned_url}


# Download file using presigned url
@router.get("/{file_id}/download")
async def download_file(
    file_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    file = db.get(File, file_id)

    if not file or file.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        presigned_url = s3.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": BUCKET_NAME,
                "Key": file.s3_key,
                "ResponseContentDisposition": f'attachment; filename="{file.name}"'
            },
            ExpiresIn=PRESIGNED_URL_EXPIRY
        )
    except ClientError:
        raise HTTPException(status_code=500, detail="Failed to generate download URL")

    return {"url": presigned_url}