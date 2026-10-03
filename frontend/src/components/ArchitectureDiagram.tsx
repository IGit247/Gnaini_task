'use client';

import React from 'react';
import { ArrowRight, Cloud, Cpu, Database, HardDrive, Layout, Server, Sparkles, Upload } from 'lucide-react';

export default function ArchitectureDiagram() {
  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Server className="w-5 h-5 text-sky-400" />
          End-to-End System Pipeline & Data Flow
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Visual architecture illustrating synchronous ingestion vs asynchronous background task queues.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {/* Step 1: Frontend Ingestion */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-sky-500/20 flex flex-col justify-between relative group hover:border-sky-500/40 transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-md bg-sky-500/10 text-sky-400 text-xs font-bold flex items-center justify-center">
                1
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-400 px-2 py-0.5 rounded-full bg-sky-500/10">
                Client Layer
              </span>
            </div>
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layout className="w-4 h-4 text-sky-400" />
              Next.js 15 UI
            </h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Drag & drop or Mic capture</li>
              <li>• Language code selection</li>
              <li>• Non-blocking upload dispatch</li>
              <li>• Real-time SSE / Polling listener</li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-sky-400 font-medium flex items-center justify-between">
            <span>POST /api/upload</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Step 2: FastAPI Dispatcher & Storage */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-indigo-500/20 flex flex-col justify-between relative group hover:border-indigo-500/40 transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-400 text-xs font-bold flex items-center justify-center">
                2
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 px-2 py-0.5 rounded-full bg-indigo-500/10">
                Sync Gate
              </span>
            </div>
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" />
              FastAPI Gateway
            </h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Stores file (S3 / Local disk)</li>
              <li>• Creates record (Status: QUEUED)</li>
              <li>• Dispatches BackgroundTask</li>
              <li>• Returns 202 Accepted (Instant!)</li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-indigo-400 font-medium flex items-center justify-between">
            <span>Returns Note ID</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Step 3: Audio Inspection & Gnani ASR */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/20 flex flex-col justify-between relative group hover:border-emerald-500/40 transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center justify-center">
                3
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10">
                Async ASR
              </span>
            </div>
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              Gnani STT Engine
            </h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Probes audio duration via mutagen</li>
              <li>• ≤60s: REST STT (/stt/v3)</li>
              <li>• &gt;60s: Batch STT (/batch/jobs)</li>
              <li>• Handles 2 min+ long audio</li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-emerald-400 font-medium flex items-center justify-between">
            <span>Transcript Extracted</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Step 4: LLM Synthesis & Persistence */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/20 flex flex-col justify-between relative group hover:border-cyan-500/40 transition-all">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-bold flex items-center justify-center">
                4
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-500/10">
                AI Synthesis
              </span>
            </div>
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              LLM & Database
            </h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Structured LLM JSON prompt</li>
              <li>• TL;DR + Key Takeaways</li>
              <li>• Action items with assignees</li>
              <li>• Saves to PostgreSQL / SQLite</li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-emerald-400 font-medium flex items-center justify-between">
            <span>Status: COMPLETED</span>
            <Database className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
