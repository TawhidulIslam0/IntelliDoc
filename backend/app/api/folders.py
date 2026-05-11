import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Annotated, Optional
from pydantic import BaseModel, ConfigDict

from app.database import get_db
from app.api.users import get_current_user
from app.models.folder import Folder
from app.models.file import File
from app.models.user import User
from app.models.profile import Profile

router = APIRouter(prefix="/folders", tags=["folders"])

# Request model to create folder
class CreateFolderRequest(BaseModel):
    name: str
    parent_id: Optional[uuid.UUID] = None
    profile_id: uuid.UUID  # required profile for folder

# Request model to rename folder
class RenameFolderRequest(BaseModel):
    name: str

# Response model for folders
class FolderResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    profile_id: uuid.UUID  # include profile in response
    name: str
    model_config = ConfigDict(from_attributes=True)

@router.post("/", response_model=FolderResponse)
def create_folder(
    payload: CreateFolderRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    # Ensure the profile belongs to the current user
    profile = db.scalar(
        select(Profile).where(Profile.id == payload.profile_id, Profile.owner_id == current_user.id)
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found or not owned by user")

    # Ensure parent folder belongs to the user and same profile
    if payload.parent_id:
        stmt = select(Folder).where(
            Folder.id == payload.parent_id,
            Folder.owner_id == current_user.id,
            Folder.profile_id == payload.profile_id
        )
        parent_folder = db.scalar(stmt)
        if not parent_folder:
            raise HTTPException(status_code=404, detail="Parent folder not found")

    # Create new folder
    folder = Folder(
        owner_id=current_user.id,
        profile_id=payload.profile_id,
        parent_id=payload.parent_id,
        name=payload.name
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)

    return folder

@router.get("/", response_model=list[FolderResponse])
def get_folders(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    profile_id: Optional[uuid.UUID] = None,
    parent_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None 
):
    # If no profile_id provided, default to default profile
    if not profile_id:
        profile = db.scalar(
            select(Profile).where(Profile.owner_id == current_user.id, Profile.is_default == True)
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Default profile not found")
        profile_id = profile.id

    # Base query: must belong to the user, the selected profile, and not be trashed
    stmt = select(Folder).where(
        Folder.owner_id == current_user.id,
        Folder.profile_id == profile_id,
        Folder.is_deleted == False
    )

    # Search Logic
    if search:
        search_query = search.lower().strip()
        
        # Handle "type:" filters
        if search_query == "type:folder":
            # Show all folders in the profile if specifically filtered by 'folder'
            pass 
        elif search_query.startswith("type:"):
            # If searching for a specific file type (pdf, txt, idoc), 
           
            return []  # return no folders so only files show up in results.
        else:
            # Find folders by name anywhere in this profile (Global Search)
            stmt = stmt.where(Folder.name.ilike(f"%{search_query}%"))
    else:
        # Folder Navigation: Only show folders inside the current parent
        stmt = stmt.where(Folder.parent_id == parent_id)

    folders = db.scalars(stmt).all()
    return folders

# Rename a folder
@router.patch("/{folder_id}/rename", response_model=FolderResponse)
def rename_folder(
    folder_id: uuid.UUID,
    payload: RenameFolderRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    stmt = select(Folder).where(Folder.id == folder_id, Folder.owner_id == current_user.id)
    folder = db.scalar(stmt)
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder.name = payload.name
    # Explicitly commit the change
    db.commit()
    db.refresh(folder)
    return folder

# Move folder to trash.
# Also trashes all nested subfolders and files recursively.
@router.delete("/{folder_id}")
def delete_folder(
    folder_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    profile_id: Optional[uuid.UUID] = None
):
    # Default to default profile if none provided
    if not profile_id:
        profile = db.scalar(
            select(Profile).where(Profile.owner_id == current_user.id, Profile.is_default == True)
        )
        profile_id = profile.id if profile else None

    # Fetch folder safely — only allow trashing folders that are not already trashed
    folder = db.scalar(
        select(Folder).where(
            Folder.id == folder_id,
            Folder.owner_id == current_user.id,
            Folder.profile_id == profile_id,
            Folder.is_deleted == False
        )
    )
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    now = datetime.now(timezone.utc)
    deleted_at_str = now.isoformat()
    trash_suffix = f"_trash_{int(now.timestamp())}"

    # Trash the top-level folder itself
    folder.is_deleted = True
    folder.deleted_at = deleted_at_str
    folder.name = folder.name + trash_suffix

    # BFS traversal to find and trash all nested subfolders and their files.
    queue = [folder_id]
    while queue:
        current_ids = queue
        queue = []

        # Trashes all files directly inside the current batch of folders
        child_files = db.scalars(
            select(File).where(
                File.folder_id.in_(current_ids),
                File.owner_id == current_user.id,
                File.is_deleted == False
            )
        ).all()

        for child_file in child_files:
            child_file.is_deleted = True
            child_file.deleted_at = deleted_at_str
            child_file.name = child_file.name + trash_suffix

        # Find the next level of subfolders to process
        child_folders = db.scalars(
            select(Folder).where(
                Folder.parent_id.in_(current_ids),
                Folder.owner_id == current_user.id,
                Folder.is_deleted == False
            )
        ).all()
        
        for child_folder in child_folders:
            child_folder.is_deleted = True
            child_folder.deleted_at = deleted_at_str
            child_folder.name = child_folder.name + trash_suffix
            queue.append(child_folder.id)

    db.commit()
    return {"message": "Folder moved to trash"}