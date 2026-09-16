'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Upload,
  Globe,
  Play,
  Pause,
  Volume2,
  Download,
  Copy,
  Check,
  Zap,
  Sparkles,
  RefreshCw,
  Subtitles,
  Film,
  Clock,
  Layers,
} from 'lucide-react';
import { LANGUAGES } from '@/lib/languages';
import { API_BASE_URL } from '@/lib/apiConfig';
import { speakText, stopSpeaking } from '@/lib/tts';

interface VideoTranslatorProps {
  apiKey?: string;
  defaultTargetLang: string;
}

interface Segment {
  start: string;
  end: string;
  original: string;
  translated: string;
}

// Helper to convert SRT timestamp "00:01:23,456" into total seconds
function timeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const cleaned = timeStr.replace(',', '.').trim();
  const parts = cleaned.split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
}

export function VideoTranslator({ apiKey, defaultTargetLang }: VideoTranslatorProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState(defaultTargetLang);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [translation, setTranslation] = useState('');
  const [srtSubtitles, setSrtSubtitles] = useState('');
  const [segments, setSegments] = useState<Segment[]>([]);

  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [showSubtitlesOnVideo, setShowSubtitlesOnVideo] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    // Reset results
    setTranscript('');
    setTranslation('');
    setSrtSubtitles('');
    setSegments([]);
    setCurrentSubtitle('');
  };

  const processVideoTranslation = async () => {
    if (!videoFile) return;

    setIsProcessing(true);
    stopSpeaking();
    setIsPlayingTTS(false);

    try {
      const formData = new FormData();
      formData.append('file', videoFile);
      formData.append('targetLanguage', targetLang);
      if (apiKey) formData.append('apiKey', apiKey);

      const res = await fetch(`${API_BASE_URL}/api/translate/media`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Video translation failed');

      setTranscript(data.transcript);
      setTranslation(data.translation);
      setSrtSubtitles(data.srtSubtitles);
      setSegments(data.segments || []);
    } catch (err: any) {
      alert(`Video Processing Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Sync subtitle text with video playback timestamp
  const handleTimeUpdate = () => {
    if (!videoPlayerRef.current || segments.length === 0) return;
    const time = videoPlayerRef.current.currentTime;
    setCurrentTime(time);

    const activeSeg = segments.find((seg) => {
      const startSec = timeToSeconds(seg.start);
      const endSec = timeToSeconds(seg.end);
      return time >= startSec && time <= endSec;
    });

    if (activeSeg) {
      setCurrentSubtitle(activeSeg.translated);
    } else {
      setCurrentSubtitle('');
    }
  };

  const jumpToTime = (startStr: string) => {
    if (!videoPlayerRef.current) return;
    const sec = timeToSeconds(startStr);
    videoPlayerRef.current.currentTime = sec;
    videoPlayerRef.current.play();
  };

  const handleDownloadSRT = () => {
    if (!srtSubtitles) return;
    const blob = new Blob([srtSubtitles], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoFile?.name.replace(/\.[^/.]+$/, '') || 'video'}_${targetLang}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePlayTTS = () => {
    if (!translation) return;

    if (isPlayingTTS) {
      stopSpeaking();
      setIsPlayingTTS(false);
    } else {
      setIsPlayingTTS(true);
      const targetLangObj = LANGUAGES.find((l) => l.name.toLowerCase() === targetLang.toLowerCase());
      const langCode = targetLangObj ? targetLangObj.code : 'en';

      speakText(
        translation,
        langCode,
        () => setIsPlayingTTS(false),
        () => setIsPlayingTTS(false)
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Header */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-blue-600/20"
          >
            <Upload className="w-4 h-4" />
            <span>{videoFile ? 'Change Video File' : 'Upload Video File'}</span>
          </button>

          {videoFile && (
            <div className="flex items-center space-x-2 text-sm text-slate-300 bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-lg">
              <Film className="w-4 h-4 text-purple-400" />
              <span className="font-medium max-w-[200px] truncate">{videoFile.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <Globe className="w-4 h-4 text-blue-400" />
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="bg-transparent text-slate-100 text-sm focus:outline-none font-medium"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.name} className="bg-slate-900 text-slate-100">
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={processVideoTranslation}
            disabled={!videoFile || isProcessing}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-purple-600/20"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                <span>FFmpeg Processing Video...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Translate Video</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Video Player + Timed Subtitle Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Video Player */}
        <div className="lg:col-span-7 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
            {videoUrl ? (
              <>
                <video
                  ref={videoPlayerRef}
                  src={videoUrl}
                  onTimeUpdate={handleTimeUpdate}
                  controls
                  className="w-full h-full object-contain"
                />

                {/* Subtitle Overlay directly on video */}
                {showSubtitlesOnVideo && currentSubtitle && (
                  <div className="absolute bottom-12 left-0 right-0 px-6 text-center pointer-events-none z-30">
                    <span className="inline-block bg-black/85 text-white font-bold text-sm sm:text-base px-4 py-1.5 rounded-lg border border-white/10 shadow-2xl backdrop-blur-sm">
                      {currentSubtitle}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-600 space-y-3 p-8 text-center">
                <Video className="w-12 h-12 stroke-[1.5]" />
                <p className="text-sm">Upload an MP4, MOV, or WEBM video file to preview and translate</p>
              </div>
            )}
          </div>

          {videoUrl && (
            <div className="flex items-center justify-between px-5 py-3 bg-slate-950/60 border-t border-slate-800">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSubtitlesOnVideo}
                  onChange={(e) => setShowSubtitlesOnVideo(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-0"
                />
                <Subtitles className="w-4 h-4 text-blue-400" />
                <span>Overlaid Subtitles on Video</span>
              </label>

              {translation && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePlayTTS}
                    className="flex items-center space-x-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isPlayingTTS ? 'Stop Dubbing' : 'Voice Dubbing'}</span>
                  </button>

                  <button
                    onClick={handleDownloadSRT}
                    className="flex items-center space-x-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export SRT</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timed Segments Side Panel */}
        <div className="lg:col-span-5 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden min-h-[450px]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/40">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Subtitle Timeline ({segments.length} chunks)
            </span>
          </div>

          <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[500px]">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
                <p className="text-sm font-semibold text-slate-300">Extracting video audio & translating...</p>
                <p className="text-xs text-slate-500">FFmpeg extracting audio stream locally</p>
              </div>
            ) : segments.length > 0 ? (
              segments.map((seg, i) => (
                <div
                  key={i}
                  onClick={() => jumpToTime(seg.start)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    currentSubtitle === seg.translated
                      ? 'bg-purple-950/40 border-purple-500/50 shadow-md ring-1 ring-purple-500/30'
                      : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {seg.start} → {seg.end}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Click to Seek
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-100">{seg.translated}</p>
                  {seg.original && (
                    <p className="text-xs text-slate-400 italic mt-1">{seg.original}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-center px-4">
                <Subtitles className="w-10 h-10 mb-2 stroke-[1.2]" />
                <p className="text-sm">No translated subtitles yet.</p>
                <p className="text-xs text-slate-600 mt-1">
                  Upload a video and click "Translate Video" to generate live subtitle tracks.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
