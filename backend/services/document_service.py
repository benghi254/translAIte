import io
from typing import List
import docx
import pypdf

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """
    High-speed extraction of text content from document files.
    """
    ext = filename.split('.')[-1].lower() if '.' in filename else ''
    
    if ext in ['txt', 'md', 'json', 'csv', 'html', 'po']:
        return file_bytes.decode('utf-8', errors='ignore')
        
    if ext == 'docx':
        doc = docx.Document(io.BytesIO(file_bytes))
        full_text = [p.text for p in doc.paragraphs]
        return '\n'.join(full_text)
        
    if ext == 'pdf':
        pdf_reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        text_parts = []
        for page in pdf_reader.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t)
        return '\n\n'.join(text_parts)
        
    # Fallback default
    return file_bytes.decode('utf-8', errors='ignore')


def chunk_text(text: str, max_chunk_size: int = 2500) -> List[str]:
    """
    Splits text into paragraph-aware chunks for parallel translation.
    """
    if not text or not text.strip():
        return []
        
    paragraphs = text.split('\n\n')
    chunks: List[str] = []
    current_chunk = ''
    
    for para in paragraphs:
        if len(current_chunk) + len(para) + 2 > max_chunk_size and current_chunk.strip():
            chunks.append(current_chunk.strip())
            current_chunk = para
        else:
            current_chunk = f"{current_chunk}\n\n{para}" if current_chunk else para
            
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
        
    return chunks
