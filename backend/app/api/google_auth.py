import os
import uuid
 
from fastapi import APIRouter, Request, Depends
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from sqlalchemy.orm import Session
from sqlalchemy import select
 
from app.database import get_db
from app.models.user import User
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
 
 
def generate_unique_username(name: str, db: Session) -> str:
    """Generate a unique username, appending a random suffix if there's a collision."""
    base_username = name.replace(" ", "").lower()[:15]
    username = base_username
 
    while db.execute(select(User).where(User.username == username)).scalars().first():
        username = base_username[:10] + str(uuid.uuid4())[:4]
 
    return username
 
 
# Redirect to Google
@router.get("/google/login")
async def google_login(request: Request):
    redirect_uri = request.url_for("google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)
 
 
# Handle Google response
@router.get("/google/callback", name="google_callback")
async def google_callback(
    request: Request,
    db: Session = Depends(get_db)
):
    token = await oauth.google.authorize_access_token(request)
 
    user_info = token["userinfo"]
    email = user_info["email"]
    name = user_info.get("name", email.split("@")[0])  # Fallback if name is missing
 
    # Find existing user
    result = db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
 
    # Create new user if needed
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
 
    # Create JWT token
    access_token = create_access_token(data={"sub": str(user.id)})
 
    return RedirectResponse(url=f"{FRONTEND_URL}/oauth-success?token={access_token}")