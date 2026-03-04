from fastapi import FastAPI, APIRouter
from app.database import engine, Base
from app.api.users import router as users_router  
    
app = FastAPI()
app.include_router(users_router)

# Create tables automatically
Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"message": "IntelliDoc Backend Running"}