from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Annotated, Optional
import uuid

from app.database import get_db
from app.api.users import get_current_user
from app.models.folder import Folder
from app.models.user import User
from pydantic import BaseModel, ConfigDict


router = APIRouter(prefix="/folders", tags=["folders"])


class CreateFolderRequest(BaseModel):
    name: str
    parent_id: Optional[uuid.UUID] = None
    profile_id: uuid.UUID  # required profile for folder


class FolderResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    profile_id: uuid.UUID  # include profile in response
    name: str
    model_config = ConfigDict(from_attributes=True)


# Create folder
@router.post("/", response_model=FolderResponse)
def create_folder(
    payload: CreateFolderRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):

    # Ensure parent folder belongs to the user
    if payload.parent_id:
        stmt = select(Folder).where(
            Folder.id == payload.parent_id,
            Folder.owner_id == current_user.id,
            Folder.profile_id == payload.profile_id  # validate parent folder in the same profile
        )

        parent_folder = db.scalar(stmt)

        if not parent_folder:
            raise HTTPException(status_code=404, detail="Parent folder not found")

    folder = Folder(
        owner_id=current_user.id,
        profile_id=payload.profile_id,  # store profile ID
        parent_id=payload.parent_id,
        name=payload.name
    )

    db.add(folder)
    db.commit()
    db.refresh(folder)

    return folder


# Get all folders for current user
@router.get("/", response_model=list[FolderResponse])
def get_folders(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    profile_id: uuid.UUID  # must provide profile to list folders
):
    stmt = select(Folder).where(
        Folder.owner_id == current_user.id,
        Folder.profile_id == profile_id  # filter by profile
    )
    folders = db.scalars(stmt).all()
    return folders


# Delete folder
@router.delete("/{folder_id}")
def delete_folder(
    folder_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    stmt = select(Folder).where(
        Folder.id == folder_id,
        Folder.owner_id == current_user.id
    )

    folder = db.scalar(stmt)

    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    db.delete(folder)
    db.commit()

    return {"message": "Folder deleted"}