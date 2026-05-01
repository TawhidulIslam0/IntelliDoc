import uuid
from typing import Optional

from sqlalchemy import Integer, Text, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.file import File
from pgvector.sqlalchemy import Vector

from app.database import Base


class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    file_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("files.id", ondelete="CASCADE"))
    tab_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("tabs.id", ondelete="CASCADE"), nullable=True)
    chunk_index: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text) # The actual text content of the chunk
    embedding: Mapped[Optional[list]] = mapped_column(Vector(1024), nullable=True)
    created_at: Mapped[str] = mapped_column(String(50))
    start_char: Mapped[int] = mapped_column(Integer) # The character index in the original document where this chunk starts
    end_char: Mapped[int] = mapped_column(Integer) # The character index in the original document where this chunk ends

    # Relationships
    file: Mapped["File"] = relationship(back_populates="chunks")
    tab = relationship("Tab")