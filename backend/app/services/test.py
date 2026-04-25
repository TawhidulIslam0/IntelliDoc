from text_extractor import extract, clean
from chunker import chunk_text
from embedder import Embedder
import argparse


def main():
    parser = argparse.ArgumentParser(description="Extract, chunk, and embed a file.")
    parser.add_argument("path", help="Path to the file to extract.")
    args = parser.parse_args()

    text = extract(args.path)
    cleaned_text = clean(text)
    chunks = chunk_text(cleaned_text)

    embedder = Embedder()

    embeddings = embedder.encode_documents([c.text for c in chunks])

    for c, emb in zip(chunks, embeddings):
        print(f"Chunk Index: {c.index}")
        print(f"Chunk Text:\n{c.text}\n")
        print(f"Embedding length: {len(emb)}")
        print(f"Embedding preview: {emb[:5]}\n")


if __name__ == "__main__":
    main()