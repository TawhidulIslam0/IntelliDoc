# from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, BigInteger
# from sqlalchemy.sql import func
# from app.database import Base


# class Document(Base):
#     __tablename__ = "documents"

#     id = Column(Integer, primary_key=True, index=True)

#     filename = Column(String, nullable=False)
#     file_type = Column(String, nullable=True)
#     file_size = Column(BigInteger, nullable=True)  # in bytes

#     storage_path = Column(String, nullable=False, unique=True)

#     user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
#     folder_id = Column(Integer, ForeignKey("folders.id", ondelete="SET NULL"), nullable=True)

#     created_at = Column(DateTime(timezone=True), server_default=func.now())
#     updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())