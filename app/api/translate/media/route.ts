import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { extractAudioFromMedia, cleanupTempFile } from '@/lib/ffmpeg';
import { transcribeAndTranslateMedia } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  let tempInputPath = '';
  let tempProcessedAudioPath = '';

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const targetLanguage = (formData.get('targetLanguage') as string) || 'English';
    const apiKey = (formData.get('apiKey') as string) || undefined;

    if (!file) {
      return NextResponse.json({ error: 'No audio or video file uploaded.' }, { status: 400 });
    }

    const tempDir = os.tmpdir();
    const originalExt = path.extname(file.name) || '.mp4';
    tempInputPath = path.join(tempDir, `upload_${Date.now()}_${Math.random().toString(36).substring(7)}${originalExt}`);

    const arrayBuffer = await file.arrayBuffer();
    await fs.promises.writeFile(tempInputPath, Buffer.from(arrayBuffer));

    // Extract clean audio track via FFmpeg for high speed and consistent format
    tempProcessedAudioPath = await extractAudioFromMedia(tempInputPath);

    // Call Gemini multimodal transcription & translation engine
    const result = await transcribeAndTranslateMedia(
      tempProcessedAudioPath,
      'audio/mp3',
      targetLanguage,
      apiKey
    );

    return NextResponse.json({
      success: true,
      filename: file.name,
      targetLanguage,
      transcript: result.transcript,
      translation: result.translation,
      srtSubtitles: result.srtSubtitles,
      segments: result.segments,
    });
  } catch (err: any) {
    console.error('Media Translation Endpoint Error:', err);
    return NextResponse.json(
      { error: err.message || 'Media processing failed.' },
      { status: 500 }
    );
  } finally {
    // Always clean up temporary audio/video files
    if (tempInputPath) await cleanupTempFile(tempInputPath);
    if (tempProcessedAudioPath) await cleanupTempFile(tempProcessedAudioPath);
  }
}
