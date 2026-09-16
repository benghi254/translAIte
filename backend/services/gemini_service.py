import os
import json
import re
from typing import AsyncGenerator, Dict, Any, Optional
from google import genai
from google.genai import types

def get_client(custom_api_key: Optional[str] = None) -> genai.Client:
    api_key = custom_api_key or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("Gemini API Key is missing. Please set GEMINI_API_KEY environment variable or supply it in the request.")
    return genai.Client(api_key=api_key)


async def stream_translation(
    text: str,
    target_language: str,
    custom_api_key: Optional[str] = None
) -> AsyncGenerator[str, None]:
    """
    Streams translated text token-by-token from Gemini 1.5 Flash.
    """
    client = get_client(custom_api_key)

    prompt = f"""You are a professional, accurate, and high-speed translator.
Translate the following text accurately into {target_language}.
Maintain the original format, line breaks, markdown, tone, and context.
Provide ONLY the translated output with no conversational filler or commentary.

Text to translate:
\"\"\"
{text}
\"\"\""""

    response = client.models.generate_content_stream(
        model='gemini-1.5-flash',
        contents=prompt
    )

    for chunk in response:
        if chunk.text:
            yield chunk.text


async def transcribe_and_translate_media(
    audio_file_path: str,
    target_language: str,
    custom_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Transcribes audio/video media and translates into target language using Gemini 1.5 Flash multimodal input.
    Generates transcript, translation, SRT subtitles, and timed segments.
    """
    client = get_client(custom_api_key)

    audio_file = client.files.upload(file=audio_file_path)

    prompt = f"""Analyze this audio file completely.
1. Transcribe the original speech accurately into text.
2. Translate the speech into {target_language}.
3. Generate timed subtitle segments with timestamp ranges in standard SRT format (00:00:00,000 --> 00:00:00,000).

Return the response STRICTLY as a JSON object with the following schema:
{{
  "transcript": "Full original language transcription here",
  "translation": "Full target language translation here",
  "srtSubtitles": "1\\n00:00:00,000 --> 00:00:03,000\\n[Translated Subtitle text]\\n\\n2\\n...",
  "segments": [
    {{
      "start": "00:00:00,000",
      "end": "00:00:03,000",
      "original": "Original spoken phrase",
      "translated": "Translated phrase in {target_language}"
    }}
  ]
}}

DO NOT wrap response in extra commentary, only output valid JSON."""

    response = client.models.generate_content(
        model='gemini-1.5-flash',
        contents=[audio_file, prompt]
    )

    # Clean up file from Gemini storage
    try:
        client.files.delete(name=audio_file.name)
    except Exception:
        pass

    text_response = response.text or ""

    try:
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text_response)
        raw_json = json_match.group(1).strip() if json_match else text_response.strip()
        parsed = json.loads(raw_json)
        return {
            "transcript": parsed.get("transcript", ""),
            "translation": parsed.get("translation", ""),
            "srtSubtitles": parsed.get("srtSubtitles", ""),
            "segments": parsed.get("segments", []),
        }
    except Exception as err:
        print("Failed to parse JSON response from Gemini:", text_response, err)
        return {
            "transcript": text_response,
            "translation": text_response,
            "srtSubtitles": f"1\n00:00:00,000 --> 00:00:10,000\n{text_response}",
            "segments": [
                {
                    "start": "00:00:00,000",
                    "end": "00:00:10,000",
                    "original": "",
                    "translated": text_response
                }
            ]
        }
