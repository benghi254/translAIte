import mammoth from 'mammoth';

/**
 * Extracts plain text content from a given File buffer based on mime type or filename extension.
 */
export async function parseDocumentText(buffer: Buffer, filename: string): Promise<string> {
  const extension = filename.split('.').pop()?.toLowerCase() || '';

  if (extension === 'txt' || extension === 'md' || extension === 'json' || extension === 'csv' || extension === 'html' || extension === 'po') {
    return buffer.toString('utf-8');
  }

  if (extension === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (extension === 'pdf') {
    try {
      // Lazy import pdf-parse to avoid server build bundling issues
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(buffer);
      return pdfData.text;
    } catch (err: any) {
      console.error('PDF parsing error:', err);
      throw new Error(`Could not extract text from PDF: ${err.message || err}`);
    }
  }

  // Default fallback for plain text formats
  return buffer.toString('utf-8');
}

/**
 * Splits large document text into optimal chunks for parallel high-speed translation.
 */
export function chunkText(text: string, chunkSize: number = 2500): string[] {
  if (!text || text.trim().length === 0) return [];

  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + '\n\n' + para).length > chunkSize && currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
