import uuid
import boto3
import os
import json

from sqlalchemy import select
from botocore.exceptions import ClientError
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
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
from app.models.folder import Folder
from app.models.tab import Tab 
from app.services.indexer import Indexer

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
    presigned_url: Optional[str] = None
    upload_id: Optional[str] = None


class PresignChunkRequest(BaseModel):
    file_id: uuid.UUID
    part_number: int
    upload_id: str


class CompleteChunkedUploadRequest(BaseModel):
    file_id: uuid.UUID
    upload_id: str
    parts: list[dict] 


class CreateBlankDocRequest(BaseModel):
    name: str = "Untitled Document.idoc"
    folder_id: Optional[uuid.UUID] = None
    profile_id: uuid.UUID


class UpdateFileContentRequest(BaseModel):
    content: dict


class UpdateTabRequest(BaseModel):
    content: dict
    
class RenameFileRequest(BaseModel):
    name: str

class MoveFileRequest(BaseModel):
    profile_id: uuid.UUID
    folder_id: Optional[uuid.UUID] = None

# Background task to run the indexer after upload completion.
# Reuses a singleton Indexer so the embedding model is loaded only once per container.
_indexer: Indexer | None = None

def get_indexer() -> Indexer:
    global _indexer
    if _indexer is None:
        _indexer = Indexer()
    return _indexer

def _run_indexer(file_id: uuid.UUID) -> None:
    from app.database import SessionLocal

    with SessionLocal() as db:
        indexer = get_indexer()
        indexer.index_file(db, file_id)
        
# Create presigned URL for file upload
@router.post("/initiate-upload", response_model=InitiateUploadResponse, status_code=status.HTTP_201_CREATED)
async def initiate_upload(
    payload: InitiateUploadRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    #  Allow max size to be 100MB(102,400kb)
    MAX_ALLOWED_SIZE = 100 * 1024 * 1024  
    if payload.size_bytes > MAX_ALLOWED_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File is too large. Maximum allowed size is 100MB."
        )

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
        if existing_file.status in ["pending", "uploading"]:
            #  resume logic for both small and multipart
            presigned_url = None

            # regenerate URL for small uploads (where no multipart ID exists)
            if not existing_file.upload_id:
                presigned_url = s3.generate_presigned_url(
                    "put_object",
                    Params={
                        "Bucket": BUCKET_NAME,
                        "Key": existing_file.s3_key,
                        "ContentType": existing_file.mime_type
                    },
                    ExpiresIn=PRESIGNED_URL_EXPIRY
                )

            return InitiateUploadResponse(
                file_id=existing_file.id,
                upload_id=existing_file.upload_id,
                presigned_url=presigned_url
            )
        elif existing_file.status == "cancelled":
            # safe to delete cancelled uploads
            db.delete(existing_file)
            db.commit()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A file with the same name already exists in this folder and profile."
            )

    # Generate unique file ID and S3 key
    file_id = uuid.uuid4()
    s3_key = f"uploads/{current_user.id}/{file_id}/{payload.name}"

    # Save file metadata in database FIRST to ensure record exists before S3 operations
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

    upload_id = None
    presigned_url = None

    # Logic for Chunked vs Simple Upload
    try:
        # Use Multipart Upload for anything larger than 6MB
        if payload.size_bytes > 6 * 1024 * 1024:
            response = s3.create_multipart_upload(
                Bucket=BUCKET_NAME,
                Key=s3_key,
                ContentType=payload.mime_type
            )
            upload_id = response["UploadId"]
            new_file.upload_id = upload_id
            db.commit()
            db.refresh(new_file)
        else:
            # Generate standard presigned URL for upload
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
        # Cleanup record if S3 session fails
        db.delete(new_file)
        db.commit()
        raise HTTPException(status_code=500, detail="Failed to generate S3 upload session")

    # Return details to client
    return InitiateUploadResponse(
        file_id=new_file.id, 
        presigned_url=presigned_url, 
        upload_id=upload_id
    )

