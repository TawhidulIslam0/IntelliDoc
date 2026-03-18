from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Annotated, Optional
import uuid

from app.database import get_db
from app.api.users import get_current_user
from app.models.folder import Folder
from app.models.user import User
from app.models.profile import Profile
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/folders", tags=["folders"])

# Request model to create folder
class CreateFolderRequest(BaseModel):
    name: str
    parent_id: Optional[uuid.UUID] = None
    profile_id: uuid.UUID  # required profile for folder

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
    profile_id: Optional[uuid.UUID] = None
):
    # If no profile_id provided, default to "Personal"
    if not profile_id:
        stmt_profile = select(Profile).where(
            Profile.owner_id == current_user.id,
            Profile.name == "Personal"
        )
        profile = db.scalar(stmt_profile)
        if not profile:
            raise HTTPException(status_code=404, detail="Personal profile not found")
        profile_id = profile.id

    # Fetch folders for user & profile
    stmt = select(Folder).where(
        Folder.owner_id == current_user.id,
        Folder.profile_id == profile_id
    )
    folders = db.scalars(stmt).all()
    return folders

@router.delete("/{folder_id}")
def delete_folder(
    folder_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    profile_id: Optional[uuid.UUID] = None
):
    # Default to "Personal" profile if none provided
    if not profile_id:
        stmt_profile = select(Profile).where(
            Profile.owner_id == current_user.id,
            Profile.name == "Personal"
        )
        profile = db.scalar(stmt_profile)
        profile_id = profile.id if profile else None

    # Fetch folder safely
    stmt = select(Folder).where(
        Folder.id == folder_id,
        Folder.owner_id == current_user.id,
        Folder.profile_id == profile_id
    )
    folder = db.scalar(stmt)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    db.delete(folder)
    db.commit()

    return {"message": "Folder deleted"}