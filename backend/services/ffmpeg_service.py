import os
import tempfile
import asyncio
import uuid

async def extract_audio_from_media(input_file_bytes: bytes, original_filename: str) -> str:
    """
    Extracts 16kHz mono audio from media input using FFmpeg asynchronously for high performance.
    Returns path to temporary output MP3 file.
    """
    temp_dir = tempfile.gettempdir()
    ext = os.path.splitext(original_filename)[1] or '.mp4'
    input_path = os.path.join(temp_dir, f"input_{uuid.uuid4().hex}{ext}")
    output_path = os.path.join(temp_dir, f"audio_{uuid.uuid4().hex}.mp3")

    with open(input_path, 'wb') as f:
        f.write(input_file_bytes)

    cmd = [
        'ffmpeg', '-y',
        '-i', input_path,
        '-vn', '-ar', '16000', '-ac', '1', '-ab', '64k',
        output_path
    ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            raise RuntimeError(f"FFmpeg failed with exit code {proc.returncode}: {stderr.decode('utf-8', errors='ignore')}")

        return output_path
    finally:
        # Clean up temporary input media file
        if os.path.exists(input_path):
            try:
                os.remove(input_path)
            except Exception:
                pass


def cleanup_temp_file(file_path: str):
    """
    Safely delete temporary audio file.
    """
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass
