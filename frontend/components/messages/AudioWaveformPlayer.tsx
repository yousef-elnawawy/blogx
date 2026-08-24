"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, Loader2 } from "lucide-react";

interface AudioWaveformPlayerProps {
  src: string;
  duration?: number | null;
  isMe?: boolean;
}

// Generate static pleasing waveform bar heights based on a seed string
function generateBars(seed: string, count = 28): number[] {
  const bars: number[] = [];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  for (let i = 0; i < count; i++) {
    const x = Math.sin(hash + i * 0.7) * 10000;
    const normalized = Math.abs(x - Math.floor(x)); // 0..1
    const height = Math.floor(normalized * 18) + 6; // 6px to 24px
    bars.push(height);
  }
  return bars;
}

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function AudioWaveformPlayer({
  src,
  duration: initialDuration,
  isMe = false,
}: AudioWaveformPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState<number>(initialDuration || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bars = React.useMemo(() => generateBars(src || "audio_default", 26), [src]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!audioRef.current) {
      // Lazy load audio instance only on first play click!
      setIsLoadingAudio(true);
      const audio = new Audio(src);
      audioRef.current = audio;

      audio.addEventListener("loadedmetadata", () => {
        setIsLoaded(true);
        setIsLoadingAudio(false);
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setTotalDuration(audio.duration);
        }
      });

      audio.addEventListener("timeupdate", () => {
        setCurrentTime(audio.currentTime);
      });

      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      audio.addEventListener("canplaythrough", () => {
        setIsLoadingAudio(false);
      });

      audio.addEventListener("error", () => {
        setIsLoadingAudio(false);
        setIsPlaying(false);
      });

      audio.playbackRate = playbackRate;
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {});
    }
  };

  // Speed toggle (1x -> 1.5x -> 2x -> 1x)
  const toggleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  // Seek when clicking on waveform
  const handleSeek = (index: number) => {
    if (!totalDuration) return;
    const seekFraction = (index + 1) / bars.length;
    const targetTime = seekFraction * totalDuration;

    if (!audioRef.current) {
      // If not yet initialized, initialize and seek
      togglePlay();
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = targetTime;
          setCurrentTime(targetTime);
        }
      }, 100);
      return;
    }

    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const progressFraction = totalDuration > 0 ? currentTime / totalDuration : 0;
  const activeBarIndex = Math.floor(progressFraction * bars.length);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`flex items-center gap-2.5 p-2 rounded-2xl select-none min-w-[240px] sm:min-w-[280px] ${
        isMe ? "text-primary-foreground" : "text-foreground"
      }`}
    >
      {/* Play / Pause / Loading Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`size-10 rounded-full flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-90 cursor-pointer ${
          isMe
            ? "bg-white text-primary hover:bg-white/90"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {isLoadingAudio ? (
          <Loader2 className="size-5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="size-5 fill-current" />
        ) : (
          <Play className="size-5 fill-current pl-0.5" />
        )}
      </button>

      {/* Waveform Bars & Time display */}
      <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
        {/* Seekable Waveform */}
        <div className="flex items-center gap-[2.5px] h-6 cursor-pointer py-1">
          {bars.map((height, idx) => {
            const isPlayed = idx <= activeBarIndex;
            return (
              <div
                key={idx}
                onClick={() => handleSeek(idx)}
                style={{ height: `${height}px` }}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isPlayed
                    ? isMe
                      ? "bg-white opacity-100"
                      : "bg-primary opacity-100"
                    : isMe
                    ? "bg-white/40 hover:bg-white/70"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/60"
                }`}
              />
            );
          })}
        </div>

        {/* Time counter */}
        <div className="flex items-center justify-between text-[11px] font-mono opacity-85">
          <span>{formatDuration(isPlaying ? currentTime : totalDuration)}</span>

          {/* Playback Speed Pill */}
          <button
            type="button"
            onClick={toggleSpeed}
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
              isMe
                ? "bg-white/15 border-white/30 hover:bg-white/25 text-white"
                : "bg-muted/70 border-border hover:bg-muted text-foreground"
            }`}
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
}
