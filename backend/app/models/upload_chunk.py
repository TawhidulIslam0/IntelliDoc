import uuid
from sqlalchemy import Integer, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class UploadChunk(Base):
    __tablename__ = "upload_chunks"

    __table_args__ = (
        UniqueConstraint("file_id", "chunk_index", name="uq_file_chunk"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    file_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("files.id", ondelete="CASCADE"))
    chunk_index: Mapped[int] = mapped_column(Integer)
    uploaded: Mapped[bool] = mapped_column(Boolean, default=False)

    file = relationship("File", back_populates="upload_chunks")