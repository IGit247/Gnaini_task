'use client';

import React, { useState } from 'react';
import { Sparkles, CheckSquare, Square, Copy, Check, ListChecks, MessageSquare, ShieldAlert } from 'lucide-react';
import { AudioNoteDetail } from '@/lib/types';

interface SummaryViewerProps {
  note: AudioNoteDetail;
}

export default function SummaryViewer({ note }: SummaryViewerProps) {
  const [completedActions, setCompletedActions] = useState<Record<number, boolean>>({});
  const [copiedMd, setCopiedMd] = useState(false);

  const toggleAction = (idx: number) => {
    setCompletedActions((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopyMarkdown = () => {
    if (note.summary_markdown) {
      navigator.clipboard.writeText(note.summary_markdown);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    }
  };

  const actionItems = note.summary_action_items || [];
  const keyPoints = note.summary_key_points || [];

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">AI Synthesis</h3>
            <p className="text-xs text-slate-400">Executive takeaways extracted from speech</p>
          </div>
        </div>

        {note.summary_sentiment && (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            Tone: {note.summary_sentiment}
          </span>
        )}
      </div>

      {/* TL;DR Executive Summary */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-sky-950/30 border border-indigo-500/20 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-2 mb-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
          <MessageSquare className="w-4 h-4" />
          <span>Executive Summary (TL;DR)</span>
        </div>
        <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed">
          {note.summary_tldr || 'No summary generated.'}
        </p>
      </div>

      {/* Grid: Key Takeaways & Action Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Key Points */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            Key Discussion Points
          </h4>
          {keyPoints.length > 0 ? (
            <ul className="space-y-2.5">
              {keyPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300 leading-normal">
                  <span className="text-sky-400 font-bold mt-0.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">No specific discussion points extracted.</p>
          )}
        </div>

        {/* Action Items Checklist */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-emerald-400" />
            Action Items & Next Steps
          </h4>
          {actionItems.length > 0 ? (
            <ul className="space-y-2.5">
              {actionItems.map((item, idx) => {
                const isChecked = !!completedActions[idx];
                return (
                  <li
                    key={idx}
                    onClick={() => toggleAction(idx)}
                    className="flex items-start gap-2.5 text-xs sm:text-sm cursor-pointer select-none group"
                  >
                    <button type="button" className="mt-0.5 text-slate-400 group-hover:text-emerald-400 transition-colors">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <span className={`leading-normal transition-all ${isChecked ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {item}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">No explicit action items detected in audio.</p>
          )}
        </div>
      </div>

      {/* Copy Markdown footer */}
      {note.summary_markdown && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 transition-all shadow-sm"
          >
            {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedMd ? 'Markdown Copied!' : 'Copy Formatted Markdown'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
