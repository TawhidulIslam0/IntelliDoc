import uuid
import boto3
import os
import json

from sqlalchemy import select
from botocore.exceptions import ClientError
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, Optional
from botocore.config import Config
from pydantic import BaseModel
from dotenv import load_dotenv

from app.database import get_db
from app.api.users import get_current_user 
from app.models.file import File 
from app.models.user import User
from app.models.profile import Profile

# Load environment variables from .env
load_dotenv()

# AWS S3 Configuration using environment variables
s3 = boto3.client(
    "s3",
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    config=Config(signature_version="s3v4")
)

# Bucket name and presigned URL expiry
BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")
PRESIGNED_URL_EXPIRY = 3600

router = APIRouter(prefix="/files", tags=["files"])

# Pydantic models
class InitiateUploadRequest(BaseModel):
    name: str
    size_bytes: int
    mime_type: str
    folder_id: Optional[uuid.UUID] = None
    profile_id: uuid.UUID 


class InitiateUploadResponse(BaseModel):
    file_id: uuid.UUID
    presigned_url: str


class CreateBlankDocRequest(BaseModel):
    name: str = "Untitled Document.idoc"
    folder_id: Optional[uuid.UUID] = None
    profile_id: uuid.UUID


class UpdateFileContentRequest(BaseModel):
    content: dict
    
class RenameFileRequest(BaseModel):
    name: str

# Create presigned URL for file upload
@router.post("/initiate-upload", response_model=InitiateUploadResponse, status_code=status.HTTP_201_CREATED)
async def initiate_upload(
    payload: InitiateUploadRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    # Check that the profile belongs to the current user
    profile = db.scalar(
        select(Profile).where(
            Profile.id == payload.profile_id,
            Profile.owner_id == current_user.id
        )
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found or not owned by user")

    # Check for duplicate file name in same folder/profile
    existing_file = db.execute(
        select(File).where(
            File.owner_id == current_user.id,
            File.profile_id == payload.profile_id,
            File.folder_id == payload.folder_id,
            File.name == payload.name
        )
    ).scalar_one_or_none()

    if existing_file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A file with the same name already exists in this folder and profile."
        )

    # Generate unique file ID and S3 key
    file_id = uuid.uuid4()
    s3_key = f"uploads/{current_user.id}/{file_id}/{payload.name}"

    # Generate presigned URL for upload
    try:
        presigned_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": BUCKET_NAME,
                "Key": s3_key,
                "ContentType": payload.mime_type
            },
            ExpiresIn=PRESIGNED_URL_EXPIRY
        )
    except ClientError:
        raise HTTPException(status_code=500, detail="Failed to generate presigned URL")

    # Save file metadata in database
    now = datetime.now(timezone.utc)
    new_file = File(
        id=file_id,
        owner_id=current_user.id,
        profile_id=payload.profile_id,
        folder_id=payload.folder_id,
        name=payload.name,
        s3_key=s3_key,
        size_bytes=payload.size_bytes,
        mime_type=payload.mime_type,
        status="pending",
        created_at=now.isoformat(),
        updated_at=now.isoformat()
    )

    db.add(new_file)
    db.commit()
    db.refresh(new_file)

    # Return presigned URL to client
    return InitiateUploadResponse(file_id=new_file.id, presigned_url=presigned_url)

# Creating blank document endpoint
@router.post("/create-blank-doc", status_code=status.HTTP_201_CREATED)
async def create_blank_doc(
    payload: CreateBlankDocRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    #  Check profile ownership
    profile = db.scalar(
        select(Profile).where(
            Profile.id == payload.profile_id,
            Profile.owner_id == current_user.id
        )
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Handle unique naming logic (Untitled Document, Untitled Document (1), etc.)
    base_name = "Untitled Document"
    extension = ".idoc"
    final_name = f"{base_name}{extension}"
    
    counter = 1
    while True:
        # Check if a file with this exact name already exists in this specific folder/profile
        existing = db.scalar(
            select(File).where(
                File.owner_id == current_user.id,
                File.profile_id == payload.profile_id,
                File.folder_id == payload.folder_id,
                File.name == final_name
            )
        )
        
        if not existing:
            # Name is available! Break the loop
            break
        
        # Name is taken, try the next number
        final_name = f"{base_name} ({counter}){extension}"
        counter += 1

    #  Proceed with S3 and DB insertion using final_name
    file_id = uuid.uuid4()
    s3_key = f"uploads/{current_user.id}/{file_id}/{final_name}"

    try:
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=json.dumps({"pages": [""]}),
            ContentType="application/json"
        )
    except ClientError:
        raise HTTPException(status_code=500, detail="Failed to initialize S3 storage")

    now = datetime.now(timezone.utc).isoformat()

    new_file = File(
        id=file_id,
        owner_id=current_user.id,
        profile_id=payload.profile_id,
        folder_id=payload.folder_id,
        name=final_name, 
        s3_key=s3_key,
        size_bytes=0,
        mime_type="application/json",
        status="completed",
        created_at=now,
        updated_at=now
    )

    db.add(new_file)
    db.commit()
    db.refresh(new_file)

    return {
        "file_id": str(new_file.id),
        "name": new_file.name,
        "message": "Blank document created successfully"
    }


# List files for current user, optionally filtered by folder
@router.get("/")
async def list_files(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    profile_id: Optional[uuid.UUID] = None,
    folder_id: Optional[uuid.UUID] = None
):
    # Default to default profile if none provided
    if not profile_id:
        profile = db.scalar(
            select(Profile).where(
                Profile.owner_id == current_user.id,
                Profile.is_default == True
            )
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Default profile not found")
        profile_id = profile.id

    # Fetch files for user/profile/folder
    stmt = select(File).where(
        File.owner_id == current_user.id,
        File.profile_id == profile_id,
        File.folder_id == folder_id
    )

    files = db.scalars(stmt).all()

    return [
        {
            "id": str(file.id),
            "name": file.name,
            "size_bytes": file.size_bytes,
            "mime_type": file.mime_type,
            "folder_id": str(file.folder_id) if file.folder_id else None,
            "created_at": file.created_at
        }
        for file in files
    ]


# Generate presigned URL for preview
@router.get("/{file_id}/preview")
async def preview_file(
    file_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    profile_id: Optional[uuid.UUID] = None
):
    # Default to default profile if profile_id not provided
    if not profile_id:
        profile = db.scalar(
            select(Profile).where(
                Profile.owner_id == current_user.id,
                Profile.is_default == True
            )
        )
        profile_id = profile.id if profile else None

    file = db.scalar(
        select(File).where(
            File.id == file_id,
            File.owner_id == current_user.id,
            File.profile_id == profile_id
        )
    )

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        presigned_url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET_NAME, "Key": file.s3_key},
            ExpiresIn=PRESIGNED_URL_EXPIRY
        )
    except ClientError:
        raise HTTPException(status_code=500, detail="Failed to generate preview URL")

    return {"url": presigned_url}


