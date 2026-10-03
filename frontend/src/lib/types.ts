export type JobStatus =
  | 'QUEUED'
  | 'PROCESSING_AUDIO'
  | 'TRANSCRIBING'
  | 'SUMMARIZING'
  | 'COMPLETED'
  | 'FAILED';

export interface AudioNoteListItem {
  id: string;
  title: string;
  filename: string;
  file_size_bytes: number;
  duration_seconds: number | null;
  language_code: string;
  status: JobStatus;
  progress_percent: number;
  summary_tldr: string | null;
  summary_sentiment: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AudioNoteDetail {
  id: string;
  title: string;
  filename: string;
  file_size_bytes: number;
  duration_seconds: number | null;
  mime_type: string;
  language_code: string;
  status: JobStatus;
  progress_percent: number;
  progress_message: string;
  error_message: string | null;
  transcript_text: string | null;
  transcript_metadata: Record<string, any> | null;
  summary_tldr: string | null;
  summary_markdown: string | null;
  summary_key_points: string[] | null;
  summary_action_items: string[] | null;
  summary_sentiment: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobProgress {
  id: string;
  status: JobStatus;
  progress_percent: number;
  progress_message: string;
  error_message: string | null;
  duration_seconds: number | null;
}

export interface SystemHealth {
  status: string;
  database: string;
  storage_type: string;
  gnani_configured: boolean;
  gnani_mode: 'live' | 'mock_sandbox';
  llm_provider: string;
  llm_configured: boolean;
}
