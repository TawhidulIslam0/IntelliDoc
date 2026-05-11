"""
semantic_search.py
------------------
Semantic vector search service using pgvector + BGE-M3 embeddings.

Flow:
query -> clean -> embed query -> vector similarity search
-> rank chunks -> collapse into ranked files
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.chunk import Chunk
from app.models.file import File
from app.services.embedder import Embedder
from app.services.text_extractor import clean

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    file_id: UUID
    file_name: str
    mime_type: str
    size_bytes: int
    folder_id: UUID | None

    # Best matching chunk metadata
    chunk_id: UUID
    chunk_text: str
    chunk_index: int
    similarity: float
    start_char: int
    end_char: int
    tab_id: UUID | None = None


class SemanticSearchService:
    """
    Semantic search over indexed chunks stored in pgvector.
    """

    def __init__(
        self,
        *,
        embedder: Embedder | None = None,
    ) -> None:
        self.embedder = embedder or Embedder()

    def search(
        self,
        db: Session,
        query: str,
        *,
        owner_id: UUID | None = None,
        profile_id: UUID | None = None,
        file_id: UUID | None = None,
        tab_id: UUID | None = None,
        top_k: int = 5,
        min_similarity: float = 0.40,
    ) -> list[SearchResult]:

        if top_k <= 0:
            raise ValueError("top_k must be greater than 0")

        if not 0 <= min_similarity <= 1:
            raise ValueError("min_similarity must be between 0 and 1")

        cleaned_query = clean(query)

        if not cleaned_query.strip():
            return []

        query_embedding = self.embedder.encode_query(cleaned_query)

        if not query_embedding:
            logger.warning(
                "Embedder returned empty embedding for query: %.80s",
                cleaned_query,
            )
            return []

        if len(query_embedding) != 1024:
            raise ValueError(
                f"Expected embedding dimension 1024, got {len(query_embedding)}"
            )

        # Fetch extra rows so file collapsing still leaves enough candidates
        db_limit = max(top_k * 10, 50)

        distance_expr = Chunk.embedding.cosine_distance(query_embedding)

        stmt = (
            select(
                Chunk.id.label("chunk_id"),
                Chunk.file_id,
                Chunk.tab_id,
                Chunk.chunk_index,
                Chunk.text.label("chunk_text"),
                Chunk.start_char,
                Chunk.end_char,

                File.name.label("file_name"),
                File.mime_type,
                File.size_bytes,
                File.folder_id,

                distance_expr.label("distance"),
            )
            .join(File, File.id == Chunk.file_id)
            .where(
                Chunk.embedding.is_not(None),
                File.status == "indexed",
            )
        )

        if owner_id is not None:
            stmt = stmt.where(File.owner_id == owner_id)

        if profile_id is not None:
            stmt = stmt.where(File.profile_id == profile_id)

        if file_id is not None:
            stmt = stmt.where(Chunk.file_id == file_id)

        if tab_id is not None:
            stmt = stmt.where(Chunk.tab_id == tab_id)

        stmt = (
            stmt
            .order_by(distance_expr, Chunk.id)
            .limit(db_limit)
        )

        rows = db.execute(stmt).mappings().all()

        # Keep ONLY best chunk per file
        best_file_matches: dict[UUID, SearchResult] = {}

        for row in rows:
            distance = float(row["distance"])

            similarity = max(0.0, 1.0 - distance)

            if similarity < min_similarity:
                continue

            current = best_file_matches.get(row["file_id"])

            # Replace only if this chunk is better
            if current is None or similarity > current.similarity:
                best_file_matches[row["file_id"]] = SearchResult(
                    file_id=row["file_id"],
                    file_name=row["file_name"],
                    mime_type=row["mime_type"],
                    size_bytes=row["size_bytes"],
                    folder_id=row["folder_id"],

                    chunk_id=row["chunk_id"],
                    chunk_text=row["chunk_text"],
                    chunk_index=row["chunk_index"],
                    similarity=round(similarity, 4),
                    start_char=row["start_char"],
                    end_char=row["end_char"],
                    tab_id=row["tab_id"],
                )

        # Rank files by best similarity
        ranked_results = sorted(
            best_file_matches.values(),
            key=lambda r: r.similarity,
            reverse=True,
        )

        return ranked_results[:top_k]