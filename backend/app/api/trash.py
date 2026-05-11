import uuid
import boto3
import logging
import os

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Annotated, Optional
from pydantic import BaseModel
from botocore.exceptions import ClientError
from botocore.config import Config
from dotenv import load_dotenv

from app.database import get_db
from app.api.users import get_current_user
from app.models.file import File
from app.models.folder import Folder
from app.models.chunk import Chunk
from app.models.profile import Profile
from app.models.user import User

# Load environment variables from .env
load_dotenv()

logger = logging.getLogger(__name__)

s3 = boto3.client(
    "s3",
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    config=Config(signature_version="s3v4")
)

BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")

router = APIRouter(prefix="/trash", tags=["trash"])



# Response models
class TrashedFileItem(BaseModel):
    id: uuid.UUID
    name: str
    type: str  # always "file"
    mime_type: str
    size_bytes: int
    deleted_at: Optional[str]
    folder_id: Optional[uuid.UUID]
    profile_id: uuid.UUID


class TrashedFolderItem(BaseModel):
    id: uuid.UUID
    name: str
    type: str  # always "folder"
    deleted_at: Optional[str]
    parent_id: Optional[uuid.UUID]
    profile_id: uuid.UUID


# Helper to strip trash suffix. 
def _strip_trash_suffix(name: str) -> str:
    marker = "_trash_"
    idx = name.rfind(marker) # Check from right
    if idx == -1:
        # If no suffix
        return name
    # Everything after the marker should be digits (the Unix timestamp)
    suffix_part = name[idx + len(marker):]
    if suffix_part.isdigit():
        return name[:idx]
    # Otherwise
    return name


