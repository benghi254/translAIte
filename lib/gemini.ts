import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

export function getGeminiClient(customApiKey?: string) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Gemini API Key is missing. Please set GEMINI_API_KEY in .env.local or provide it in the app settings.'
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Fast streaming translation of text into target language.
 */
export async function* translateTextStream(
  text: string,
  targetLanguage: string,
  customApiKey?: string
) {
  const genAI = getGeminiClient(customApiKey);
  // Using flash model for high speed
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are a professional, accurate, and high-speed translator.
Translate the following text accurately into ${targetLanguage}.
Maintain the original format, line breaks, markdown, tone, and context.
Provide ONLY the translated output with no conversational filler or commentary.

Text to translate:
"""
${text}
"""`;

  const responseStream = await model.generateContentStream(prompt);

  for await (const chunk of responseStream.stream) {
    const chunkText = chunk.text();
    if (chunkText) {
      yield chunkText;
    }
  }
}

/**
 * Fast chunk translation in parallel.
 */
export async function translateTextBatch(
  chunks: string[],
  targetLanguage: string,
  customApiKey?: string
): Promise<string[]> {
  const genAI = getGeminiClient(customApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const promises = chunks.map(async (chunk) => {
    const prompt = `Translate the following segment into ${targetLanguage}. Maintain formatting and return ONLY the translated text:

${chunk}`;

    const res = await model.generateContent(prompt);
    return res.response.text();
  });

  return Promise.all(promises);
}

export interface AudioTranslationResult {
  transcript: string;
  translation: string;
  srtSubtitles: string;
  segments: Array<{
    start: string;
    end: string;
    original: string;
    translated: string;
  }>;
}

/**
 * Transcribes and translates audio/video media file directly using Gemini Multimodal input.
 */
export async function transcribeAndTranslateMedia(
  audioFilePath: string,
  mimeType: string,
  targetLanguage: string,
  customApiKey?: string
): Promise<AudioTranslationResult> {
  const genAI = getGeminiClient(customApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const audioBuffer = fs.readFileSync(audioFilePath);
  const base64Audio = audioBuffer.toString('base64');

  const prompt = `Analyze this audio file completely.
1. Transcribe the original speech accurately into text.
2. Translate the speech into ${targetLanguage}.
3. Generate timed subtitle segments with timestamp ranges in standard SRT format (00:00:00,000 --> 00:00:00,000).

Return the response STRICTLY as a JSON object with the following schema:
{
  "transcript": "Full original language transcription here",
  "translation": "Full target language translation here",
  "srtSubtitles": "1\\n00:00:00,000 --> 00:00:03,000\\n[Translated Subtitle text]\\n\\n2\\n...",
  "segments": [
    {
      "start": "00:00:00,000",
      "end": "00:00:03,000",
      "original": "Original spoken phrase",
      "translated": "Translated phrase in ${targetLanguage}"
    }
  ]
}

DO NOT wrap response in extra commentary, only output valid JSON.`;

  const audioPart = {
    inlineData: {
      data: base64Audio,
      mimeType: mimeType || 'audio/mp3',
    },
  };

  const response = await model.generateContent([prompt, audioPart]);
  const textResponse = response.response.text();

  try {
    // Extract JSON block if wrapped in markdown code fence
    const jsonMatch = textResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, textResponse];
    const rawJson = jsonMatch[1] ? jsonMatch[1].trim() : textResponse.trim();
    const parsed = JSON.parse(rawJson);

    return {
      transcript: parsed.transcript || '',
      translation: parsed.translation || '',
      srtSubtitles: parsed.srtSubtitles || '',
      segments: parsed.segments || [],
    };
  } catch (err) {
    console.error('Failed to parse JSON response from Gemini:', textResponse);
    return {
      transcript: textResponse,
      translation: textResponse,
      srtSubtitles: `1\n00:00:00,000 --> 00:00:10,000\n${textResponse}`,
      segments: [
        {
          start: '00:00:00,000',
          end: '00:00:10,000',
          original: '',
          translated: textResponse,
        },
      ],
    };
  }
}
