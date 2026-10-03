'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, FastForward, Music } from 'lucide-react';
import { getAudioStreamUrl } from '@/lib/api';

interface AudioPlayerProps {
  noteId: string;
  durationSeconds?: number | null;
  title: string;
}

export default function AudioPlayer({ noteId, durationSeconds, title }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const audioSrc = getAudioStreamUrl(noteId);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [noteId]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg">
      <audio ref={audioRef} src={audioSrc} preload="metadata" />

      {/* Top info and equalizer animation */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
            <Music className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-300 truncate">{title}</span>
        </div>

        {/* Animated equalizer waves */}
        <div className="flex items-end gap-1 h-6 shrink-0 px-2">
          <div className={`w-1 bg-sky-400 rounded-full ${isPlaying ? 'animate-eq-1' : 'h-1.5'}`} />
          <div className={`w-1 bg-sky-400 rounded-full ${isPlaying ? 'animate-eq-2' : 'h-2.5'}`} />
          <div className={`w-1 bg-sky-400 rounded-full ${isPlaying ? 'animate-eq-3' : 'h-1'}`} />
          <div className={`w-1 bg-sky-400 rounded-full ${isPlaying ? 'animate-eq-4' : 'h-3'}`} />
          <div className={`w-1 bg-sky-400 rounded-full ${isPlaying ? 'animate-eq-5' : 'h-2'}`} />
        </div>
      </div>

      {/* Seek bar */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[11px] font-mono text-slate-400 shrink-0">{formatTime(currentTime)}</span>
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
        />
        <span className="text-[11px] font-mono text-slate-400 shrink-0">{formatTime(duration)}</span>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 flex items-center justify-center shadow-md shadow-sky-500/30 transition-all hover:scale-105 active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          {/* Skip back 10s */}
          <button
            onClick={() => {
              if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 10);
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Rewind 10 seconds"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Playback speed */}
          <button
            onClick={cyclePlaybackRate}
            className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            title="Change Playback Speed"
          >
            {playbackRate}x
          </button>

          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