# Helper to resolve the profile_id for the current user
def _resolve_profile(db: Session, current_user: User, profile_id: Optional[uuid.UUID]) -> uuid.UUID:
    if profile_id:
        profile = db.scalar(
            select(Profile).where(
                Profile.id == profile_id,
                Profile.owner_id == current_user.id
            )
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found or not owned by user")
        return profile.id

    profile = db.scalar(
        select(Profile).where(
            Profile.owner_id == current_user.id,
            Profile.is_default == True
        )
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Default profile not found")
    return profile.id


# GET /api/trash List all trashed files and folders
@router.get("/")
def list_trash(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    profile_id: Optional[uuid.UUID] = None
):
    resolved_profile_id = _resolve_profile(db, current_user, profile_id)

    trashed_files = db.scalars(
        select(File).where(
            File.owner_id == current_user.id,
            File.profile_id == resolved_profile_id,
            File.is_deleted == True
        ).order_by(File.deleted_at.desc())
    ).all()

    trashed_folders = db.scalars(
        select(Folder).where(
            Folder.owner_id == current_user.id,
            Folder.profile_id == resolved_profile_id,
            Folder.is_deleted == True
        ).order_by(Folder.deleted_at.desc())
    ).all()

   # Items in the list are distinguished by the type str. 
    items = []

    for f in trashed_files:
        items.append({
            "id": str(f.id),
            "name": f.name,
            "type": "file",
            "mime_type": f.mime_type,
            "size_bytes": f.size_bytes,
            "deleted_at": f.deleted_at,
            "folder_id": str(f.folder_id) if f.folder_id else None,
            "profile_id": str(f.profile_id),
        })

    for folder in trashed_folders:
        items.append({
            "id": str(folder.id),
            "name": folder.name,
            "type": "folder",
            "deleted_at": folder.deleted_at,
            "parent_id": str(folder.parent_id) if folder.parent_id else None,
            "profile_id": str(folder.profile_id),
        })

    # Sort by descending order
    items.sort(key=lambda x: x["deleted_at"] or "", reverse=True)

    return items


# POST /api/files/{id}/restore Restore a trashed file
@router.post("/files/{file_id}/restore")
def restore_file(
    file_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    file = db.scalar(
        select(File).where(
            File.id == file_id,
            File.owner_id == current_user.id,
            File.is_deleted == True
        )
    )

    if not file:
        raise HTTPException(status_code=404, detail="Trashed file not found")

    # Restore file to root if no parent folder exists
    if file.folder_id is not None:
        parent_folder = db.scalar(
            select(Folder).where(Folder.id == file.folder_id)
        )
        if parent_folder is None or parent_folder.is_deleted:
            # restore to profile root
            file.folder_id = None

    # Strip suffix to recover the original name
    restored_name = _strip_trash_suffix(file.name)

    # Name collision checlk
    # Check if exists in the target folder/root
    collision = db.scalar(
        select(File).where(
            File.owner_id == current_user.id,
            File.profile_id == file.profile_id,
            File.folder_id == file.folder_id,
            File.name == restored_name,
            File.is_deleted == False
        )
    )
    if collision:
        # Insert " (restored)" before the extension.
        if "." in restored_name:
            base, ext = restored_name.rsplit(".", 1)
            restored_name = f"{base} (restored).{ext}"
        else:
            restored_name = restored_name + " (restored)"

    file.name = restored_name
    file.is_deleted = False
    file.deleted_at = None
    db.commit()

    return {
        "message": "File restored",
        "file_id": str(file.id),
        "name": file.name,
        "folder_id": str(file.folder_id) if file.folder_id else None,
    }


# POST /api/folders/{id}/restore Restore a trashed folder
@router.post("/folders/{folder_id}/restore")
def restore_folder(
    folder_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    folder = db.scalar(
        select(Folder).where(
            Folder.id == folder_id,
            Folder.owner_id == current_user.id,
            Folder.is_deleted == True
        )
    )

    if not folder:
        raise HTTPException(status_code=404, detail="Trashed folder not found")

    # Same root restoration if no parent folder
    if folder.parent_id is not None:
        parent_folder = db.scalar(
            select(Folder).where(Folder.id == folder.parent_id)
        )
        if parent_folder is None or parent_folder.is_deleted:
            folder.parent_id = None

    # Strip the suffix
    restored_name = _strip_trash_suffix(folder.name)

    # Name collision check
    collision = db.scalar(
        select(Folder).where(
            Folder.owner_id == current_user.id,
            Folder.profile_id == folder.profile_id,
            Folder.parent_id == folder.parent_id,
            Folder.name == restored_name,
            Folder.is_deleted == False
        )
    )
    if collision:
        restored_name = restored_name + " (restored)"

    # Store original deletion timestamp to identify items trashed together
    original_deleted_at = folder.deleted_at

    folder.name = restored_name
    folder.is_deleted = False
    folder.deleted_at = None

    # Recursive Restoration: Restore all nested items that were trashed with this folder.
    # Use the 'original_deleted_at' to track children
    queue = [folder.id]
    while queue:
        current_parent_ids = queue
        queue = []

        # 1. Restore nested files in these folders
        nested_files = db.scalars(
            select(File).where(
                File.folder_id.in_(current_parent_ids),
                File.deleted_at == original_deleted_at,
                File.is_deleted == True
            )
        ).all()

        for f in nested_files:
            f.is_deleted = False
            f.deleted_at = None
            f.name = _strip_trash_suffix(f.name)

        # 2. Restore nested subfolders
        nested_folders = db.scalars(
            select(Folder).where(
                Folder.parent_id.in_(current_parent_ids),
                Folder.deleted_at == original_deleted_at,
                Folder.is_deleted == True
            )
        ).all()

        for sub in nested_folders:
            sub.is_deleted = False
            sub.deleted_at = None
            sub.name = _strip_trash_suffix(sub.name)
            queue.append(sub.id)

    db.commit()

    return {
        "message": "Folder restored",
        "folder_id": str(folder.id),
        "name": folder.name,
        "parent_id": str(folder.parent_id) if folder.parent_id else None,
    }


# DELETE /api/files/{id}/permanent Permanently delete a trashed file
@router.delete("/files/{file_id}/permanent")
def permanently_delete_file(
    file_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    # Only allow purging files that are already in the trash
    file = db.scalar(
        select(File).where(
            File.id == file_id,
            File.owner_id == current_user.id,
            File.is_deleted == True
        )
    )

    if not file:
        raise HTTPException(status_code=404, detail="Trashed file not found")

    s3_key = file.s3_key

    # 1: Delete the physical file from S3.
    try:
        s3.delete_object(Bucket=BUCKET_NAME, Key=s3_key)
    except Exception as e:
        logger.error(f"Failed to delete S3 object {s3_key} during permanent delete: {e}")

    # 2: Delete associated Chunk rows.
    chunks = db.scalars(select(Chunk).where(Chunk.file_id == file.id)).all()
    for chunk in chunks:
        db.delete(chunk)

    # 3: Delete the DB record.
    db.delete(file)
    db.commit()

    return {"message": "File permanently deleted"}

# DELETE /api/folders/{id}/permanent Permanently delete a trashed folder
@router.delete("/folders/{folder_id}/permanent")
def permanently_delete_folder(
    folder_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    # Only allow purging folders that are already in the trash
    folder = db.scalar(
        select(Folder).where(
            Folder.id == folder_id,
            Folder.owner_id == current_user.id,
            Folder.is_deleted == True
        )
    )

    if not folder:
        raise HTTPException(status_code=404, detail="Trashed folder not found")

    # BFS traversal to collect ALL files nested within this folder.
    all_file_s3_keys: list[str] = []
    all_file_ids: list[uuid.UUID] = []

    queue = [folder_id]
    while queue:
        current_folder_ids = queue
        queue = []

        # Collect files at this level
        nested_files = db.scalars(
            select(File).where(
                File.folder_id.in_(current_folder_ids),
                File.owner_id == current_user.id
            )
        ).all()

        for nested_file in nested_files:
            if nested_file.s3_key:
                all_file_s3_keys.append(nested_file.s3_key)
            all_file_ids.append(nested_file.id)

        # Find next level of subfolders
        child_folders = db.scalars(
            select(Folder).where(
                Folder.parent_id.in_(current_folder_ids),
                Folder.owner_id == current_user.id
            )
        ).all()

        for child_folder in child_folders:
            queue.append(child_folder.id)

    # 1: Delete every S3 object found.
    for s3_key in all_file_s3_keys:
        try:
            s3.delete_object(Bucket=BUCKET_NAME, Key=s3_key)
        except Exception as e:
            logger.error(f"Failed to delete S3 object {s3_key} during folder permanent delete: {e}")

    # 2: Delete Chunk rows.
    if all_file_ids:
        chunks = db.scalars(select(Chunk).where(Chunk.file_id.in_(all_file_ids))).all()
        for chunk in chunks:
            db.delete(chunk)

    # 3: Delete the top-level folder.
    db.delete(folder)
    db.commit()

    return {"message": "Folder permanently deleted"}


# DELETE /api/trash Empty the entire trash for a profile
@router.delete("/")
def empty_trash(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    profile_id: Optional[uuid.UUID] = None
):
    resolved_profile_id = _resolve_profile(db, current_user, profile_id)

    # Collect all trashed files in this profile so we can clean up S3
    trashed_files = db.scalars(
        select(File).where(
            File.owner_id == current_user.id,
            File.profile_id == resolved_profile_id,
            File.is_deleted == True
        )
    ).all()

    # Delete each file's S3 object.
    for trashed_file in trashed_files:
        if trashed_file.s3_key:
            try:
                s3.delete_object(Bucket=BUCKET_NAME, Key=trashed_file.s3_key)
            except Exception as e:
                logger.error(
                    f"Failed to delete S3 object {trashed_file.s3_key} during empty_trash: {e}"
                )

    # Delete Chunk rows.
    trashed_file_ids = [f.id for f in trashed_files]
    if trashed_file_ids:
        all_chunks = db.scalars(
            select(Chunk).where(Chunk.file_id.in_(trashed_file_ids))
        ).all()

        for chunk in all_chunks:
            db.delete(chunk)

    # Delete all trashed file DB records.
    for trashed_file in trashed_files:
        db.delete(trashed_file)

    trashed_folders = db.scalars(
        select(Folder).where(
            Folder.owner_id == current_user.id,
            Folder.profile_id == resolved_profile_id,
            Folder.is_deleted == True
        )
    ).all()

    for trashed_folder in trashed_folders:
        db.delete(db.merge(trashed_folder))

    db.commit()

    return {"message": "Trash emptied"}
