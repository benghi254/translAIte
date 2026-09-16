import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execPromise = promisify(exec);

export async function isFFmpegAvailable(): Promise<boolean> {
  try {
    const { stdout } = await execPromise('ffmpeg -version');
    return stdout.includes('ffmpeg version');
  } catch {
    return false;
  }
}

/**
 * Extracts mono 16kHz MP3 audio track from any video or audio file for optimal transcription.
 */
export async function extractAudioFromMedia(inputFilePath: string): Promise<string> {
  const tempDir = os.tmpdir();
  const outputFilePath = path.join(tempDir, `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`);

  // ffmpeg command: extract audio (-vn), set audio sampling rate to 16kHz (-ar 16000), mono (-ac 1), output mp3 format
  const command = `ffmpeg -y -i "${inputFilePath}" -vn -ar 16000 -ac 1 -ab 64k "${outputFilePath}"`;

  try {
    await execPromise(command);
    if (!fs.existsSync(outputFilePath)) {
      throw new Error('Failed to generate audio output file.');
    }
    return outputFilePath;
  } catch (error: any) {
    console.error('FFmpeg extraction error:', error);
    throw new Error(`FFmpeg media processing failed: ${error.message || error}`);
  }
}

/**
 * Cleanup temporary file safely.
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    if (filePath && fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (e) {
    console.warn('Failed to delete temp file:', filePath, e);
  }
}
