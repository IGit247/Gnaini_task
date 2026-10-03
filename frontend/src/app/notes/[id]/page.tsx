'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, FileAudio } from 'lucide-react';
import AudioPlayer from '@/components/AudioPlayer';
import TranscriptViewer from '@/components/TranscriptViewer';
import SummaryViewer from '@/components/SummaryViewer';
import JobProgressTracker from '@/components/JobProgressTracker';
import { getNoteDetail } from '@/lib/api';
import { AudioNoteDetail } from '@/lib/types';

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params?.id as string;

  const [note, setNote] = useState<AudioNoteDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript'>('summary');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!noteId) return;

    const fetchNote = async () => {
      try {
        const data = await getNoteDetail(noteId);
        setNote(data);
      } catch (err: any) {
        setError(err.message || 'Note not found');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNote();
  }, [noteId]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-400">Loading audio note details...</p>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-sm text-rose-400">{error || 'Audio note not found'}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Studio</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-sky-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Recordings</span>
      </Link>

      {note.status !== 'COMPLETED' && (
        <JobProgressTracker
          noteId={note.id}
          onCompleted={async () => {
            const updated = await getNoteDetail(note.id);
            setNote(updated);
          }}
        />
      )}

      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{note.title}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {note.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              File: <span className="font-mono text-slate-300">{note.filename}</span> •{' '}
              {(note.file_size_bytes / (1024 * 1024)).toFixed(2)} MB • Spoken Language: {note.language_code}
            </p>
          </div>
        </div>

        {/* Audio Player */}
        <AudioPlayer noteId={note.id} durationSeconds={note.duration_seconds} title={note.title} />

        {/* Tabs */}
        <div>
          <div className="flex items-center gap-2 border-b border-white/10 mb-6">
            <button
              onClick={() => setActiveTab('summary')}
              className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-all relative ${
                activeTab === 'summary' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Summary & Action Items</span>
            </button>

            <button
              onClick={() => setActiveTab('transcript')}
              className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-all relative ${
                activeTab === 'transcript' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileAudio className="w-4 h-4" />
              <span>Full Transcript</span>
            </button>
          </div>

          {activeTab === 'summary' ? <SummaryViewer note={note} /> : <TranscriptViewer note={note} />}
        </div>
      </div>
    </div>
  );
}
