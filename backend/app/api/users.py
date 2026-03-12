import uuid 
import jwt

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session 
from sqlalchemy import select
from typing import Annotated
from datetime import timedelta

from app.api.auth import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, SECRET_KEY, create_access_token, verify_password, hash_password
from app.models.user import User
from app.database import get_db
from pydantic import BaseModel, ConfigDict, Field, EmailStr

# --- Pydantic Schemas ---

class UserBase(BaseModel): # Base model for user-related data, used for both creation and response
    username: str = Field(min_length=6, max_length=15)
    email: EmailStr = Field(max_length=120)

class UserCreate(UserBase): # When creating a user, we also need the password
    password: str = Field(min_length=6)

class UserResponse(UserBase):
    id: uuid.UUID
    model_config = ConfigDict(from_attributes=True) # Allows Pydantic to read data from SQLAlchemy models using attribute access
    
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

# --- OAuth2 scheme (tells FastAPI where the token comes from) ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/users/login")

def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)]
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: uuid.UUID = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.InvalidTokenError:
        raise credentials_exception

    result = db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    return user


router = APIRouter(prefix="/api/users", tags=["users"])


# Endpoint to create a new user with validation for unique username and email, and password hashing
@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Annotated[Session, Depends(get_db)]):

    result = db.execute(select(User).where(User.username == user.username))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
    
    result = db.execute(select(User).where(User.email == user.email))
    existing_email = result.scalars().first()
    if existing_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
    
    new_user = User(
        username=user.username,
        email=user.email,
        password_hash=hash_password(user.password)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# Endpoint for user login that validates credentials and returns a JWT access token
@router.post("/login", response_model=Token)
def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: Annotated[Session, Depends(get_db)]):

    result = db.execute(select(User).where(User.username == form_data.username))
    user = result.scalars().first()
    if not user:
        verify_password(form_data.password, hash_password("dummy_password"))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password", headers={"WWW-Authenticate": "Bearer"})
    
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password", headers={"WWW-Authenticate": "Bearer"})
    
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}


# -- Test protected route --
@router.get("/me", response_model=UserResponse)
def get_me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user