# Generate presigned URL for download
@router.get("/{file_id}/download")
async def download_file(
    file_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    profile_id: Optional[uuid.UUID] = None
):
    # Default to default profile if profile_id not provided
    if not profile_id:
        profile = db.scalar(
            select(Profile).where(
                Profile.owner_id == current_user.id,
                Profile.is_default == True
            )
        )
        profile_id = profile.id if profile else None

    file = db.scalar(
        select(File).where(
            File.id == file_id,
            File.owner_id == current_user.id,
            File.profile_id == profile_id
        )
    )

    if not file:
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


# Mark upload as complete after client confirms upload to S3
@router.post("/{file_id}/complete")
async def complete_upload(
    file_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    file = db.scalar(
        select(File).where(File.id == file_id, File.owner_id == current_user.id)
    )

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    # Verify file exists in S3
    try:
        s3.head_object(Bucket=BUCKET_NAME, Key=file.s3_key)
    except ClientError:
        raise HTTPException(status_code=400, detail="File not uploaded to S3")

    file.status = "completed"
    file.updated_at = datetime.now(timezone.utc).isoformat()

    db.commit()

    return {"message": "Upload completed"}


# Delete file from S3 and database
@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    profile_id: Optional[uuid.UUID] = None
):
    # Default to default profile if profile_id not provided
    if not profile_id:
        profile = db.scalar(
            select(Profile).where(
                Profile.owner_id == current_user.id,
                Profile.is_default == True
            )
        )
        profile_id = profile.id if profile else None

    file = db.scalar(
        select(File).where(
            File.id == file_id,
            File.owner_id == current_user.id,
            File.profile_id == profile_id
        )
    )

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    # Delete from S3
    try:
        s3.delete_object(Bucket=BUCKET_NAME, Key=file.s3_key)
    except ClientError:
        raise HTTPException(status_code=500, detail="Failed to delete file from storage")

    db.delete(file)
    db.commit()

    return


# Add this endpoint so the editor can load file content
@router.get("/{file_id}/content")
async def get_file_content(
    file_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    # Fetch file metadata
    file = db.scalar(
        select(File).where(File.id == file_id, File.owner_id == current_user.id)
    )

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        # Load actual JSON content from S3
        response = s3.get_object(Bucket=BUCKET_NAME, Key=file.s3_key)
        content_bytes = response["Body"].read().decode("utf-8")
        content_json = json.loads(content_bytes)

        return {"content": content_json}

    except ClientError as e:
        # If file doesn't exist yet, return default structure
        if e.response["Error"]["Code"] == "NoSuchKey":
            return {"content": {"pages": [""]}}
        raise HTTPException(status_code=500, detail="Failed to fetch from S3")


# Auto-save / sync file content
@router.put("/{file_id}/content")
async def update_file_content(
    file_id: uuid.UUID,
    payload: UpdateFileContentRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    file = db.scalar(
        select(File).where(File.id == file_id, File.owner_id == current_user.id)
    )

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    content = payload.content

    # Validate content structure
    if not isinstance(content, dict):
        raise HTTPException(status_code=422, detail="Content must be an object")

    if "pages" not in content:
        raise HTTPException(status_code=422, detail="Missing 'pages' field")

    if not isinstance(content["pages"], list):
        raise HTTPException(status_code=422, detail="'pages' must be a list")

    # Normalize page data
    content["pages"] = [str(p) for p in content["pages"]]

    try:
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=file.s3_key,
            Body=json.dumps(content),
            ContentType="application/json"
        )
    except ClientError:
        raise HTTPException(status_code=500, detail="Failed to sync content to storage")

    now = datetime.now(timezone.utc).isoformat()
    file.updated_at = now
    file.size_bytes = len(json.dumps(content).encode("utf-8"))

    db.commit()

    return {"message": "Sync successful", "updated_at": now}


# Add this route to the router
@router.put("/{file_id}/title")
async def rename_file(
    file_id: uuid.UUID,
    payload: RenameFileRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    # Find the file belonging to this user
    file = db.scalar(
        select(File).where(File.id == file_id, File.owner_id == current_user.id)
    )

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    # Update the name 
    file.name = payload.name
    file.updated_at = datetime.now(timezone.utc).isoformat()

    db.commit()
    return {"message": "Name updated successfully"}