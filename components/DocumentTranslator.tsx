'use client';

import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Globe,
  Sparkles,
  Copy,
  Download,
  Check,
  RefreshCw,
  Zap,
  ArrowRight,
  FileCode,
  FileDown,
} from 'lucide-react';
import { LANGUAGES } from '@/lib/languages';

interface DocumentTranslatorProps {
  apiKey?: string;
  defaultTargetLang: string;
}

export function DocumentTranslator({ apiKey, defaultTargetLang }: DocumentTranslatorProps) {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [targetLang, setTargetLang] = useState(defaultTargetLang);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetLanguage', targetLang);

      const res = await fetch('/api/translate/document', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Document parsing failed');

      setInputText(data.extractedText);
      // Auto trigger translation for parsed document
      startTranslation(data.extractedText, targetLang);
    } catch (err: any) {
      alert(`Error loading document: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const startTranslation = async (textToTranslate: string = inputText, lang: string = targetLang) => {
    if (!textToTranslate || textToTranslate.trim().length === 0) return;

    setIsTranslating(true);
    setTranslatedText('');
    setProgress({ current: 0, total: 100 });

    try {
      const res = await fetch('/api/translate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToTranslate,
          targetLanguage: lang,
          apiKey,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Translation request failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Response stream reader unavailable');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.chunk) {
                accumulated += parsed.chunk;
                setTranslatedText(accumulated);
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch {
              // Ignore partial JSON parse errors
            }
          }
        }
      }
    } catch (err: any) {
      alert(`Translation error: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: 'txt' | 'md' | 'json') => {
    if (!translatedText) return;

    let content = translatedText;
    let mimeType = 'text/plain';
    const baseName = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'translated_document';

    if (format === 'json') {
      content = JSON.stringify({ original: inputText, translated: translatedText, targetLanguage: targetLang }, null, 2);
      mimeType = 'application/json';
    } else if (format === 'md') {
      content = `# Translated Document (${targetLang})\n\n${translatedText}`;
      mimeType = 'text/markdown';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_${targetLang}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.docx,.txt,.md,.json,.csv,.po"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isTranslating}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-blue-600/20"
          >
            {isUploading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{isUploading ? 'Extracting File...' : 'Upload Document'}</span>
          </button>
          <span className="text-xs text-slate-400 hidden lg:inline">
            Supports PDF, DOCX, TXT, MD, JSON, CSV
          </span>
        </div>

        {/* Target Language selector & Translate Button */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <Globe className="w-4 h-4 text-blue-400" />
            <select
              value={targetLang}
              onChange={(e) => {
                setTargetLang(e.target.value);
                if (inputText.trim()) startTranslation(inputText, e.target.value);
              }}
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
            onClick={() => startTranslation()}
            disabled={isTranslating || !inputText.trim()}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/20"
          >
            {isTranslating ? (
              <>
                <Zap className="w-4 h-4 animate-bounce text-amber-300" />
                <span>Translating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Translate</span>
              </>
            )}
          </button>
        </div>
      </div>

      {fileName && (
        <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 border border-slate-800/80 px-4 py-2 rounded-xl">
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            Loaded file: <strong className="text-slate-200">{fileName}</strong>
          </span>
          <button
            onClick={() => {
              setFileName(null);
              setInputText('');
              setTranslatedText('');
            }}
            className="text-red-400 hover:underline"
          >
            Clear file
          </button>
        </div>
      )}

      {/* Main Dual Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Document / Text */}
        <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden min-h-[450px]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/40">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-slate-500" />
              Source Content ({inputText.length} chars)
            </span>
            {inputText && (
              <button
                onClick={() => setInputText('')}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste text or drag & drop document here to translate..."
            className="flex-1 w-full p-5 bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none resize-none font-mono text-sm leading-relaxed"
          />
        </div>

        {/* Output Translated Content */}
        <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden min-h-[450px]">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/40">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              Translated Output ({targetLang})
            </span>

            {translatedText && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
                  title="Copy text"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <div className="flex items-center space-x-1 border-l border-slate-800 pl-2">
                  <button
                    onClick={() => handleDownload('txt')}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                    title="Download .txt"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownload('md')}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                    title="Download .md"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 p-5 bg-slate-950/30 text-slate-100 font-mono text-sm leading-relaxed whitespace-pre-wrap overflow-y-auto">
            {translatedText ? (
              translatedText
            ) : isTranslating ? (
              <div className="flex items-center justify-center h-full text-slate-500 animate-pulse gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span>Translating in real time...</span>
              </div>
            ) : (
              <span className="text-slate-600 italic">
                Translation output will appear here automatically...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
