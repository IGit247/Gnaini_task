'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, FileAudio, PlusCircle, RefreshCw, Layers, ArrowRight, CheckCircle2 } from 'lucide-react';
import AudioUploader from '@/components/AudioUploader';
import JobProgressTracker from '@/components/JobProgressTracker';
import AudioPlayer from '@/components/AudioPlayer';
import TranscriptViewer from '@/components/TranscriptViewer';
import SummaryViewer from '@/components/SummaryViewer';
import NoteHistorySidebar from '@/components/NoteHistorySidebar';
import { getNoteDetail, updateNoteTitle } from '@/lib/api';
import { AudioNoteDetail } from '@/lib/types';

export default function StudioPage() {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<AudioNoteDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript'>('summary');
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load note details when activeNoteId changes
  useEffect(() => {
    if (!activeNoteId) {
      setActiveNote(null);
      return;
    }

    const loadNote = async () => {
      try {
        const note = await getNoteDetail(activeNoteId);
        setActiveNote(note);
        if (note.status !== 'COMPLETED' && note.status !== 'FAILED') {
          setIsProcessing(true);
        } else {
          setIsProcessing(false);
        }
      } catch (err) {
        console.error('Error fetching note detail:', err);
      }
    };

    loadNote();
  }, [activeNoteId]);

  const handleUploadSuccess = (noteId: string) => {
    setActiveNoteId(noteId);
    setIsProcessing(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleJobCompleted = async (noteId: string) => {
    setIsProcessing(false);
    setRefreshTrigger((prev) => prev + 1);
    try {
      const note = await getNoteDetail(noteId);
      setActiveNote(note);
    } catch (err) {
      console.error('Error reloading completed note:', err);
    }
  };

  const handleSelectNote = (noteId: string) => {
    setActiveNoteId(noteId);
  };

  const handleResetToUpload = () => {
    setActiveNoteId(null);
    setActiveNote(null);
    setIsProcessing(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <span>Audio Intelligence Studio</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Upload voice notes, discussions, or memos of any length to generate accurate transcripts and executive summaries.
          </p>
        </div>

        {activeNoteId && (
          <button
            onClick={handleResetToUpload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-md shadow-sky-500/20 transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Recording</span>
          </button>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar: Past Recordings History */}
        <div className="lg:col-span-4 order-2 lg:order-1">
          <NoteHistorySidebar
            activeNoteId={activeNoteId}
            onSelectNote={handleSelectNote}
            refreshTrigger={refreshTrigger}
          />
        </div>

        {/* Right Main Area */}
        <div className="lg:col-span-8 order-1 lg:order-2 space-y-6">
          {/* Active Job Progress Tracker */}
          {activeNoteId && isProcessing && (
            <JobProgressTracker
              noteId={activeNoteId}
              onCompleted={handleJobCompleted}
            />
          )}

          {/* Mode 1: No Note Selected -> Show Audio Uploader */}
          {!activeNoteId && (
            <AudioUploader onUploadSuccess={handleUploadSuccess} />
          )}

          {/* Mode 2: Note Selected & Ready -> Show Audio Player, Summary & Transcript */}
          {activeNote && !isProcessing && (
            <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6">
              {/* Note Title Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      {activeNote.title}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {activeNote.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Original file: <span className="font-mono text-slate-300">{activeNote.filename}</span> •{' '}
                    {(activeNote.file_size_bytes / (1024 * 1024)).toFixed(2)} MB • Spoken Language:{' '}
                    <span className="font-semibold text-slate-300">{activeNote.language_code}</span>
                  </p>
                </div>
              </div>

              {/* Audio Playback Element */}
              <AudioPlayer
                noteId={activeNote.id}
                durationSeconds={activeNote.duration_seconds}
                title={activeNote.title}
              />

              {/* Tabs: Summary vs Transcript */}
              <div>
                <div className="flex items-center gap-2 border-b border-white/10 mb-6">
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-all relative ${
                      activeTab === 'summary'
                        ? 'text-sky-400 border-b-2 border-sky-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Summary & Action Items</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('transcript')}
                    className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 transition-all relative ${
                      activeTab === 'transcript'
                        ? 'text-sky-400 border-b-2 border-sky-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileAudio className="w-4 h-4" />
                    <span>Full Transcript</span>
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'summary' ? (
                  <SummaryViewer note={activeNote} />
                ) : (
                  <TranscriptViewer note={activeNote} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
