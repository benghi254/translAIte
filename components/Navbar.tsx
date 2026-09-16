'use client';

import React from 'react';
import { Languages, Settings, Zap, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onOpenSettings: () => void;
  hasApiKey: boolean;
}

export function Navbar({ onOpenSettings, hasApiKey }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/20 text-white">
            <Languages className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                translAIte
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full flex items-center gap-1">
                <Zap className="w-3 h-3 fill-current" /> High Speed
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Multimodal Document, Audio & Video Translation
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex items-center space-x-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <ShieldCheck className={`w-4 h-4 ${hasApiKey ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>{hasApiKey ? 'API Key Active' : 'Default / Custom Key'}</span>
          </div>

          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-200 text-sm font-medium transition shadow-sm"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
}
