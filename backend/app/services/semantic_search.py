"""
semantic_search.py
------------------
Semantic vector search service using pgvector + BGE-M3 embeddings.

Flow:
query -> clean -> embed query -> vector similarity search -> ranked chunks/files
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.embedder import Embedder
from app.services.text_extractor import clean

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    chunk_id: UUID
    file_id: UUID
    file_name: str
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
        min_similarity: float = 0.65,
    ) -> list[SearchResult]:
        """
        Perform semantic similarity search.

        Flow:
        1. Clean query
        2. Embed query
        3. Compare against chunk embeddings using pgvector
        4. Return top-k most similar chunks above min_similarity threshold

        Note:
        min_similarity filtering happens in Python after the DB fetch.
        top_k controls how many final rows are returned after threshold filtering.
        """

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

        # Fetch extra rows so Python-side min_similarity filtering
        # still has enough candidates to work with.
        db_limit = max(top_k * 4, 20)

        sql = """
        SELECT
            c.id AS chunk_id,
            c.file_id,
            c.tab_id,
            c.chunk_index,
            c.text AS chunk_text,
            c.start_char,
            c.end_char,
            f.name AS file_name,

            -- cosine distance:
            -- 0 = identical, larger = less similar
            (c.embedding <=> :embedding) AS distance

        FROM chunks c
        JOIN files f
            ON f.id = c.file_id

        WHERE
            c.embedding IS NOT NULL
            AND f.status = 'indexed'
        """

        params: dict = {
            "embedding": query_embedding,
            "db_limit": db_limit,
        }

        # Optional ownership filtering
        if owner_id is not None:
            sql += " AND f.owner_id = :owner_id"
            params["owner_id"] = owner_id

        if profile_id is not None:
            sql += " AND f.profile_id = :profile_id"
            params["profile_id"] = profile_id

        # Optional file filtering
        if file_id is not None:
            sql += " AND c.file_id = :file_id"
            params["file_id"] = file_id

        # Optional tab filtering
        if tab_id is not None:
            sql += " AND c.tab_id = :tab_id"
            params["tab_id"] = tab_id

        sql += """
        ORDER BY
            c.embedding <=> :embedding,
            c.id
        LIMIT :db_limit
        """

        rows = db.execute(
            text(sql),
            params,
        ).mappings().all()

        results: list[SearchResult] = []

        for row in rows:
            distance = float(row["distance"])

            # Since embeddings are L2-normalized and pgvector uses cosine
            # distance here, similarity can be approximated as:
            similarity = max(0.0, 1.0 - distance)

            if similarity < min_similarity:
                continue

            results.append(
                SearchResult(
                    chunk_id=row["chunk_id"],
                    file_id=row["file_id"],
                    file_name=row["file_name"],
                    chunk_text=row["chunk_text"],
                    chunk_index=row["chunk_index"],
                    similarity=round(similarity, 4),
                    start_char=row["start_char"],
                    end_char=row["end_char"],
                    tab_id=row["tab_id"],
                )
            )

            if len(results) >= top_k:
                break

        return results