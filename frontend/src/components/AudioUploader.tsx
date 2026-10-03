'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, Music, Mic, Square, Sparkles, AlertCircle, FileAudio, CheckCircle2, Play } from 'lucide-react';
import { uploadAudio } from '@/lib/api';

interface AudioUploaderProps {
  onUploadSuccess: (noteId: string) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', label: 'English (India)' },
  { code: 'hi-IN', label: 'Hindi (हिन्दी)' },
  { code: 'ta-IN', label: 'Tamil (தமிழ்)' },
  { code: 'te-IN', label: 'Telugu (తెలుగు)' },
  { code: 'kn-IN', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'bn-IN', label: 'Bengali (বাংলা)' },
  { code: 'mr-IN', label: 'Marathi (मराठी)' },
  { code: 'gu-IN', label: 'Gujarati (ગુજરાતી)' },
  { code: 'ml-IN', label: 'Malayalam (മലയാളം)' },
];

export default function AudioUploader({ onUploadSuccess }: AudioUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('en-IN');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Live recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = (selectedFile: File) => {
    setFile(selectedFile);
    setUploadError(null);
    if (!title.trim()) {
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  // Start in-browser microphone recording
  const startRecording = async () => {
    try {
      setUploadError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const recordedFile = new File([audioBlob], `Live_Recording_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`, {
          type: 'audio/wav',
        });
        handleFileSelection(recordedFile);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setUploadError(`Microphone access error: ${err.message || 'Permission denied'}`);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Generate synthetic sample recording for instant testing
  const loadSampleAudio = (durationMins: number = 2) => {
    // Generate an in-memory sine wave WAV file of desired length
    const sampleRate = 16000;
    const numSamples = sampleRate * (durationMins * 60);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // RIFF identifier
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Write gentle sine wave
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.sin((i / sampleRate) * 440 * 2 * Math.PI) * 0.1 * 32767;
      view.setInt16(44 + i * 2, sample, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const sampleFile = new File([blob], `Quarterly_Product_Review_${durationMins}min.wav`, { type: 'audio/wav' });
    handleFileSelection(sampleFile);
    setTitle(`Quarterly Product Review (${durationMins}m recording)`);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please choose or record an audio file first.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const response = await uploadAudio(file, title, language);
      setIsUploading(false);
      setFile(null);
      setTitle('');
      onUploadSuccess(response.id);
    } catch (err: any) {
      setIsUploading(false);
      setUploadError(err.message || 'An unexpected error occurred during upload.');
    }
  };

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-white/10">
      {/* Glow background accent */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <UploadCloud className="w-6 h-6 text-sky-400" />
              Upload Audio Note
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Supports recordings of any length (2+ minutes handled smoothly via Gnani Batch & REST STT).
            </p>
          </div>

          {/* Quick Demo Sample Action */}
          <button
            type="button"
            onClick={() => loadSampleAudio(2)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Load 2-Min Demo Audio
          </button>
        </div>

        {uploadError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Upload Failure</p>
              <p className="text-xs text-rose-300/90 mt-0.5">{uploadError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleUploadSubmit} className="space-y-6">
          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-sky-400 bg-sky-500/10 scale-[1.01]'
                : file
                ? 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60'
                : 'border-slate-700 hover:border-slate-500 bg-slate-900/40 hover:bg-slate-900/60'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                  <FileAudio className="w-7 h-7" />
                </div>
                <p className="text-base font-semibold text-white truncate max-w-md">{file.name}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'audio file'}
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" /> File Selected. Ready to transcribe.
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-3">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <p className="text-base font-medium text-slate-200">
                  Drag and drop your audio file here, or <span className="text-sky-400 underline">browse</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports MP3, WAV, M4A, AAC, OGG, FLAC up to 100MB
                </p>
              </div>
            )}
          </div>

          {/* Quick Record Alternative */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-slate-600'}`} />
              <div>
                <p className="text-sm font-medium text-slate-200">
                  {isRecording ? `Recording... (${formatSecs(recordingSeconds)})` : 'Or record live audio right here'}
                </p>
                <p className="text-xs text-slate-400">Capture mic audio straight into the transcription pipeline</p>
              </div>
            </div>

            {isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-colors"
              >
                <Square className="w-3.5 h-3.5" /> Stop Recording
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-colors"
              >
                <Mic className="w-3.5 h-3.5 text-sky-400" /> Start Recording
              </button>
            )}
          </div>

          {/* Meta inputs: Title and Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Note Title (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Marketing Roadmap Sync"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Spoken Language (Gnani ASR)
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500 transition-colors"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!file || isUploading}
            className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              !file || isUploading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-sky-500 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Uploading & Starting Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Upload & Transcribe with Gnani</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
