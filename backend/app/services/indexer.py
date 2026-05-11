"""
indexer.py
----------
End-to-end indexing pipeline for uploaded files stored in S3.

Flow:
uploaded file -> download from S3 -> extract -> clean -> chunk -> embed -> save chunks to pgvector
"""

from __future__ import annotations

import os
import tempfile
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.file import File
from app.models.chunk import Chunk as ChunkModel
from app.models.tab import Tab
from app.services.embedder import Embedder
from app.services.text_extractor import extract, clean, _html_to_text
from app.services.chunker import chunk_text


@dataclass
class IndexingResult:
    file_id: UUID
    status: str
    num_chunks: int
    extracted_chars: int
    error: str | None = None


class Indexer:
    def __init__(
        self,
        *,
        embedder: Embedder | None = None,
        s3_client=None,
        bucket_name: str | None = None,
        chunk_size: int = 500,
        chunk_overlap: int = 75,
        ready_status: str = "completed",
        indexing_status: str = "indexing",
        indexed_status: str = "indexed",
        failed_status: str = "index_failed",
    ) -> None:
        self.embedder = embedder or Embedder()
        self.bucket_name = bucket_name or os.getenv("AWS_BUCKET_NAME")
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

        self.ready_status = ready_status
        self.indexing_status = indexing_status
        self.indexed_status = indexed_status
        self.failed_status = failed_status

        self.s3 = s3_client or boto3.client(
            "s3",
            region_name=os.getenv("AWS_REGION"),
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        )

        if not self.bucket_name:
            raise ValueError("Missing S3 bucket name")

    def index_file(self, db: Session, file_id: UUID, *, force: bool = False) -> IndexingResult:
        file = db.scalar(select(File).where(File.id == file_id))
        if not file:
            return IndexingResult(
                file_id=file_id,
                status="not_found",
                num_chunks=0,
                extracted_chars=0,
                error="File not found",
            )
        
        # Prevent indexing unless the file is in the expected "ready" state
        if not force and file.status != self.ready_status:
            return IndexingResult(
                file_id=file_id,
                status="skipped",
                num_chunks=0,
                extracted_chars=0,
                error=f"File status is {file.status!r}, not {self.ready_status!r}",
            )
        
        # Do not index files that are in the trash
        if file.is_deleted:
            return IndexingResult(
                file_id=file_id,
                status="skipped",
                num_chunks=0,
                extracted_chars=0,
                error="File is in trash — skipping indexing",
            )

        try:
            # Mark the file as currently being indexed
            file.status = self.indexing_status
            file.updated_at = self._now()
            db.commit()
            db.refresh(file)

            indexed_chunks = self._build_chunks(db, file)

            # If no valid text chunks were produced, remove any existing embeddings/chunks for this file
            if not indexed_chunks:
                db.execute(delete(ChunkModel).where(ChunkModel.file_id == file.id))
                file.status = self.failed_status
                file.updated_at = self._now()
                db.commit()

                return IndexingResult(
                    file_id=file.id,
                    status=self.failed_status,
                    num_chunks=0,
                    extracted_chars=0,
                    error="No extractable text found",
                )

            vectors = self.embedder.encode_documents([item["chunk"].text for item in indexed_chunks])

            if len(vectors) != len(indexed_chunks):
                raise ValueError(
                    f"Embedding count mismatch: got {len(vectors)} vectors for {len(indexed_chunks)} chunks"
                )

            # remove old chunks if re-indexing
            db.execute(delete(ChunkModel).where(ChunkModel.file_id == file.id))

            now = self._now()

            # Store chunk rows temporarily before batch insertion
            rows: list[ChunkModel] = []

            for item, vector in zip(indexed_chunks, vectors):
                chunk = item["chunk"]
                # Create a database row representing one searchable chunk
                rows.append(
                    ChunkModel(
                        file_id=file.id,
                        tab_id=item["tab_id"],
                        chunk_index=chunk.index,
                        text=chunk.text,
                        embedding=vector,
                        created_at=now,
                        start_char=chunk.start_char,
                        end_char=chunk.end_char,
                    )
                )

            db.add_all(rows)
            file.status = self.indexed_status
            file.updated_at = now
            db.commit()

            return IndexingResult(
                file_id=file.id,
                status=self.indexed_status,
                num_chunks=len(rows),
                extracted_chars=sum(len(item["text"]) for item in indexed_chunks),
            )

        except Exception as e:
            db.rollback()

            try:
                file = db.scalar(select(File).where(File.id == file_id))
                if file:
                    file.status = self.failed_status
                    file.updated_at = self._now()
                    db.commit()
            except Exception:
                db.rollback()

            return IndexingResult(
                file_id=file_id,
                status=self.failed_status,
                num_chunks=0,
                extracted_chars=0,
                error=str(e),
            )

    def index_ready_files(self, db: Session, *, limit: int = 25) -> list[IndexingResult]:
        files = db.scalars(
            select(File)
            .where(File.status == self.ready_status, File.is_deleted == False)
            .limit(limit)
        ).all()

        results: list[IndexingResult] = []
        for file in files:
            results.append(self.index_file(db, file.id))
        return results

    def _build_chunks(self, db: Session, file: File) -> list[dict]:
        """Build chunks for uploaded files or internal IDOC documents."""

        suffix = os.path.splitext(file.name)[1].lower() if file.name and "." in file.name else ""

        if suffix == ".idoc":
            return self._build_idoc_chunks(db, file)

        raw_text = self._extract_text_from_s3(file)
        cleaned_text = clean(raw_text)

        if not cleaned_text.strip():
            return []

        chunks = chunk_text(
            cleaned_text,
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
        )

        return [
            {
                "tab_id": None,
                "text": cleaned_text,
                "chunk": chunk,
            }
            for chunk in chunks
        ]

    def _build_idoc_chunks(self, db: Session, file: File) -> list[dict]:
        """Build chunks for each tab in an IDOC file."""

        tabs = db.scalars(
            select(Tab)
            .where(Tab.file_id == file.id)
            .order_by(Tab.created_at.asc())
        ).all()

        indexed_chunks: list[dict] = []

        for tab in tabs:
            raw_content = tab.content or ""

            try:
                data = json.loads(raw_content)
            except json.JSONDecodeError:
                data = {"pages": [raw_content]}

            parts: list[str] = []

            pages = data.get("pages", [])
            if isinstance(pages, list):
                for page in pages:
                    text = _html_to_text(str(page))
                    if text.strip():
                        parts.append(text)

            cleaned_text = clean("\n\n".join(parts))

            if not cleaned_text.strip():
                continue

            chunks = chunk_text(
                cleaned_text,
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
            )
            for chunk in chunks:
                indexed_chunks.append(
                    {
                        "tab_id": tab.id,
                        "text": cleaned_text,
                        "chunk": chunk,
                    }
                )
        return indexed_chunks

    def _extract_text_from_s3(self, file: File) -> str:
        if not file.s3_key:
            raise ValueError(f"File {file.id} has no s3_key")

        suffix = os.path.splitext(file.name)[1] if file.name and "." in file.name else ""

        try:
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
                self.s3.download_file(self.bucket_name, file.s3_key, tmp.name)
                return extract(tmp.name)
        except (ClientError, BotoCoreError) as e:
            raise RuntimeError(f"S3 download failed for file {file.id}: {e}") from e

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()