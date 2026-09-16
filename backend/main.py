import json
import os
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks

# Automatically load environment variables from .env / .env.local
load_dotenv()
load_dotenv('.env.local')
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

from services.document_service import extract_text_from_file, chunk_text
from services.ffmpeg_service import extract_audio_from_media, cleanup_temp_file
from services.gemini_service import stream_translation, transcribe_and_translate_media

app = FastAPI(
    title="translAIte High-Performance Backend API",
    description="Fast async backend engine for document, audio, and video translation powered by Gemini 1.5 Flash.",
    version="1.0.0"
)

# Enable CORS for frontend origin access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TranslationStreamRequest(BaseModel):
    text: str
    targetLanguage: str
    apiKey: Optional[str] = None

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "translAIte-backend"}

@app.post("/api/translate/document")
async def translate_document(
    file: UploadFile = File(...),
    targetLanguage: str = Form("English"),
    apiKey: Optional[str] = Form(None)
):
    """
    Parses any document, image (.webp, .png, .jpg), or file uploaded by user and extracts readable text.
    """
    try:
        content = await file.read()
        extracted_text = await extract_text_from_file(content, file.filename or "file.webp", apiKey)
        
        if not extracted_text or not extracted_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract readable text from uploaded file.")
            
        chunks = chunk_text(extracted_text)
        
        return {
            "filename": file.filename,
            "extractedText": extracted_text,
            "totalChunks": len(chunks),
            "chunks": chunks,
            "targetLanguage": targetLanguage
        }
    except HTTPException:
        raise
    except Exception as e:
        print("Document route error:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/translate/stream")
async def translate_stream(request: TranslationStreamRequest):
    """
    Streams translation using Server-Sent Events (SSE).
    """
    if not request.text or not request.targetLanguage:
        raise HTTPException(status_code=400, detail="Text and targetLanguage are required.")

    async def event_generator():
        try:
            async for chunk in stream_translation(request.text, request.targetLanguage, request.apiKey):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as err:
            yield f"data: {json.dumps({'error': str(err)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/translate/media")
async def translate_media(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    targetLanguage: str = Form("English"),
    apiKey: Optional[str] = Form(None)
):
    """
    Extracts audio via FFmpeg and performs multimodal transcription & translation.
    """
    temp_audio_path = ""
    try:
        content = await file.read()
        temp_audio_path = await extract_audio_from_media(content, file.filename or "media.mp4")
        
        # Schedule cleanup after response finishes
        background_tasks.add_task(cleanup_temp_file, temp_audio_path)

        result = await transcribe_and_translate_media(temp_audio_path, targetLanguage, apiKey)

        return {
            "success": True,
            "filename": file.filename,
            "targetLanguage": targetLanguage,
            "transcript": result["transcript"],
            "translation": result["translation"],
            "srtSubtitles": result["srtSubtitles"],
            "segments": result["segments"]
        }
    except Exception as err:
        if temp_audio_path:
            cleanup_temp_file(temp_audio_path)
        print("Media route error:", err)
        raise HTTPException(status_code=500, detail=str(err))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
