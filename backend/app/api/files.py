from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from typing import List

from app.database import get_db
from app.models.file import File as FileModel
from app.api.users import get_current_user 

router = APIRouter(prefix="/files", tags=["files"])

@router.get("/")
async def list_files(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    files = db.query(FileModel).filter(FileModel.owner_id == current_user.id).all()
    return files

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        file_content = await file.read()
        file_size = len(file_content)
        
        generated_s3_key = f"uploads/{current_user.id}/{uuid.uuid4()}-{file.filename}"

        new_file_record = FileModel(
            id=uuid.uuid4(),
            owner_id=current_user.id,
            name=file.filename,
            s3_key=generated_s3_key,
            size_bytes=file_size,
            folder_id=None
        )

        db.add(new_file_record)
        db.commit()
        db.refresh(new_file_record)

        return {"message": "Success", "file_id": str(new_file_record.id)}
    
    except Exception as e:
        db.rollback()
        print(f"Upload Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")