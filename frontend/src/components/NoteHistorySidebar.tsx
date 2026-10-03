'use client';

import React, { useState, useEffect } from 'react';
import { History, Search, RefreshCw, Trash2, Clock, CheckCircle2, AlertTriangle, FileAudio, ChevronRight } from 'lucide-react';
import { listNotes, deleteNote } from '@/lib/api';
import { AudioNoteListItem } from '@/lib/types';

interface NoteHistorySidebarProps {
  activeNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  refreshTrigger?: number;
}

export default function NoteHistorySidebar({
  activeNoteId,
  onSelectNote,
  refreshTrigger = 0,
}: NoteHistorySidebarProps) {
  const [notes, setNotes] = useState<AudioNoteListItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const data = await listNotes(search);
      setNotes(data);
    } catch (err) {
      console.error('Failed to fetch past notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [refreshTrigger, search]);

  const handleDelete = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this audio note?')) return;
    try {
      await deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const formatDuration = (secs: number | null) => {
    if (!secs) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}m ${s}s`;
  };

  const formatDate = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-xl flex flex-col h-full max-h-[850px]">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-sky-400" />
          <h3 className="font-bold text-sm text-white">Past Recordings</h3>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-400 font-mono">
            {notes.length}
          </span>
        </div>

        <button
          onClick={fetchNotes}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Refresh List"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Filter notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
        />
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {notes.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-500">
            <FileAudio className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No audio notes uploaded yet.</p>
            <p className="text-[11px] text-slate-600 mt-1">Upload a recording to get started</p>
          </div>
        ) : (
          notes.map((note) => {
            const isActive = note.id === activeNoteId;
            return (
              <div
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all group relative ${
                  isActive
                    ? 'bg-sky-500/10 border-sky-500/40 text-white shadow-md shadow-sky-500/5'
                    : 'bg-slate-900/40 border-white/5 text-slate-300 hover:bg-slate-900/80 hover:border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="truncate flex-1">
                    <h4 className="text-xs font-semibold text-white truncate group-hover:text-sky-300 transition-colors">
                      {note.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{note.filename}</p>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(e, note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-all"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Card footer: status, duration, date */}
                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/5 text-[10px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    {note.status === 'COMPLETED' ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </span>
                    ) : note.status === 'FAILED' ? (
                      <span className="flex items-center gap-1 text-rose-400 font-medium">
                        <AlertTriangle className="w-3 h-3" /> Failed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sky-400 font-medium">
                        <RefreshCw className="w-3 h-3 animate-spin" /> {note.progress_percent}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 font-mono">
                    {note.duration_seconds ? <span>{formatDuration(note.duration_seconds)}</span> : null}
                    <span>•</span>
                    <span>{formatDate(note.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
