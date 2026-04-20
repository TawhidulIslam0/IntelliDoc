CHUNK_SIZE = 800      
CHUNK_OVERLAP = 100

def chunk_text(text: str) -> list[str]:
    text = text.strip()
    if len(text) <= CHUNK_SIZE: # Fits the chunk size.
        return [text] if text else []

    # 1) Largest to smallest separators.
    sep = next((s for s in ["\n\n", "\n", ". ", " ", ""] if s in text or s == ""), "")
    parts = text.split(sep) if sep else list(text) # Split text

    chunks, current = [], ""

    for part in parts:
        # 2) Handle parts > CHUNK_SIZE
        if len(part) > CHUNK_SIZE:
            if current: chunks.append(current)
            chunks.extend(chunk_text(part)) # Recursive call to chunk_text
            current = "" # Reset current
            continue

        # 3) Check for CHUNK_SIZE overflow
        extra_len = len(part)
        if current:
            extra_len += len(sep) # Add sep between old and new text

        if len(current) + extra_len > CHUNK_SIZE: # If adding would overflow
            if current: 
                chunks.append(current) # Save current chunk
            
            # Bridge context by overlapping
            overlap = current[-CHUNK_OVERLAP:]
            if " " in overlap:
                # Find nearest word.
                overlap = overlap[overlap.find(" ") + 1:]
            
            # Add overlap if possible
            if len(overlap) + len(sep) + len(part) <= CHUNK_SIZE:
                current = overlap
            else:
                current = ""

        # 4) Concatenates text + sep
        if current:
            current += sep + part
        else:
            current = part

    # 5) Append remaining chunk.
    if current: 
        chunks.append(current)
    
    return chunks