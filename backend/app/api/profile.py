from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.profile import Profile
from app.models.user import User
from app.api.users import get_current_user

# Create an API router for profiles with prefix /profiles and tag "profiles"
router = APIRouter(prefix="/profiles", tags=["profiles"])

# Pydantic request model for creating a profile
class ProfileCreate(BaseModel):
    name: str
    is_default: bool = False  # optional; default False

# List all profiles for the current user
@router.get("/")
def list_profiles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Profile).filter(Profile.owner_id == current_user.id).all()

# Create a new profile for the current user
@router.post("/")  
def create_profile(
    data: ProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if profile with same name already exists for this user
    existing = db.query(Profile).filter(
        Profile.owner_id == current_user.id,
        Profile.name == data.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Profile with this name already exists")

    profile = Profile(
        name=data.name,
        owner_id=current_user.id,
        is_default=data.is_default
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile