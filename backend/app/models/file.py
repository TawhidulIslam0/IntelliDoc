import uuid

from typing import Optional
from sqlalchemy import String, Text, BigInteger, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.user import User
from app.models.folder import Folder
from app.models.profile import Profile
from app.models.tab import Tab

from app.database import Base
from app.models.upload_chunk import UploadChunk

class File(Base):
    __tablename__ = "files"
    __table_args__ = (
        UniqueConstraint("owner_id", "profile_id", "folder_id", "name", name="uq_file_name_per_folder"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"))
    folder_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("folders.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    s3_key: Mapped[str] = mapped_column(Text, unique=True)
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    mime_type: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[str] = mapped_column(String(50))
    updated_at: Mapped[str] = mapped_column(String(50))
    upload_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    total_chunks: Mapped[Optional[int]] = mapped_column(nullable=True)
    uploaded_chunks: Mapped[int] = mapped_column(default=0)
    is_upload_complete: Mapped[bool] = mapped_column(default=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
    deleted_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Relationships
    owner: Mapped["User"] = relationship(back_populates="files")
    folder: Mapped[Optional["Folder"]] = relationship(back_populates="files")
    profile: Mapped["Profile"] = relationship(back_populates="files")
    tabs: Mapped[list["Tab"]] = relationship(back_populates="file", cascade="all, delete-orphan")
    chunks: Mapped[list["Chunk"]] = relationship(back_populates="file", cascade="all, delete-orphan")
    upload_chunks: Mapped[list["UploadChunk"]] = relationship( back_populates="file",cascade="all, delete-orphan")