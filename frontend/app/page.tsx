'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { SettingsModal } from '@/components/SettingsModal';
import { DocumentTranslator } from '@/components/DocumentTranslator';
import { AudioTranslator } from '@/components/AudioTranslator';
import { VideoTranslator } from '@/components/VideoTranslator';
import { FileText, Mic, Video, Zap, Shield, Sparkles, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'document' | 'audio' | 'video'>('document');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [defaultTargetLang, setDefaultTargetLang] = useState('Spanish');

  useEffect(() => {
    const savedKey = localStorage.getItem('translAIte_gemini_key') || '';
    const savedLang = localStorage.getItem('translAIte_default_lang') || 'Spanish';
    setApiKey(savedKey);
    setDefaultTargetLang(savedLang);
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('translAIte_gemini_key', key);
  };

  const handleSaveDefaultLang = (lang: string) => {
    setDefaultTargetLang(lang);
    localStorage.setItem('translAIte_default_lang', lang);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar onOpenSettings={() => setIsSettingsOpen(true)} hasApiKey={Boolean(apiKey)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto pt-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Powered by Gemini AI & Local FFmpeg Acceleration</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            Translate Anything in{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Seconds
            </span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg">
            High-speed translation system for documents, spoken audio, and video content across 50+ languages with synchronized subtitles and instant dubbing.
          </p>
        </div>

        {/* Multimodal Navigation Tabs */}
        <div className="flex items-center justify-center">
          <div className="inline-flex p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg gap-1">
            <button
              onClick={() => setActiveTab('document')}
              className={`flex items-center space-x-2.5 px-6 py-3 rounded-xl font-bold text-sm transition ${
                activeTab === 'document'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Document</span>
            </button>

            <button
              onClick={() => setActiveTab('audio')}
              className={`flex items-center space-x-2.5 px-6 py-3 rounded-xl font-bold text-sm transition ${
                activeTab === 'audio'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>Audio</span>
            </button>

            <button
              onClick={() => setActiveTab('video')}
              className={`flex items-center space-x-2.5 px-6 py-3 rounded-xl font-bold text-sm transition ${
                activeTab === 'video'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Video</span>
            </button>
          </div>
        </div>

        {/* Tab Components */}
        <div className="pt-2">
          {activeTab === 'document' && (
            <DocumentTranslator apiKey={apiKey} defaultTargetLang={defaultTargetLang} />
          )}

          {activeTab === 'audio' && (
            <AudioTranslator apiKey={apiKey} defaultTargetLang={defaultTargetLang} />
          )}

          {activeTab === 'video' && (
            <VideoTranslator apiKey={apiKey} defaultTargetLang={defaultTargetLang} />
          )}
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-900">
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-start space-x-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">High Speed Engine</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Streaming SSE and parallel text chunking deliver instant real-time results.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-start space-x-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">Format Preservation</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Keeps line breaks, markdown, DOCX structure, and SRT video subtitle alignment.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-start space-x-3">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">Local Media Extraction</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Uses local FFmpeg 8.1 for fast audio extraction with zero third-party upload delay.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          translAIte &copy; {new Date().getFullYear()} &bull; Fast Multimodal Translation System
        </div>
      </footer>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        defaultLang={defaultTargetLang}
        onSaveDefaultLang={handleSaveDefaultLang}
      />
    </div>
  );
}
