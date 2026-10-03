'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Cpu, FileAudio, AlertTriangle, RefreshCw, Sparkles, ChevronRight } from 'lucide-react';
import { getJobStatus, retryNote } from '@/lib/api';
import { JobProgress } from '@/lib/types';

interface JobProgressTrackerProps {
  noteId: string;
  onCompleted: (noteId: string) => void;
  onDismiss?: () => void;
}

const STAGES = [
  { key: 'QUEUED', label: 'Queued', icon: Clock },
  { key: 'PROCESSING_AUDIO', label: 'Audio Analysis', icon: FileAudio },
  { key: 'TRANSCRIBING', label: 'Gnani ASR', icon: Cpu },
  { key: 'SUMMARIZING', label: 'AI Summarizer', icon: Sparkles },
  { key: 'COMPLETED', label: 'Completed', icon: CheckCircle2 },
];

export default function JobProgressTracker({ noteId, onCompleted, onDismiss }: JobProgressTrackerProps) {
  const [job, setJob] = useState<JobProgress | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout;

    const poll = async () => {
      try {
        const data = await getJobStatus(noteId);
        if (!isMounted) return;
        setJob(data);
        setPollError(null);

        if (data.status === 'COMPLETED') {
          clearInterval(interval);
          onCompleted(noteId);
        } else if (data.status === 'FAILED') {
          clearInterval(interval);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setPollError(err.message || 'Error tracking job status');
      }
    };

    poll();
    interval = setInterval(poll, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [noteId, onCompleted]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retryNote(noteId);
      setIsRetrying(false);
      setJob((prev) => (prev ? { ...prev, status: 'QUEUED', progress_percent: 5, error_message: null } : null));
    } catch (err: any) {
      setIsRetrying(false);
      alert(`Retry failed: ${err.message}`);
    }
  };

  const getStageIndex = (status?: string) => {
    switch (status) {
      case 'QUEUED':
        return 0;
      case 'PROCESSING_AUDIO':
        return 1;
      case 'TRANSCRIBING':
        return 2;
      case 'SUMMARIZING':
        return 3;
      case 'COMPLETED':
        return 4;
      default:
        return 0;
    }
  };

  const currentStageIndex = getStageIndex(job?.status);

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-7 border border-white/10 shadow-2xl relative overflow-hidden transition-all">
      {/* Background ambient light */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            {job?.status === 'FAILED' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            ) : job?.status === 'COMPLETED' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
            )}
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              {job?.status === 'FAILED' ? (
                <span className="text-rose-400">Processing Encountered an Issue</span>
              ) : job?.status === 'COMPLETED' ? (
                <span className="text-emerald-400">Transcription & Summary Complete!</span>
              ) : (
                <span>Processing Audio Note</span>
              )}
              {job?.duration_seconds && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
                  {Math.round(job.duration_seconds)}s recording
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {job?.progress_message || 'Initializing background pipeline...'}
            </p>
          </div>
        </div>

        {/* Progress Percentage */}
        <div className="text-right">
          <span className="text-2xl font-bold bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            {job?.progress_percent || 0}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 rounded-full bg-slate-800/80 overflow-hidden mb-6 p-0.5 border border-white/5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            job?.status === 'FAILED'
              ? 'bg-rose-500'
              : 'bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 animate-pulse'
          }`}
          style={{ width: `${Math.max(5, job?.progress_percent || 0)}%` }}
        />
      </div>

      {/* Pipeline Stage Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-white/5">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isPassed = currentStageIndex > idx || job?.status === 'COMPLETED';
          const isCurrent = currentStageIndex === idx && job?.status !== 'COMPLETED' && job?.status !== 'FAILED';
          const isFailedCurrent = job?.status === 'FAILED' && currentStageIndex === idx;

          return (
            <div
              key={stage.key}
              className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                isFailedCurrent
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : isCurrent
                  ? 'bg-sky-500/10 border-sky-500/40 text-sky-300 shadow-sm shadow-sky-500/10'
                  : isPassed
                  ? 'bg-slate-900/60 border-emerald-500/20 text-emerald-400'
                  : 'bg-slate-900/30 border-white/5 text-slate-500'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                  isFailedCurrent
                    ? 'bg-rose-500/20 text-rose-400'
                    : isCurrent
                    ? 'bg-sky-500/20 text-sky-400 animate-pulse'
                    : isPassed
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium truncate">{stage.label}</span>
            </div>
          );
        })}
      </div>

      {/* Failure Box & Retry Action */}
      {job?.status === 'FAILED' && (
        <div className="mt-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-rose-300">Failure Diagnostics</p>
                <p className="text-xs text-rose-300/80 mt-1 whitespace-pre-wrap font-mono bg-black/30 p-2.5 rounded-lg max-h-36 overflow-y-auto">
                  {job.error_message || 'An unknown error occurred during audio processing.'}
                </p>
              </div>
            </div>

            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow transition-all shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>Retry Job</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
