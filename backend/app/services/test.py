from text_extractor import extract
from text_extractor import clean
from chunker import chunk_text
import argparse

def main():
    
    parser = argparse.ArgumentParser(description="Extract text from a file.")
    parser.add_argument("path", help="Path to the file to extract.")
    args = parser.parse_args()

    text = extract(args.path)
    cleaned_text = clean(text)

    for c in chunk_text(cleaned_text):
        print(f"Chunk Index: {c.index}")
        print(f"Chunk Text: \n {c.text}\n")




if __name__ == "__main__":
    main()