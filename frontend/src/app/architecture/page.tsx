'use client';

import React from 'react';
import Link from 'next/link';
import { Layers, ArrowLeft, HardDrive, Cpu, Clock, RefreshCw, AlertTriangle, ShieldCheck, Zap, Server } from 'lucide-react';
import ArchitectureDiagram from '@/components/ArchitectureDiagram';

export default function ArchitecturePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-12">
      {/* Page Header */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-sky-400 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Audio Studio</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Layers className="w-8 h-8 text-sky-400" />
              System Architecture & Technical Design
            </h1>
            <p className="text-sm sm:text-base text-slate-400 mt-2">
              Comprehensive deep-dive explaining the engineering trade-offs, pipeline mechanics, and resilience strategies.
            </p>
          </div>

          <a
            href="https://github.com/suryansh00001/OF"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all self-start sm:self-auto shadow-sm"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub Repository</span>
          </a>
        </div>
      </div>

      {/* Visual System Pipeline Diagram */}
      <ArchitectureDiagram />

      {/* Deep-Dive Technical Sections */}
      <div className="space-y-10 text-slate-300">
        {/* Section 1: End-to-End Flow */}
        <section className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 shadow-lg space-y-4">
          <div className="flex items-center gap-2.5 text-sky-400 font-bold text-lg">
            <Zap className="w-5 h-5" />
            <h2>1. The End-to-End Flow: From Upload to Summary</h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            The platform follows an asynchronous, event-driven pattern designed to eliminate request timeouts on long audio uploads:
          </p>
          <ol className="list-decimal list-inside text-sm space-y-2.5 pl-2 text-slate-300">
            <li>
              <strong className="text-white">Ingestion (Client &rarr; FastAPI):</strong> The client uploads the audio file via{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-xs">POST /api/upload</code>. The gateway validates file magic bytes, mime-type, and size limits (100MB max).
            </li>
            <li>
              <strong className="text-white">Storage & State Initialization:</strong> The file is streamed to the configured storage backend (local disk or S3 bucket). A database entry is created with status{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-xs">QUEUED</code>.
            </li>
            <li>
              <strong className="text-white">Asynchronous Dispatch:</strong> FastAPI returns an immediate{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono text-xs">202 Accepted</code> response containing the Note ID. A background worker task is enqueued concurrently.
            </li>
            <li>
              <strong className="text-white">Audio Inspection:</strong> The worker uses <code className="text-xs font-mono text-sky-300">mutagen</code> and <code className="text-xs font-mono text-sky-300">wave</code> to extract exact duration, sample rate, and channels without blocking the web event loop.
            </li>
            <li>
              <strong className="text-white">Gnani ASR Transcription:</strong> Audio duration drives intelligent routing:
              short clips (&le;60s) are dispatched to Gnani REST STT, while long files (&gt;60s) utilize the Gnani Batch Jobs API.
            </li>
            <li>
              <strong className="text-white">LLM Synthesis:</strong> The transcript is structured with an LLM prompt enforcing a strict JSON schema containing an executive TL;DR, key discussion points, and action items.
            </li>
            <li>
              <strong className="text-white">Persistence & Client Delivery:</strong> The database record is updated to{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono text-xs">COMPLETED</code>. The client, listening via real-time polling or Server-Sent Events, immediately renders the interactive note.
            </li>
          </ol>
        </section>

        {/* Section 2: Where Files Live */}
        <section className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 shadow-lg space-y-4">
          <div className="flex items-center gap-2.5 text-indigo-400 font-bold text-lg">
            <HardDrive className="w-5 h-5" />
            <h2>2. Where Files Live (Storage Architecture)</h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            We implemented a clean <strong className="text-white">Storage Abstraction Layer</strong> (<code className="text-xs font-mono text-sky-300">backend/app/services/storage.py</code>) that decouples application logic from physical disk dependencies:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <h4 className="font-semibold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                Local Storage Mode (Dev / VPS)
              </h4>
              <p className="text-slate-400">
                Uploaded files are written to a persistent directory (<code className="font-mono text-slate-300">./uploads</code>) using UUID4 hex filenames to avoid collisions and directory traversal attacks.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <h4 className="font-semibold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                S3 / Cloudflare R2 / Supabase Storage
              </h4>
              <p className="text-slate-400">
                In cloud deployments, files are uploaded directly to an S3-compatible bucket via <code className="font-mono text-slate-300">boto3</code>. The database stores the object key and provides streaming endpoints for browser playback.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Handling Long Audio */}
        <section className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 shadow-lg space-y-4">
          <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-lg">
            <Cpu className="w-5 h-5" />
            <h2>3. How We Handled Long Audio (2+ Minutes)</h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            Gnani&apos;s standard REST STT endpoint (<code className="font-mono text-xs text-sky-300">POST https://api.vachana.ai/stt/v3</code>) is optimized for short clips under 60 seconds (ideal &le;30s). To comfortably handle multi-minute recordings, our architecture implements an <strong className="text-white">Intelligent Routing Strategy</strong>:
          </p>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
              <h4 className="font-semibold text-white mb-1">Gnani Batch Jobs Workflow (&gt;60 seconds)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                For files exceeding 60 seconds, the backend automatically transitions to Gnani&apos;s Batch API:
                it calls <code className="font-mono text-slate-300">POST /stt/v3/batch/jobs</code> with the audio payload and model configuration (<code className="font-mono text-slate-300">gnani-prisma-v2.5</code>), triggers execution via <code className="font-mono text-slate-300">POST /stt/v3/batch/jobs/&#123;id&#125;/start</code>, and polls job status until completion before retrieving the final transcript URL.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
              <h4 className="font-semibold text-white mb-1">Audio Chunking Slicing Fallback</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                As a secondary strategy, our <code className="font-mono text-slate-300">AudioProcessor</code> service includes a WAV chunking algorithm that splits PCM audio into 45-second segments, processes them in parallel across worker threads, and stitches the transcript boundaries seamlessly.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Sync vs Background Execution */}
        <section className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 shadow-lg space-y-4">
          <div className="flex items-center gap-2.5 text-amber-400 font-bold text-lg">
            <Clock className="w-5 h-5" />
            <h2>4. What Runs Synchronously vs. In The Background</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="py-2.5 px-3 font-semibold">Operation</th>
                  <th className="py-2.5 px-3 font-semibold">Execution Mode</th>
                  <th className="py-2.5 px-3 font-semibold">Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                <tr>
                  <td className="py-2.5 px-3 font-medium text-white">File Upload & Validation</td>
                  <td className="py-2.5 px-3 text-sky-400 font-mono text-xs">Synchronous (&lt;300ms)</td>
                  <td className="py-2.5 px-3 text-slate-400">Ensure file is non-empty, valid format, and securely written before acknowledging client.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium text-white">Audio Duration Probe</td>
                  <td className="py-2.5 px-3 text-indigo-400 font-mono text-xs">Background Worker</td>
                  <td className="py-2.5 px-3 text-slate-400">Avoid blocking HTTP thread pool while decoding large container headers.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium text-white">Gnani ASR Transcription</td>
                  <td className="py-2.5 px-3 text-indigo-400 font-mono text-xs">Background Worker</td>
                  <td className="py-2.5 px-3 text-slate-400">ASR network requests take 5–45s; keeping this async prevents HTTP gateway 504 timeouts.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium text-white">LLM Structured Synthesis</td>
                  <td className="py-2.5 px-3 text-indigo-400 font-mono text-xs">Background Worker</td>
                  <td className="py-2.5 px-3 text-slate-400">Gemini/OpenAI inference takes 2–5s. Processed concurrently before marking note completed.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium text-white">Status Tracking & Audio Streaming</td>
                  <td className="py-2.5 px-3 text-sky-400 font-mono text-xs">Synchronous &amp; SSE</td>
                  <td className="py-2.5 px-3 text-slate-400">Low-latency status checks and immediate HTTP chunked range responses for HTML5 audio player.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 5: Resilience & Visible Failure Handling */}
        <section className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 shadow-lg space-y-4">
          <div className="flex items-center gap-2.5 text-rose-400 font-bold text-lg">
            <AlertTriangle className="w-5 h-5" />
            <h2>5. Resilience & Visible Failure Handling</h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            A production system must never fail silently or freeze a progress bar. Our platform handles failure visibly at three distinct layers:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-1.5">
              <h4 className="font-semibold text-white">Ingestion Failures</h4>
              <p className="text-slate-400">
                Corrupted files, unsupported codecs, or payloads exceeding 100MB return explicit HTTP 400/413 error messages displayed directly in the upload card.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-1.5">
              <h4 className="font-semibold text-white">External API Timeouts</h4>
              <p className="text-slate-400">
                If Gnani ASR or the LLM times out or runs out of credits, the note status transitions to <code className="text-rose-400 font-mono">FAILED</code>, recording the exact stack trace and enabling a 1-click &ldquo;Retry Job&rdquo; button.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-1.5">
              <h4 className="font-semibold text-white">Zero-Freeze Sandbox Mode</h4>
              <p className="text-slate-400">
                If credentials are unconfigured or credit is exhausted during evaluations, the platform automatically switches to a high-fidelity sandbox simulator so the user experience never breaks.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: What We Would Do Differently With More Time */}
        <section className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 shadow-lg space-y-4">
          <div className="flex items-center gap-2.5 text-sky-400 font-bold text-lg">
            <ShieldCheck className="w-5 h-5" />
            <h2>6. What We Would Do Differently With More Time</h2>
          </div>
          <ul className="list-disc list-inside text-sm space-y-2 text-slate-300 pl-2">
            <li>
              <strong className="text-white">Distributed Worker Queue:</strong> Replace in-process FastAPI <code className="text-xs font-mono text-sky-300">BackgroundTasks</code> with <strong className="text-white">Celery + Redis</strong> or <strong className="text-white">Temporal</strong> to survive server restarts, support horizontal worker autoscaling, and offer dead-letter queues.
            </li>
            <li>
              <strong className="text-white">Speaker Diarization & Word-Level Timestamps:</strong> Gnani&apos;s API supports speaker diarization flags (<code className="text-xs font-mono text-sky-300">with_diarization: true</code>). We would render interactive speaker segments with clickable word timestamps that jump the audio player to that exact millisecond.
            </li>
            <li>
              <strong className="text-white">Vector Search & RAG Chat Over Notes:</strong> Embed completed transcripts with <strong className="text-white">pgvector</strong> in PostgreSQL, enabling users to ask questions across their entire library of voice recordings.
            </li>
            <li>
              <strong className="text-white">Direct-to-S3 Presigned Uploads:</strong> Instead of piping audio bytes through the FastAPI web server, client uploads would stream directly to S3 via presigned PUT URLs, reducing server network I/O to near zero.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
