import { NextRequest, NextResponse } from 'next/server';
import { parseDocumentText, chunkText } from '@/lib/documentParser';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const targetLanguage = formData.get('targetLanguage') as string || 'English';

    if (!file) {
      return NextResponse.json({ error: 'No document file uploaded.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = file.name;

    const extractedText = await parseDocumentText(buffer, filename);

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json({ error: 'Could not extract readable text from document.' }, { status: 400 });
    }

    const chunks = chunkText(extractedText);

    return NextResponse.json({
      filename,
      extractedText,
      totalChunks: chunks.length,
      chunks,
      targetLanguage,
    });
  } catch (error: any) {
    console.error('Document parsing route error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process document.' }, { status: 500 });
  }
}
