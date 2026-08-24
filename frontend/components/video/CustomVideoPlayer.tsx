"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture,
  RotateCcw,
  RotateCw,
  Settings,
  Loader2,
} from "lucide-react";

interface CustomVideoPlayerProps {
  src: string;
  poster?: string | null;
  duration?: number | null;
  autoPlayOnClick?: boolean;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function CustomVideoPlayer({
  src,
  poster,
  duration: initialDuration,
}: CustomVideoPlayerProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [bufferedFraction, setBufferedFraction] = useState(0);

  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [showControls, setShowControls] = useState(true);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Lazy start playback
  const handleStartPlay = () => {
    setHasStarted(true);
    setIsPlaying(true);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {
          setIsPlaying(false);
        });
      }
    }, 50);
  };

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!hasStarted) {
      handleStartPlay();
      return;
    }
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [hasStarted, isPlaying]);

  // Handle Mute toggle
  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  // Handle Volume slider
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  // Handle Playback speed change
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setSpeedMenuOpen(false);
  };

  // Seek time update
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);

    // Calculate buffered fraction
    if (videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      if (videoRef.current.duration) {
        setBufferedFraction(bufferedEnd / videoRef.current.duration);
      }
    }
  };

  // Click on scrubber bar to seek
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * (duration || videoRef.current.duration || 0);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Hover over scrubber bar for timestamp preview
  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * (duration || 0));
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Picture in Picture
  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
      // Ignored if unsupported
    }
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!hasStarted) return;
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "m") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "f") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (videoRef.current) videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
      }
    },
    [hasStarted, togglePlay, duration]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Auto-hide controls after idle
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        if (!speedMenuOpen) setShowControls(false);
      }, 2500);
    }
  };

  // Initial Unloaded State: Shows Poster Thumbnail + Lazy Play Trigger (Zero bandwidth waste)
  if (!hasStarted) {
    return (
      <div
        onClick={handleStartPlay}
        className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/90 border border-border/70 shadow-md cursor-pointer group select-none my-2.5"
      >
        {poster ? (
          <img
            src={poster}
            alt="Video Poster"
            className="size-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
          />
        ) : (
          <div className="size-full bg-gradient-to-tr from-black via-zinc-900 to-zinc-800 flex items-center justify-center" />
        )}

        {/* Big YouTube-style Play Button */}
        <div className="absolute inset-0 bg-black/35 flex items-center justify-center group-hover:bg-black/20 transition-colors">
          <div className="size-14 sm:size-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:bg-red-500 transition-all duration-200 pl-1 ring-4 ring-white/20">
            <Play className="size-6 sm:size-7 fill-current" />
          </div>
        </div>

        {/* Duration Badge */}
        {duration > 0 && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-[11px] font-mono font-bold text-white shadow-md border border-white/10">
            {formatTime(duration)}
          </div>
        )}
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-border/70 shadow-md group select-none my-2.5"
    >
      <video
        ref={videoRef}
        src={src}
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (videoRef.current?.duration) {
            setDuration(videoRef.current.duration);
          }
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        className="size-full object-contain cursor-pointer"
        playsInline
      />

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
          <Loader2 className="size-10 animate-spin text-white" />
        </div>
      )}

      {/* Overlay YouTube Controls */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-8 pb-3 px-3.5 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Scrubber Progress Bar */}
        <div
          ref={progressBarRef}
          onClick={handleScrubberClick}
          onMouseMove={handleScrubberMouseMove}
          onMouseLeave={() => setHoverTime(null)}
          className="relative h-2 bg-white/25 rounded-full cursor-pointer group/scrubber flex items-center mb-2.5"
        >
          {/* Buffered Progress */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-white/40 rounded-full transition-all duration-150"
            style={{ width: `${bufferedFraction * 100}%` }}
          />

          {/* Current Played Progress */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-red-600 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Scrubber Handle Thumb */}
          <div
            className="absolute size-3.5 bg-red-600 rounded-full -translate-x-1/2 shadow-md scale-0 group-hover/scrubber:scale-100 transition-transform ring-2 ring-white"
            style={{ left: `${progressPercent}%` }}
          />

          {/* Hover Timestamp Tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 text-[10px] font-mono font-bold text-white border border-white/20 pointer-events-none shadow-md"
              style={{ left: `${hoverPosition}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Bottom Controls Row */}
        <div className="flex items-center justify-between gap-2 text-white">
          {/* Left: Play/Pause, Volume, Time */}
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="hover:text-red-500 transition-colors p-1 cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="size-5 fill-current" />
              ) : (
                <Play className="size-5 fill-current" />
              )}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                type="button"
                onClick={toggleMute}
                className="hover:text-red-500 transition-colors p-1 cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="size-5" />
                ) : (
                  <Volume2 className="size-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 accent-red-600 bg-white/30 rounded-lg cursor-pointer opacity-0 group-hover/vol:opacity-100 transition-opacity"
              />
            </div>

            {/* Time Display */}
            <span className="text-xs font-mono font-semibold opacity-90 select-none">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right: Speed, PiP, Fullscreen */}
          <div className="flex items-center gap-2 relative">
            {/* Speed Settings Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSpeedMenuOpen((prev) => !prev)}
                className="px-2 py-0.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/10 transition-colors cursor-pointer"
              >
                {playbackSpeed}x
              </button>

              {speedMenuOpen && (
                <div className="absolute bottom-9 right-0 bg-black/95 border border-white/20 rounded-xl p-1 shadow-2xl flex flex-col gap-0.5 min-w-[70px] z-50 animate-in fade-in zoom-in-95">
                  {[0.5, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSpeedChange(s)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg text-left transition-colors cursor-pointer ${
                        playbackSpeed === s
                          ? "bg-red-600 text-white"
                          : "hover:bg-white/15 text-white/90"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Picture in Picture */}
            <button
              type="button"
              onClick={togglePiP}
              className="hover:text-red-500 transition-colors p-1 cursor-pointer hidden sm:block"
              title="Picture in Picture"
            >
              <PictureInPicture className="size-4" />
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="hover:text-red-500 transition-colors p-1 cursor-pointer"
              title="Fullscreen"
            >
              {isFullscreen ? (
                <Minimize className="size-5" />
              ) : (
                <Maximize className="size-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
