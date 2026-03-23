from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.users import router as users_router
from app.api.files import router as files_router
from app.api.folders import router as folders_router
from app.api.profile import router as profile_router
from app.api.google_auth import router as google_router

app = FastAPI()

app.include_router(users_router)
app.include_router(files_router, prefix="/api")
app.include_router(folders_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(google_router) 

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # your frontend's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# For Google OAuth
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY", "dev-secret-key")
)

# Create tables automatically
Base.metadata.create_all(bind=engine)