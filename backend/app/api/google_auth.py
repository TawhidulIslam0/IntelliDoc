import os
import uuid

from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.profile import Profile
from app.api.auth import create_access_token

router = APIRouter(prefix="/api/auth", tags=["Google Auth"])

oauth = OAuth()

oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile"
    }
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")


def generate_unique_username(name: str, db: Session) -> str:
    base_username = name.replace(" ", "").lower()[:15]
    username = base_username

    while db.execute(select(User).where(User.username == username)).scalars().first():
        username = base_username[:10] + str(uuid.uuid4())[:4]

    return username


# Redirect to Google
@router.get("/google/login")
async def google_login(request: Request):
    redirect_uri = f"{BACKEND_URL}/api/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


# Handle callback
@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    try:
        # Exchange code for token
        token = await oauth.google.authorize_access_token(request)
        # For Debugging (remove during production)
        print("TOKEN:", token)

        # uses userinfo included in token
        user_info = token.get("userinfo")
        # For Debugging (remove during production)
        print("USER INFO:", user_info)

        if not user_info or "email" not in user_info:
            raise Exception(f"Invalid user_info: {user_info}")

        email = user_info["email"]
        name = user_info.get("name", email.split("@")[0])

        # Check if user exists
        user = db.execute(
            select(User).where(User.email == email)
        ).scalars().first()

        # Create user if not exists
        if not user:
            username = generate_unique_username(name, db)
            user = User(
                id=uuid.uuid4(),
                username=username,
                email=email,
                password_hash=None
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Create default profiles if user has none (handles existing users too)
        existing_profiles = db.execute(
            select(Profile).where(Profile.owner_id == user.id)
        ).scalars().all()

        if not existing_profiles:
            for i, profile_name in enumerate(["Personal", "School", "Work"]):
                db.add(Profile(name=profile_name, owner_id=user.id, is_default=(i == 0)))
            db.commit()

        # Create JWT
        access_token = create_access_token(data={"sub": str(user.id)})

        # Redirect to frontend
        return RedirectResponse(
            url=f"{FRONTEND_URL}/#/oauth-success?token={access_token}"
        )

    except Exception as e:
        print("OAUTH ERROR:", e)
        raise HTTPException(status_code=400, detail="Google authentication failed")