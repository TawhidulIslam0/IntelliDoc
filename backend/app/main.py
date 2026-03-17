from fastapi import FastAPI
from app.database import engine, Base
from app.api.users import router as users_router
from fastapi.middleware.cors import CORSMiddleware
from app.models import user, folder, file
from app.api.files import router as files_router
from app.api.folders import router as folders_router
from app.api.profile import router as profile_router
    
app = FastAPI()
app.include_router(users_router)
app.include_router(files_router, prefix="/api")
app.include_router(folders_router, prefix="/api")
app.include_router(profile_router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # your frontend's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Create tables automatically
Base.metadata.create_all(bind=engine)