'use client';

import React, { useState } from 'react';
import { Copy, Check, Download, Search, FileText, Globe, Layers } from 'lucide-react';
import { AudioNoteDetail } from '@/lib/types';

interface TranscriptViewerProps {
  note: AudioNoteDetail;
}

export default function TranscriptViewer({ note }: TranscriptViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  const transcript = note.transcript_text || 'No transcript available.';
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;
  const engine = note.transcript_metadata?.engine || 'Gnani ASR';

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/\s+/g, '_')}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render transcript with highlighted search term
  const renderContent = () => {
    if (!searchTerm.trim()) {
      return (
        <p className="text-sm sm:text-base leading-relaxed text-slate-200 whitespace-pre-wrap">
          {transcript}
        </p>
      );
    }

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = transcript.split(regex);

    return (
      <p className="text-sm sm:text-base leading-relaxed text-slate-200 whitespace-pre-wrap">
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-sky-500/40 text-sky-100 rounded px-1 font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </p>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-white/5">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Text'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .TXT</span>
          </button>
        </div>
      </div>

      {/* Transcript Text Container */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 max-h-[500px] overflow-y-auto leading-relaxed shadow-inner font-sans">
        {renderContent()}
      </div>

      {/* Metadata Badges */}
      <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-slate-400">
        <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-white/5 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-sky-400" />
          {wordCount} words
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-white/5 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
          {note.language_code}
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-white/5 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          {engine}
        </span>
      </div>
    </div>
  );
}
