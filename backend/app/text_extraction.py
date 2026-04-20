import json
import io

from bs4 import BeautifulSoup
from pypdf import PdfReader
from docx import Document

def extract_text(file_bytes: bytes, doc_type: str, file_name: str) -> str:

    # 1) .idoc
    if file_name.endswith(".idoc"):
        data = json.loads(file_bytes.decode("utf-8"))
        pages = data.get("pages", [])
        parts = []
        for page_html in pages:
            # BeautifulSoup retrieves text by removing HTML tags.
            soup = BeautifulSoup(page_html, "html.parser")
            parts.append(soup.get_text(separator="\n")) # Avoids merging words together.
        return "\n\n".join(parts)

    # 2) PDF (text only)
    elif doc_type == "application/pdf" or file_name.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(file_bytes))
        # \n\n for paragraph breaks
        return "\n\n".join(page.extract_text() or "" for page in reader.pages)

    # 3) DOCX
    elif doc_type in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ) or file_name.endswith(".docx"):
        doc = Document(io.BytesIO(file_bytes))
        return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())

    # 4) TXT
    elif doc_type == "text/plain" or file_name.endswith(".txt"):
        return file_bytes.decode("utf-8", errors="ignore") # Ignore crashing for non-UTF-8 chars.

    return "" # Skip unsupported type.
