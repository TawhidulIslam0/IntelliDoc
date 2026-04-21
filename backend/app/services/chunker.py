"""
chunker.py
----------
Recursive, token-aware text chunker for semantic search.
Uses BGE-M3's tokenizer so chunk sizes exactly match what the embedder sees.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from transformers import AutoTokenizer


# BGE-M3 tokenizer
# BGE-M3's max sequence length is 8192 tokens, so a 500-token chunk is within limits.
_TOKENIZER = AutoTokenizer.from_pretrained("BAAI/bge-m3")


# Convert string to token count
def count_tokens(text: str) -> int:
    return len(_TOKENIZER.encode(text, add_special_tokens=False))


def _tail_as_text(text: str, num_tokens: int) -> str:
    """Return the last `num_tokens` tokens of `text` as a string.

    Used to build overlap between adjacent chunks.  Going through the
    tokenizer guarantees overlap is exactly the size we asked for, even when the last atom in the chunk is enormous (e.g. a full page-sized paragraph from a PDF).
    """
    tokens = _TOKENIZER.encode(text, add_special_tokens=False)
    if len(tokens) <= num_tokens:
        return text
    return _TOKENIZER.decode(tokens[-num_tokens:]).lstrip()


# Separators in decreasing order of semantic "strength".  
# Splitter goes in order from strongest to weakest, trying to split text into atoms that fit into chunk_size
DEFAULT_SEPARATORS = ["\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " ", ""]

# Use dataclass instead of TypedDict so we can attach methods (e.g. to_dict) and add future fields
@dataclass
class Chunk:
    text: str
    index: int        # chunk index within the document
    start_char: int   # inclusive start offset in the source text
    end_char: int     # exclusive end offset in the source text

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "index": self.index,
            "start_char": self.start_char,
            "end_char": self.end_char,
        }


def _split_keep_separator(text: str, sep: str) -> list[str]:
    """Split on `sep` but keep the separator glued to the piece that precedes it.

    This way we don't lose the ". " between sentences when we merge pieces
    back together, and offsets stay easy to compute.
    """
    if sep == "":
        return list(text)  # split to characters
    parts = text.split(sep)
    if len(parts) == 1:
        return parts
    result = [p + sep for p in parts[:-1]]
    if parts[-1]:
        result.append(parts[-1])
    return result


def _split_to_atoms(
    text: str,
    chunk_size: int,
    separators: list[str],
    count: Callable[[str], int],
) -> list[str]:
    """Recursively break text into 'atoms' that each fit within chunk_size tokens.
    
    We split the text on the strongest separator first. We check the list of parts against the chunk_size
    1. If it fits, we keep it as an atom.
    2. If it doesn't fit and we have more separators to try, we recursively split it using the next separator.
    3. If it doesn't fit and we have no more separators to try, we emit it as an atom anyway 

    """
    if count(text) <= chunk_size:
        return [text]

    # Find the first separator that actually appears in the text.
    for i, sep in enumerate(separators):
        if sep == "" or sep in text:
            parts = _split_keep_separator(text, sep)
            remaining = separators[i + 1:]
            atoms: list[str] = []
            for p in parts:
                if count(p) <= chunk_size:
                    atoms.append(p)
                elif remaining:
                    atoms.extend(_split_to_atoms(p, chunk_size, remaining, count))
                else:
                    # No more separators and still too big --- emit as-is.
                    # (Rare; happens when separators bottoms out at "".)
                    atoms.append(p)
            return atoms

    return [text]  # unreachable given "" is in DEFAULT_SEPARATORS


def _merge_atoms(
    atoms: list[str],
    chunk_size: int,
    chunk_overlap: int,
    count: Callable[[str], int],
) -> list[str]:
    """Pack atoms into chunks of up to chunk_size tokens, with overlap.

    Walks through the list of atoms in order, and keep a current_chunk accumulator
    For each atom:
    1. If adding the atom to current chunk would exceed chunk_size, emit curent_chunk and start new chunk with previous content from the end of current_chunk that fits within chunk overlap
    2. Add the atom to the current chunk and continue

    EX: If adding atom #2 to current chunk > chunk_size, emit current chunk as chunk #0. Start new chunk #1 with the last chunk_overlap tokens of chunk #0, then add atom #2 to chunk #1.
    """
    chunks: list[str] = []
    current: list[str] = []
    current_tokens = 0

    for atom in atoms:
        atom_tokens = count(atom)

        # If adding this atom would overflow, emit the current chunk first.
        if current and current_tokens + atom_tokens > chunk_size:
            chunk_text = "".join(current)
            chunks.append(chunk_text)

            if chunk_overlap > 0:
                overlap_text = _tail_as_text(chunk_text, chunk_overlap)
                current = [overlap_text]
                current_tokens = count(overlap_text)
            else:
                current = []
                current_tokens = 0

        current.append(atom)
        current_tokens += atom_tokens

    if current:
        chunks.append("".join(current))

    # Light cleanup: strip leading/trailing whitespace that came from separators.
    return [c.strip() for c in chunks if c.strip()]

def chunk_text(
    text: str,
    chunk_size: int = 500,
    chunk_overlap: int = 75,
    separators: list[str] | None = None,
    count: Callable[[str], int] = count_tokens,
) -> list[Chunk]:
    """Split `text` into overlapping chunks sized by token count.

    Pipeline:
    1. Raw cleaned text 
    2. _split_to_atoms -> list of atoms(strings) [atom, atom, atom, atom]
    3. _merge_atoms -> list of chunk_text (strings) [chunk_text, chunk_text, chunk_text] : near chunk_size
    4. Attach character offsets to each chunks

    Returns Chunk objects with character offsets into the original text,
    so search results can later highlight the exact source region.

    Args:
        text: cleaned document text (output of extractor.clean)
        chunk_size: target max tokens per chunk (BGE-M3 tokens)
        chunk_overlap: tokens of overlap between adjacent chunks
        separators: ordered list of strings to try splitting on
        count: function mapping a string to its token count
    """
    if not text.strip():
        return []
    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size")

    seps = separators if separators is not None else DEFAULT_SEPARATORS
    atoms = _split_to_atoms(text, chunk_size, seps, count)
    chunk_texts = _merge_atoms(atoms, chunk_size, chunk_overlap, count)

    # Attach character offsets by scanning forward through the source.
    # We allow some slack because .strip() may have shifted boundaries slightly.
    chunks: list[Chunk] = []
    cursor = 0
    for i, ct in enumerate(chunk_texts):
        idx = text.find(ct[:40], cursor) if len(ct) >= 40 else text.find(ct, cursor)
        start = idx if idx != -1 else cursor
        end = start + len(ct)
        chunks.append(Chunk(text=ct, index=i, start_char=start, end_char=end))
        cursor = max(cursor, end - 200)

    return chunks