import { AudioNoteDetail, AudioNoteListItem, JobProgress, SystemHealth } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function uploadAudio(
  file: File,
  title?: string,
  languageCode: string = 'en-IN'
): Promise<{ id: string; title: string; status: string; progress_percent: number; progress_message: string; message: string }> {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);
  formData.append('language_code', languageCode);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    let errorMsg = `Upload failed (${res.status})`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.detail || errJson.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export async function getJobStatus(jobId: string): Promise<JobProgress> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch job status (${res.status})`);
  return res.json();
}

export async function listNotes(search?: string, status?: string): Promise<AudioNoteListItem[]> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status) params.append('status', status);

  const res = await fetch(`${API_BASE}/notes?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch notes (${res.status})`);
  return res.json();
}

export async function getNoteDetail(noteId: string): Promise<AudioNoteDetail> {
  const res = await fetch(`${API_BASE}/notes/${noteId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch note detail (${res.status})`);
  return res.json();
}

export async function updateNoteTitle(noteId: string, title: string): Promise<AudioNoteDetail> {
  const res = await fetch(`${API_BASE}/notes/${noteId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Failed to update note (${res.status})`);
  return res.json();
}

export async function deleteNote(noteId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/notes/${noteId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(`Failed to delete note (${res.status})`);
}

export async function retryNote(noteId: string): Promise<AudioNoteDetail> {
  const res = await fetch(`${API_BASE}/notes/${noteId}/retry`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to retry note (${res.status})`);
  return res.json();
}

export async function getHealth(): Promise<SystemHealth> {
  const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

export function getAudioStreamUrl(noteId: string): string {
  return `${API_BASE}/notes/${noteId}/audio`;
}
