from fastapi import FastAPI
from app.database import engine, Base

# Import models so they register with Base
from app.models import user, folder, document

app = FastAPI()

# Create tables automatically
Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"message": "IntelliDoc Backend Running"}