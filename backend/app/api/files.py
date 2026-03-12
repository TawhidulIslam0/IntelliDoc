import uuid
import boto3

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

from pydantic import BaseModel

# AWS S3 Configuration
s3 = boto3.client(
    "s3",
    region_name="us-east-1",
    aws_access_key_id="YOUR_ACCESS_KEY", # Replace with your actual AWS access key (delete afterwards)
    aws_secret_access_key="YOUR_SECRET_KEY" # Replace with your actual AWS secret key (delete afterwards)
)

BUCKET_NAME = "intellidoc-project-files-2026"
PRESIGNED_URL_EXPIRY = 3600

# Pydantic models for request/response schemas
class InitiateUploadRequest(BaseModel):
    name: str # file name
    size_bytes: int
    mime_type: str
    folder_id: Optional[uuid.UUID] = None

class InitiateUploadResponse(BaseModel):
    file_id: uuid.UUID
    presigned_url: str

# API Router for file-related endpoints
router = APIRouter(prefix="/files", tags=["files"])

# @router.get("/")
# async def list_files(
#     db: Session = Depends(get_db),
#     current_user = Depends(get_current_user)
# ):
#     files = db.query(FileModel).filter(FileModel.owner_id == current_user.id).all()
#     return files



# Endpoint to initiate file upload by generating a presigned URL and creating a pending file record in the database
@router.post("/initiate-upload", response_model=InitiateUploadResponse, status_code=status.HTTP_201_CREATED)
async def initiate_upload(
    payload: InitiateUploadRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    # Check for duplicate file name in the same folder
    existing_file = db.execute(
        select(File).where(
            File.owner_id == current_user.id,
            File.folder_id == payload.folder_id,
            File.name == payload.name
        )
    ).scalar_one_or_none()

    if existing_file:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A file with the same name already exists in this folder.")


    # Build S3 key and generate presigned URL
    file_id = uuid.uuid4()
    s3_key = f"uploads/{current_user.id}/{file_id}/{payload.name}"
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
        id = file_id,
        owner_id = current_user.id,
        folder_id = payload.folder_id,
        name = payload.name,
        s3_key = s3_key,
        size_bytes = payload.size_bytes,
        mime_type = payload.mime_type,
        status = "pending", # status will be updated to "uploaded" after client confirms upload
        created_at = now,
        updated_at = now
    )

    db.add(new_file)
    db.commit()
    db.refresh(new_file)

    # Sends presigned URL and file ID back to client so they can upload directly to S3 and then confirm the upload
    return InitiateUploadResponse(file_id=new_file.id, presigned_url=presigned_url)
    
