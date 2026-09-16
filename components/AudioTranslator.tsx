'use client';

import React, { useState, useRef } from 'react';
import {
  Mic,
  Upload,
  Globe,
  Play,
  Pause,
  Volume2,
  VolumeX,
  FileText,
  Download,
  Copy,
  Check,
  Zap,
  Music,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { LANGUAGES } from '@/lib/languages';
import { speakText, stopSpeaking } from '@/lib/tts';

interface AudioTranslatorProps {
  apiKey?: string;
  defaultTargetLang: string;
}

interface Segment {
  start: string;
  end: string;
  original: string;
  translated: string;
}

export function AudioTranslator({ apiKey, defaultTargetLang }: AudioTranslatorProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState(defaultTargetLang);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [translation, setTranslation] = useState('');
  const [srtSubtitles, setSrtSubtitles] = useState('');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeTab, setActiveTab] = useState<'translation' | 'transcript' | 'subtitles'>('translation');

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    // Reset output state
    setTranscript('');
    setTranslation('');
    setSrtSubtitles('');
    setSegments([]);
  };

  const processAudioTranslation = async () => {
    if (!audioFile) return;

    setIsProcessing(true);
    stopSpeaking();
    setIsPlayingTTS(false);

    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('targetLanguage', targetLang);
      if (apiKey) formData.append('apiKey', apiKey);

      const res = await fetch('/api/translate/media', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audio translation failed');

      setTranscript(data.transcript);
      setTranslation(data.translation);
      setSrtSubtitles(data.srtSubtitles);
      setSegments(data.segments || []);
    } catch (err: any) {
      alert(`Audio Processing Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
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

  const handleDownloadSRT = () => {
    if (!srtSubtitles) return;
    const blob = new Blob([srtSubtitles], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${audioFile?.name.replace(/\.[^/.]+$/, '') || 'audio'}_${targetLang}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyTranslation = () => {
    if (!translation) return;
    navigator.clipboard.writeText(translation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Upload & Control Header */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="audio/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-blue-600/20"
          >
            <Upload className="w-4 h-4" />
            <span>{audioFile ? 'Change Audio File' : 'Upload Audio File'}</span>
          </button>

          {audioFile && (
            <div className="flex items-center space-x-2 text-sm text-slate-300 bg-slate-950 px-3 py-1.5 border border-slate-800 rounded-lg">
              <Music className="w-4 h-4 text-indigo-400" />
              <span className="font-medium max-w-[200px] truncate">{audioFile.name}</span>
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
            onClick={processAudioTranslation}
            disabled={!audioFile || isProcessing}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/20"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                <span>Processing Audio...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Transcribe & Translate</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Audio Player Preview */}
      {audioUrl && (
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">{audioFile?.name}</p>
              <p className="text-xs text-slate-400">
                {(audioFile?.size ? (audioFile.size / (1024 * 1024)).toFixed(2) : 0)} MB
              </p>
            </div>
          </div>

          <audio
            ref={audioPlayerRef}
            src={audioUrl}
            controls
            className="w-full sm:w-auto h-10 accent-blue-500"
          />
        </div>
      )}

      {/* Results View */}
      {(translation || transcript || isProcessing) && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-950/40">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('translation')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === 'translation'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Translated Speech ({targetLang})
              </button>
              <button
                onClick={() => setActiveTab('transcript')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === 'transcript'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Original Transcription
              </button>
              <button
                onClick={() => setActiveTab('subtitles')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeTab === 'subtitles'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                SRT Timed Subtitles
              </button>
            </div>

            {translation && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePlayTTS}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
                >
                  {isPlayingTTS ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Stop Voice</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Listen Dubbed Audio</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadSRT}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .SRT</span>
                </button>
              </div>
            )}
          </div>

          {/* Tab Content */}
          <div className="p-6 min-h-[300px]">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                  <Zap className="w-5 h-5 text-amber-400 absolute top-3 left-3" />
                </div>
                <div>
                  <p className="text-slate-200 font-semibold text-sm">Translating audio file...</p>
                  <p className="text-slate-400 text-xs mt-1">Extracting speech & generating synchronized timestamps</p>
                </div>
              </div>
            ) : activeTab === 'translation' ? (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={handleCopyTranslation}
                    className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy translation'}</span>
                  </button>
                </div>
                <div className="p-5 bg-slate-950/40 border border-slate-800/80 rounded-xl text-slate-100 font-medium text-base leading-relaxed whitespace-pre-wrap">
                  {translation}
                </div>

                {segments.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Timed Speech Segments ({segments.length})
                    </h4>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                      {segments.map((seg, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-slate-950/60 border border-slate-800/60 rounded-xl gap-2"
                        >
                          <span className="px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md font-mono text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {seg.start} → {seg.end}
                          </span>
                          <div className="flex-1 text-xs text-slate-200">
                            <p className="font-semibold">{seg.translated}</p>
                            {seg.original && <p className="text-slate-400 italic text-[11px]">{seg.original}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === 'transcript' ? (
              <div className="p-5 bg-slate-950/40 border border-slate-800/80 rounded-xl text-slate-300 font-normal text-sm leading-relaxed whitespace-pre-wrap">
                {transcript}
              </div>
            ) : (
              <div className="p-5 bg-slate-950/40 border border-slate-800/80 rounded-xl font-mono text-xs text-emerald-400 leading-relaxed whitespace-pre-wrap">
                {srtSubtitles}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
