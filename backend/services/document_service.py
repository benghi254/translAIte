import io
import mimetypes
from typing import List, Optional
import docx
import pypdf
from services.gemini_service import extract_text_from_image

IMAGE_EXTENSIONS = {
    'webp': 'image/webp',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    'tif': 'image/tiff',
    'svg': 'image/svg+xml',
    'heic': 'image/heic',
    'heif': 'image/heif',
    'ico': 'image/x-icon',
    'avif': 'image/avif',
}

TEXT_EXTENSIONS = {
    'txt', 'md', 'json', 'csv', 'html', 'xml', 'po', 'log',
    'yaml', 'yml', 'tsv', 'rtf', 'ini', 'js', 'ts', 'py', 'css'
}


async def extract_text_from_file(
    file_bytes: bytes,
    filename: str,
    custom_api_key: Optional[str] = None
) -> str:
    """
    High-speed text extraction for ALL files uploaded by users:
    - Images (.webp, .png, .jpg, .jpeg, .gif, .bmp, .tiff, etc.): Uses Gemini Vision OCR.
    - Word (.docx): Uses python-docx.
    - PDF (.pdf): Uses pypdf + Gemini OCR fallback for scanned pages.
    - Text files (.txt, .md, .json, .csv, etc.): Direct UTF-8 decoding.
    - Universal fallback: Uses Gemini Multimodal Vision/OCR to extract text from any file.
    """
    ext = filename.split('.')[-1].lower() if '.' in filename else ''
    
    # 1. Handle Image formats (.webp, .png, .jpg, etc.)
    if ext in IMAGE_EXTENSIONS:
        mime_type = IMAGE_EXTENSIONS[ext]
        return await extract_text_from_image(file_bytes, mime_type, custom_api_key)

    # Check mime type if ext wasn't matched directly
    detected_mime = mimetypes.guess_type(filename)[0] or ''
    if detected_mime.startswith('image/'):
        return await extract_text_from_image(file_bytes, detected_mime, custom_api_key)

    # 2. Handle DOCX
    if ext == 'docx':
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            full_text = [p.text for p in doc.paragraphs if p.text]
            extracted = '\n'.join(full_text)
            if extracted.strip():
                return extracted
        except Exception as e:
            print(f"DOCX extraction warning for {filename}: {e}")

    # 3. Handle PDF
    if ext == 'pdf':
        try:
            pdf_reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text_parts = []
            for page in pdf_reader.pages:
                t = page.extract_text()
                if t:
                    text_parts.append(t)
            extracted = '\n\n'.join(text_parts)
            if extracted.strip():
                return extracted
        except Exception as e:
            print(f"PDF extraction warning for {filename}: {e}")

    # 4. Handle Standard Text & Source Code files
    if ext in TEXT_EXTENSIONS or detected_mime.startswith('text/'):
        try:
            decoded = file_bytes.decode('utf-8', errors='ignore')
            if decoded.strip():
                return decoded
        except Exception:
            pass

    # 5. Universal Fallback: Attempt plain text decoding first
    try:
        decoded = file_bytes.decode('utf-8')
        if decoded.strip() and all(ord(c) < 65534 for c in decoded[:200]):
            return decoded
    except Exception:
        pass

    # 6. Final Multimodal OCR / File Analysis Fallback using Gemini Vision
    try:
        fallback_mime = detected_mime or 'image/webp'
        return await extract_text_from_image(file_bytes, fallback_mime, custom_api_key)
    except Exception as err:
        print(f"Universal fallback extraction failed for {filename}: {err}")
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
