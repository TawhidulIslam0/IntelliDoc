import uuid
import json  # Added for proper JSON handling
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from datetime import datetime, timezone

from app.database import get_db
from app.models.tab import Tab
from app.models.file import File
from app.models.user import User
from app.api.users import get_current_user 

router = APIRouter(prefix="/tabs", tags=["tabs"])

# Get all tabs for a file
@router.get("/{file_id}")
async def get_tabs(
    file_id: uuid.UUID, 
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    file = db.scalar(select(File).where(File.id == file_id, File.owner_id == current_user.id))
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    tabs = db.scalars(
        select(Tab)
        .where(Tab.file_id == file_id)
        .order_by(Tab.created_at.asc())
    ).all()
    return tabs

# Create a new tab
@router.post("/{file_id}")
async def create_tab(
    file_id: uuid.UUID, 
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    file = db.scalar(select(File).where(File.id == file_id, File.owner_id == current_user.id))
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    existing_count = db.scalar(select(func.count(Tab.id)).where(Tab.file_id == file_id))
    name = f"Tab {existing_count + 1}"

    now = datetime.now(timezone.utc).isoformat()
    
    # Initialize with valid JSON structure instead of empty string
    new_tab = Tab(
        id=uuid.uuid4(),
        file_id=file_id,
        name=name,
        content='{"pages": [""]}', 
        created_at=now,
        updated_at=now
    )
    db.add(new_tab)
    db.commit()
    db.refresh(new_tab)
    return new_tab

# Duplicate a tab
@router.post("/{file_id}/duplicate/{tab_id}")
async def duplicate_tab(
    file_id: uuid.UUID,
    tab_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    source_tab = db.scalar(
        select(Tab).join(File).where(Tab.id == tab_id, File.owner_id == current_user.id)
    )
    
    if not source_tab:
        raise HTTPException(status_code=404, detail="Tab not found")

    now = datetime.now(timezone.utc).isoformat()
    
    #  Ensure content is strictly copied as a string
    new_tab = Tab(
        id=uuid.uuid4(),
        file_id=file_id,
        name=f"{source_tab.name} (Copy)",
        content=str(source_tab.content), 
        created_at=now,
        updated_at=now
    )
    
    db.add(new_tab)
    db.commit()
    db.refresh(new_tab)
    return new_tab

# Update a tab
@router.patch("/{tab_id}")
async def update_tab(
    tab_id: uuid.UUID, 
    update_data: dict, 
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    tab = db.scalar(select(Tab).join(File).where(Tab.id == tab_id, File.owner_id == current_user.id))
    if not tab:
        raise HTTPException(status_code=404, detail="Tab not found")

    for key, value in update_data.items():
        if hasattr(tab, key) and key != "parent_id":
            #  If the data is a dictionary (from JS), convert to string before saving
            if key == "content" and isinstance(value, (dict, list)):
                setattr(tab, key, json.dumps(value))
            else:
                setattr(tab, key, value)

    tab.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(tab)
    return tab

# Delete tab
@router.delete("/{tab_id}")
async def delete_tab(
    tab_id: uuid.UUID, 
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    tab = db.scalar(select(Tab).join(File).where(Tab.id == tab_id, File.owner_id == current_user.id))
    if not tab:
        raise HTTPException(status_code=404, detail="Tab not found")

    tab_count = db.scalar(select(func.count(Tab.id)).where(Tab.file_id == tab.file_id))
    if tab_count <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last tab.")

    db.delete(tab)
    db.commit()
    
    return {"message": "Deleted tab successfully"}