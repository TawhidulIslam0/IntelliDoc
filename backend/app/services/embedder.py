"""
embedder.py
-----------
Wrapper around BAAI/bge-m3 for document and query embeddings.
Uses plain Hugging Face transformers to avoid FlagEmbedding compatibility issues.
"""

from __future__ import annotations

from typing import Sequence

import torch
import torch.nn.functional as F
from transformers import AutoModel, AutoTokenizer


class Embedder:
    """Small wrapper for generating dense embeddings with BGE-M3."""

    def __init__(
        self,
        model_name: str = "BAAI/bge-m3",
        max_length: int = 8192,
        batch_size: int = 8,
        device: str | None = None,
    ) -> None:
        self.model_name = model_name
        self.max_length = max_length
        self.batch_size = batch_size

        if device is not None:
            self.device = device
        elif torch.cuda.is_available():
            self.device = "cuda"
        else:
            self.device = "cpu"

        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name, use_safetensors=True, trust_remote_code=True)
        self.model.to(self.device)
        self.model.eval()

    @staticmethod
    def _mean_pool(last_hidden_state: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
        """Mean-pool token embeddings using the attention mask."""
        mask = attention_mask.unsqueeze(-1).expand(last_hidden_state.size()).float()
        masked_embeddings = last_hidden_state * mask
        summed = masked_embeddings.sum(dim=1)
        counts = mask.sum(dim=1).clamp(min=1e-9)
        return summed / counts

    def _encode(self, texts: Sequence[str]) -> list[list[float]]:
        """Encode a sequence of texts into normalized dense vectors."""
        cleaned = [text.strip() for text in texts if text and text.strip()]
        if not cleaned:
            return []

        all_vectors: list[list[float]] = []

        with torch.no_grad():
            for i in range(0, len(cleaned), self.batch_size):
                batch = cleaned[i : i + self.batch_size]

                inputs = self.tokenizer(
                    batch,
                    padding=True,
                    truncation=True,
                    max_length=self.max_length,
                    return_tensors="pt",
                )
                inputs = {k: v.to(self.device) for k, v in inputs.items()}

                outputs = self.model(**inputs)

                embeddings = self._mean_pool(
                    outputs.last_hidden_state,
                    inputs["attention_mask"],
                )

                embeddings = F.normalize(embeddings, p=2, dim=1)

                all_vectors.extend(embeddings.cpu().tolist())

        return all_vectors

    def encode_documents(self, texts: Sequence[str]) -> list[list[float]]:
        """Embed document chunks."""
        return self._encode(texts)

    def encode_queries(self, texts: Sequence[str]) -> list[list[float]]:
        """Embed search queries."""
        return self._encode(texts)

    def encode_document(self, text: str) -> list[float]:
        vectors = self.encode_documents([text])
        return vectors[0] if vectors else []

    def encode_query(self, text: str) -> list[float]:
        vectors = self.encode_queries([text])
        return vectors[0] if vectors else []