import uuid
from typing import Optional
from sqlalchemy import String, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Tab(Base):
    __tablename__ = "tabs"
    __table_args__ = (
        UniqueConstraint("file_id", "name", name="uq_tab_name_per_file"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    file_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("files.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), default="Tab 1")
    content: Mapped[Optional[str]] = mapped_column(Text, default="")
    created_at: Mapped[str] = mapped_column(String(50))
    updated_at: Mapped[str] = mapped_column(String(50))

    file: Mapped["File"] = relationship(back_populates="tabs")