# Generate a presigned URL for a specific part (chunk) of a multipart upload
@router.post("/presign-chunk")
async def presign_chunk(
    payload: PresignChunkRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)]
):
    file = db.get(File, payload.file_id)
    if not file or file.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="File not found")
    
    # cancelled uploads
    if file.status == "cancelled":
        raise HTTPException(status_code=400, detail="Upload has been cancelled")

    #  mark as uploading
    file.status = "uploading"
    file.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()

    try:
        url = s3.generate_presigned_url(
            ClientMethod="upload_part",
            Params={
                "Bucket": BUCKET_NAME,
                "Key": file.s3_key,
                "UploadId": payload.upload_id,
                "PartNumber": payload.part_number,
            },
            ExpiresIn=PRESIGNED_URL_EXPIRY,
        )
        return {"presigned_url": url}
    except ClientError:
        raise HTTPException(status_code=500, detail="Failed to generate chunk URL")
    
# GET upload status for resuming
@router.get("/{file_id}/upload-status")
async def get_upload_status(
    file_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    file = db.scalar(
        select(File).where(File.id == file_id, File.owner_id == current_user.id)
    )

    if not file or not file.upload_id:
        raise HTTPException(status_code=404, detail="Upload session not found")

    if file.status == "cancelled":
        raise HTTPException(status_code=400, detail="Upload has been cancelled")

    try:
        response = s3.list_parts(
            Bucket=BUCKET_NAME,
            Key=file.s3_key,
            UploadId=file.upload_id,
        )

        uploaded_parts = [
            {
                "PartNumber": part["PartNumber"],
                "ETag": part["ETag"]
            }
            for part in response.get("Parts", [])
        ]

        return {
            "upload_id": file.upload_id,
            "uploaded_parts": uploaded_parts
        }

    except ClientError:
        raise HTTPException(status_code=500, detail="Failed to fetch upload status")

# Finalize the multipart upload by assembling all uploaded chunks in S3
@router.post("/complete-chunked-upload")
async def complete_chunked_upload(
    payload: CompleteChunkedUploadRequest,
    background_tasks: BackgroundTasks,   
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    file = db.get(File, payload.file_id)
    if not file or file.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="File not found")
    
     # cancelled uploads
    if file.status == "cancelled":
        raise HTTPException(status_code=400, detail="Upload has been cancelled")

    try:
        s3.complete_multipart_upload(
            Bucket=BUCKET_NAME,
            Key=file.s3_key,
            UploadId=payload.upload_id,
            MultipartUpload={"Parts": payload.parts}
        )
    except ClientError:
        raise HTTPException(status_code=500, detail="Failed to complete multipart upload")

    file.status = "completed"
    file.updated_at = datetime.now(timezone.utc).isoformat()

    db.commit()
    background_tasks.add_task(_run_indexer, file.id)

    return {"message": "Upload completed successfully and indexing started"}

# Creating blank document 
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

    # Proceed with S3 and DB insertion using final_name
    file_id = uuid.uuid4()
    # Separating internal dashboard documents into 'documents/' folder
    s3_key = f"documents/{current_user.id}/{file_id}/{final_name}"

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

    #  Automatically create "Tab 1" (default)for internal document files
    first_tab = Tab(
        id=uuid.uuid4(),
        file_id=file_id,
        name="Tab 1",
        content="",
        created_at=now,
        updated_at=now
    )
    db.add(first_tab)

    db.commit()
    db.refresh(new_file)

    return {
        "file_id": str(new_file.id),
        "name": new_file.name,
        "message": "Blank document created successfully"
    }


# List files for current user, optionally filtered by folder OR searched by name/type
@router.get("/")
async def list_files(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    profile_id: Optional[uuid.UUID] = None,
    folder_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None
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

    # Handle folder specific search first
    if search and search.lower().strip() == "type:folder":
        folders = db.scalars(
            select(Folder).where(
                Folder.owner_id == current_user.id,
                Folder.profile_id == profile_id
            )
        ).all()
        return [
            {
                "id": str(f.id),
                "name": f.name,
                "type": "folder",
                # Safe access to attributes that might be missing in Folder model
                "created_at": getattr(f, "created_at", None),
                "updated_at": getattr(f, "updated_at", None)
            }
            for f in folders
        ]

    # Base query: must belong to the user, the selected profile, AND be completed
    stmt = select(File).where(
        File.owner_id == current_user.id,
        File.profile_id == profile_id,
        File.status.in_(["completed", "indexing", "indexed"])
    )
    
    # Search logic
    if search:
        search_query = search.lower().strip()
        
        # Handle type filters for specific extensions
        if search_query.startswith("type:"):
            file_type = search_query.replace("type:", "")
            if file_type == "document":
                # Matches your custom .idoc files
                stmt = stmt.where(File.name.ilike("%.idoc"))
            elif file_type == "pdf":
                stmt = stmt.where(File.name.ilike("%.pdf"))
            elif file_type == "txt":
                stmt = stmt.where(File.name.ilike("%.txt"))
            elif file_type == "docx":
                stmt = stmt.where(File.name.ilike("%.docx"))
        else:
            # Global Name Search: Find matches anywhere in the profile
            stmt = stmt.where(File.name.ilike(f"%{search_query}%"))
    else:
        # Folder Navigation: Only show files in the specific folder
        stmt = stmt.where(File.folder_id == folder_id)

    # Order by most recently updated 
    stmt = stmt.order_by(File.updated_at.desc())

    files = db.scalars(stmt).all()

    return [
        {
            "id": str(file.id),
            "name": file.name,
            "size_bytes": file.size_bytes,
            "mime_type": file.mime_type,
            "folder_id": str(file.folder_id) if file.folder_id else None,
            "created_at": file.created_at,
            "updated_at": file.updated_at,
            "status": file.status,
            "type": "file"
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
        # Prepare S3 parameters with inline disposition for preview
        params = {
            "Bucket": BUCKET_NAME, 
            "Key": file.s3_key,
            "ResponseContentDisposition": "inline"
        }
        
        presigned_url = s3.generate_presigned_url(
            "get_object",
            Params=params,
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


# Mark upload as complete after client confirms upload to S3 (For single uploads)
@router.post("/{file_id}/complete")
async def complete_upload(
    file_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    file = db.scalar(
        select(File).where(File.id == file_id, File.owner_id == current_user.id)
    )

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        s3.head_object(Bucket=BUCKET_NAME, Key=file.s3_key)
    except ClientError:
        raise HTTPException(status_code=400, detail="File not uploaded to S3")

    file.status = "completed"
    file.updated_at = datetime.now(timezone.utc).isoformat()

    db.commit()
    background_tasks.add_task(_run_indexer, file.id)

    return {"message": "Upload completed and indexing started"}


# Delete file from S3 and database
@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    profile_id: Optional[uuid.UUID] = None
):
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
        s3.delete_object(Bucket=BUCKET_NAME, Key=file.s3_key)
    except ClientError:
        raise HTTPException(status_code=500, detail="Failed to delete file from storage")

    db.delete(file)
    db.commit()
    return


# Editor can load file content
@router.get("/{file_id}/content")
async def get_file_content(
    file_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    file = db.scalar(
        select(File).where(File.id == file_id, File.owner_id == current_user.id)
    )

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    # Fetch tabs associated with this document
    tabs = db.scalars(select(Tab).where(Tab.file_id == file_id).order_by(Tab.created_at.asc())).all()

    try:
        # Check if file exists in S3 before trying to read it
        response = s3.get_object(Bucket=BUCKET_NAME, Key=file.s3_key)
        content_bytes = response["Body"].read().decode("utf-8")
        content_json = json.loads(content_bytes)
        return {
            "content": content_json,
            "tabs": [{"id": str(t.id), "name": t.name, "content": t.content} for t in tabs]
        }
    except ClientError as e:
        if e.response["Error"]["Code"] == "NoSuchKey":
            return {
                "content": {"pages": [""]},
                "tabs": [{"id": str(t.id), "name": t.name, "content": t.content} for t in tabs]
            }
        raise HTTPException(status_code=500, detail="Failed to fetch from S3")

# Fetch tabs specifically
@router.get("/{file_id}/tabs")
async def get_tabs(
    file_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    # Verify file ownership
    file = db.scalar(
        select(File).where(File.id == file_id, File.owner_id == current_user.id)
    )

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    # Fetch all tabs for this specific file
    tabs = db.scalars(
        select(Tab).where(Tab.file_id == file_id).order_by(Tab.created_at.asc())
    ).all()

    return [
        {
            "id": str(t.id),
            "name": t.name,
            "content": t.content,
            "created_at": t.created_at,
            "updated_at": t.updated_at
        }
        for t in tabs
    ]


# Auto-save / sync file content
@router.put("/{file_id}/content")
async def update_file_content(
    file_id: uuid.UUID,
    payload: UpdateFileContentRequest,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    file = db.scalar(
        select(File).where(File.id == file_id, File.owner_id == current_user.id)
    )

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    content = payload.content
    if not isinstance(content, dict) or "pages" not in content:
        raise HTTPException(status_code=422, detail="Invalid content structure")

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
    text_content = json.dumps(content) # Store as JSON string to maintain structure
    
    tab = db.scalar(
        select(Tab).where(Tab.file_id == file_id).order_by(Tab.created_at.asc()).limit(1)
    )
    
    if tab:
        tab.content = text_content
        tab.updated_at = now

    file.updated_at = now
    file.size_bytes = len(json.dumps(content).encode("utf-8"))
    file.status = "completed"

    db.commit()
    background_tasks.add_task(_run_indexer, file.id)

    return {"message": "Sync successful", "updated_at": now}

# Tab Updates
@router.patch("/tabs/{tab_id}")
async def update_tab_content(
    tab_id: uuid.UUID,
    payload: UpdateTabRequest,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    # Find the tab and verify the owner via the linked file
    tab = db.scalar(
        select(Tab)
        .join(File, Tab.file_id == File.id)
        .where(Tab.id == tab_id, File.owner_id == current_user.id)
    )

    if not tab:
        raise HTTPException(status_code=404, detail="Tab not found")

    # Sync content to the database
    now = datetime.now(timezone.utc).isoformat()
    tab.content = json.dumps(payload.content)
    tab.updated_at = now

    # Also sync to S3 so the master file is always current
    file = db.get(File, tab.file_id)
    if file:
        try:
            s3.put_object(
                Bucket=BUCKET_NAME,
                Key=file.s3_key,
                Body=json.dumps(payload.content),
                ContentType="application/json"
            )
            file.updated_at = now
            file.size_bytes = len(json.dumps(payload.content).encode("utf-8"))
            file.status = "completed"
        except ClientError:
            pass # DB update remains even if S3 is momentarily unreachable

    db.commit()

    if file:
        background_tasks.add_task(_run_indexer, file.id)
    
    return {"message": "Tab updated successfully"}

# move file to different folder
@router.patch("/{file_id}/move")
async def move_file(
    file_id: uuid.UUID,
    payload: MoveFileRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    file = db.scalar(
        select(File).where(
            File.id == file_id,
            File.owner_id == current_user.id,
            File.profile_id == payload.profile_id
        )
    )

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    # Verify target folder belongs to the same user or profile
    if payload.folder_id is not None:
        folder = db.scalar(
            select(Folder).where(
                Folder.id == payload.folder_id,
                Folder.owner_id == current_user.id,
                Folder.profile_id == payload.profile_id
            )
        )

        if not folder:
            raise HTTPException(status_code=404, detail="Target folder not found")

    # No op if already in target folder
    if file.folder_id == payload.folder_id:
        return {
            "message": "File already in target folder",
            "file_id": str(file.id),
            "folder_id": str(file.folder_id) if file.folder_id else None
        }

    file.folder_id = payload.folder_id
    file.updated_at = datetime.now(timezone.utc).isoformat()

    try:
        db.commit()
        db.refresh(file)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A file with the same name already exists in the destination folder"
        )

    return {
        "message": "File moved successfully",
        "file_id": str(file.id),
        "folder_id": str(file.folder_id) if file.folder_id else None,
        "updated_at": file.updated_at
    }

# Rename file
@router.patch("/{file_id}/rename")
async def rename_file(
    file_id: uuid.UUID,
    payload: RenameFileRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    file = db.scalar(
        select(File).where(File.id == file_id, File.owner_id == current_user.id)
    )

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    file.name = payload.name
    file.updated_at = datetime.now(timezone.utc).isoformat()

    db.commit()
    
    # Return everything the frontend needs to sync the UI 
    return {
        "message": "Name updated successfully", 
        "name": file.name,
        "updated_at": file.updated_at
    }

# Mark upload as cancelled and clean up S3
@router.patch("/{file_id}/cancel")
async def cancel_upload(
    file_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    # Verify the file exists and belongs to the user
    file = db.scalar(
        select(File).where(File.id == file_id, File.owner_id == current_user.id)
    )

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    #  Clean up S3 if it was a multipart upload
    if file.upload_id:
        try:
            s3.abort_multipart_upload(
                Bucket=BUCKET_NAME,
                Key=file.s3_key,
                UploadId=file.upload_id
            )
        except ClientError:
            pass

    else:
        #  Handle cleanup for non-multipart (small) uploads
        try:
            s3.delete_object(
                Bucket=BUCKET_NAME,
                Key=file.s3_key
            )
        except ClientError:
            pass

    # mark as cancelled instead of deleting
    file.status = "cancelled"
    file.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()

    return {"message": "Upload cancelled"}

# Resume file during uploading process
@router.get("/{file_id}/resume-upload")
async def resume_upload(
    file_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    file = db.scalar(
        select(File).where(
            File.id == file_id,
            File.owner_id == current_user.id
        )
    )

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    # If upload already completed
    if file.status == "completed":
        return {
            "status": "completed",
            "message": "File already uploaded"
        }

    # If no multipart session exists treat as single upload retry
    if not file.upload_id:
        presigned_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": BUCKET_NAME,
                "Key": file.s3_key,
                "ContentType": file.mime_type
            },
            ExpiresIn=PRESIGNED_URL_EXPIRY
        )

        return {
            "status": "pending",
            "type": "single",
            "file_id": str(file.id),
            "presigned_url": presigned_url
        }

    # Multipart resume path
    try:
        response = s3.list_parts(
            Bucket=BUCKET_NAME,
            Key=file.s3_key,
            UploadId=file.upload_id
        )

        uploaded_parts = [
            {
                "PartNumber": p["PartNumber"],
                "ETag": p["ETag"]
            }
            for p in response.get("Parts", [])
        ]

        return {
            "status": file.status,
            "type": "multipart",
            "file_id": str(file.id),
            "upload_id": file.upload_id,
            "uploaded_parts": uploaded_parts
        }

    except ClientError as e:
        # If multipart session expired in S3 recreate it safely
        if e.response["Error"]["Code"] == "NoSuchUpload":

            response = s3.create_multipart_upload(
                Bucket=BUCKET_NAME,
                Key=file.s3_key,
                ContentType=file.mime_type
            )

            file.upload_id = response["UploadId"]
            file.status = "uploading"
            db.commit()

            return {
                "status": "recreated",
                "type": "multipart",
                "file_id": str(file.id),
                "upload_id": file.upload_id,
                "uploaded_parts": []
            }
        raise HTTPException(status_code=500, detail="Failed to resume upload")