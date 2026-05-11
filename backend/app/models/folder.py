import uuid

from typing import Optional
from sqlalchemy import String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class Folder(Base):
    __tablename__ = "folders"
    __table_args__ = (
        UniqueConstraint("owner_id", "profile_id", "parent_id", "name", name="uq_folder_name_per_location"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"))
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("folders.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
    deleted_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Relationships
    owner: Mapped["User"] = relationship(back_populates="folders")
    profile: Mapped["Profile"] = relationship(back_populates="folders")
    parent: Mapped[Optional["Folder"]] = relationship(back_populates="subfolders", remote_side="Folder.id")
    subfolders: Mapped[list["Folder"]] = relationship(back_populates="parent", cascade="all, delete-orphan")
    files: Mapped[list["File"]] = relationship(back_populates="folder", cascade="all, delete-orphan")