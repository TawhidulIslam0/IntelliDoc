from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.profile import Profile
from app.api.users import get_current_user
from app.models.user import User

# Create an API router for profiles with prefix /profiles and tag "profiles"
router = APIRouter(prefix="/profiles", tags=["profiles"])

#  List all profiles for the current user
@router.get("/")
def list_profiles(
    current_user: User = Depends(get_current_user),  
    db: Session = Depends(get_db)                    
):

    return db.query(Profile).filter(Profile.owner_id == current_user.id).all()

# Create a new profile for the current user
@router.post("/")
def create_profile(
    name: str,                                        
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)                     
):
    
    profile = Profile(name=name, owner_id=current_user.id)
    db.add(profile)
    db.commit()
    db.refresh(profile) 
    return profile 