from text_extractor import extract, clean
from chunker import chunk_text
from embedder import Embedder
import argparse
import numpy as np


def cosine_similarity(a, b):
    """
    Robust cosine similarity (safe even if embeddings are not pre-normalized)
    """
    a = np.array(a)
    b = np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def main():
    parser = argparse.ArgumentParser(
        description="Full semantic pipeline test: extract → chunk → embed → search"
    )

    parser.add_argument("path", help="Path to file")
    parser.add_argument(
        "--query",
        help="Optional semantic search query to test retrieval",
    )

    args = parser.parse_args()

    # 1. Extract + clean
    text = extract(args.path)
    cleaned_text = clean(text)

    print(f"\n📄 Extracted text length: {len(cleaned_text)} chars")

    # 2. Chunking
    chunks = chunk_text(cleaned_text)

    print(f"✂️ Total chunks created: {len(chunks)}\n")

    # 3. Embedding
    embedder = Embedder()
    embeddings = embedder.encode_documents([c.text for c in chunks])

    if not embeddings:
        raise RuntimeError("❌ No embeddings generated")

    print(f"🧠 Embedding dimension: {len(embeddings[0])}\n")

    # 4. Print chunks (sanity check)
    for i, (c, emb) in enumerate(zip(chunks, embeddings)):
        print(f"--- Chunk {i} ---")
        print(c.text[:400])
        print(f"\nEmbedding preview: {emb[:5]}")
        print("-" * 60)

    # 5. Semantic search test
    if args.query:
        print("\n🔎 Semantic Search Test Query:")
        print(f"Query: {args.query}\n")

        query_vec = embedder.encode_query(args.query)

        scored_results = []

        for i, (c, emb) in enumerate(zip(chunks, embeddings)):
            score = cosine_similarity(query_vec, emb)

            scored_results.append({
                "score": score,
                "index": i,
                "text": c.text
            })

        # Sort by similarity
        scored_results.sort(key=lambda x: x["score"], reverse=True)

        print("\n🏆 Top Matches:\n")

        for r in scored_results[:5]:
            print(f"Score: {r['score']:.4f}")
            print(f"Chunk Index: {r['index']}")
            print(r["text"][:400])
            print("-" * 50)


if __name__ == "__main__":
    main()

# Example usage:
# python test.py "Buddhist Response #1.pdf" --query "What does Buddha understand about Dharma?"