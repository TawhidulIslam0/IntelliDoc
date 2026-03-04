import uuid 

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session 
from sqlalchemy import select
from typing import Annotated

from app.models.user import User
from app.database import get_db
from pydantic import BaseModel, ConfigDict, Field, EmailStr

class UserBase(BaseModel): # Base model for user-related data, used for both creation and response
    username: str = Field(min_length=6, max_length=15)
    email: EmailStr = Field(max_length=120)

class UserCreate(UserBase): # When creating a user, we also need the password
    password: str = Field(min_length=6)

# Later fix privacy issues by not returning email and username in the response
class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True) # Allows Pydantic to read data from SQLAlchemy models using attribute access
    
    id: uuid.UUID

router = APIRouter(prefix="/api/users", tags=["users"])

# Creates the user in DB and returns the created user as response. Checks for existing username and email before creating a new user.
@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Annotated[Session, Depends(get_db)]):

    # Check if username exists
    result = db.execute(select(User).where(User.username == user.username))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
    
    # Check if email exists
    result = db.execute(select(User).where(User.email == user.email))
    existing_email = result.scalars().first()
    if existing_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
    
    new_user = User(
        username=user.username,
        email=user.email,
        password_hash=user.password+"not_hashed_for_demo"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user
