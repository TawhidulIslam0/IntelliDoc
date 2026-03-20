import uuid
from typing import Optional
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50))
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    # Relationships
    owner: Mapped["User"] = relationship(back_populates="profiles")
    folders: Mapped[list["Folder"]] = relationship(back_populates="profile", cascade="all, delete-orphan")
    files: Mapped[list["File"]] = relationship(back_populates="profile", cascade="all, delete-orphan")
    
    # mark default profile
    is_default: Mapped[bool] = mapped_column(default=False)