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
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.file import File
from app.models.chunk import Chunk as ChunkModel
from app.services.embedder import Embedder
from app.services.text_extractor import extract, clean
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

        if not force and file.status != self.ready_status:
            return IndexingResult(
                file_id=file_id,
                status="skipped",
                num_chunks=0,
                extracted_chars=0,
                error=f"File status is {file.status!r}, not {self.ready_status!r}",
            )

        try:
            file.status = self.indexing_status
            file.updated_at = self._now()
            db.commit()
            db.refresh(file)

            raw_text = self._extract_text_from_s3(file)
            cleaned_text = clean(raw_text)

            if not cleaned_text.strip():
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

            chunks = chunk_text(
                cleaned_text,
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
            )

            if not chunks:
                db.execute(delete(ChunkModel).where(ChunkModel.file_id == file.id))
                file.status = self.failed_status
                file.updated_at = self._now()
                db.commit()

                return IndexingResult(
                    file_id=file.id,
                    status=self.failed_status,
                    num_chunks=0,
                    extracted_chars=len(cleaned_text),
                    error="Chunking produced no chunks",
                )

            vectors = self.embedder.encode_documents([chunk.text for chunk in chunks])

            if len(vectors) != len(chunks):
                raise ValueError(
                    f"Embedding count mismatch: got {len(vectors)} vectors for {len(chunks)} chunks"
                )

            # remove old chunks if re-indexing
            db.execute(delete(ChunkModel).where(ChunkModel.file_id == file.id))

            now = self._now()
            rows: list[ChunkModel] = []

            for chunk, vector in zip(chunks, vectors):
                rows.append(
                    ChunkModel(
                        file_id=file.id,
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
                extracted_chars=len(cleaned_text),
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
            .where(File.status == self.ready_status)
            .limit(limit)
        ).all()

        results: list[IndexingResult] = []
        for file in files:
            results.append(self.index_file(db, file.id))
        return results

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