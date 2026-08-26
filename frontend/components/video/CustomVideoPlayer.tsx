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
  const [isEnded, setIsEnded] = useState(false);
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

  // Double tap to seek state
  const [doubleTapSide, setDoubleTapSide] = useState<"left" | "right" | null>(null);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Lazy start playback
  const handleStartPlay = () => {
    setHasStarted(true);
    setIsPlaying(true);
    setIsEnded(false);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {
          setIsPlaying(false);
        });
      }
    }, 50);
  };

  // Replay from beginning
  const handleReplay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    setCurrentTime(0);
    setIsEnded(false);
    setIsPlaying(true);
    videoRef.current.play().catch(() => {
      setIsPlaying(false);
    });
  };

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!hasStarted) {
      handleStartPlay();
      return;
    }
    if (isEnded) {
      handleReplay();
      return;
    }
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {});
    }
  }, [hasStarted, isPlaying, isEnded]);

  // Double tap detection on video area
  const handleVideoAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !videoRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const widthFraction = clickX / rect.width;

    clickCountRef.current += 1;

    if (clickCountRef.current === 1) {
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
        togglePlay();
      }, 240);
    } else if (clickCountRef.current === 2) {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickCountRef.current = 0;

      const vid = videoRef.current;
      const totalDur = vid.duration || duration || 0;

      if (widthFraction < 0.45) {
        // Double tap left -> Rewind 10s
        const target = Math.max(0, vid.currentTime - 10);
        vid.currentTime = target;
        setCurrentTime(target);
        setIsEnded(false);
        setDoubleTapSide("left");
        setTimeout(() => setDoubleTapSide(null), 650);
      } else if (widthFraction > 0.55) {
        // Double tap right -> Forward 10s
        const target = Math.min(totalDur, vid.currentTime + 10);
        vid.currentTime = target;
        setCurrentTime(target);
        setIsEnded(false);
        setDoubleTapSide("right");
        setTimeout(() => setDoubleTapSide(null), 650);
      } else {
        togglePlay();
      }
    }
  };

  const pendingSeekRef = useRef<number | null>(null);

  // Apply seek helper
  const applySeek = useCallback((targetTime: number) => {
    if (!videoRef.current) return;
    const vid = videoRef.current;
    vid.currentTime = targetTime;
    setCurrentTime(targetTime);
    setIsEnded(false);
    vid.play().then(() => setIsPlaying(true)).catch(() => {});
  }, []);

  // Listen for global post timestamp click events
  useEffect(() => {
    const handleCustomSeek = (e: any) => {
      const targetTime = Number(e.detail?.time);
      if (isNaN(targetTime) || targetTime < 0) return;

      pendingSeekRef.current = targetTime;

      if (!hasStarted) {
        setHasStarted(true);
        setIsPlaying(true);
        setIsEnded(false);
      } else if (videoRef.current) {
        applySeek(targetTime);
        pendingSeekRef.current = null;
      }
    };

    window.addEventListener("blogx-video-seek", handleCustomSeek);
    return () => window.removeEventListener("blogx-video-seek", handleCustomSeek);
  }, [hasStarted, applySeek]);

  // Toggle Mute
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

  // Seek to position helper
  const seekToPosition = useCallback((clientX: number) => {
    if (!progressBarRef.current || !videoRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;

    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const vid = videoRef.current;
    
    // Get reliable duration
    let totalDuration = duration;
    if (vid.duration && !isNaN(vid.duration) && isFinite(vid.duration) && vid.duration > 0) {
      totalDuration = vid.duration;
      if (totalDuration !== duration) setDuration(totalDuration);
    }

    if (!totalDuration || isNaN(totalDuration) || totalDuration <= 0) return;

    const newTime = pos * totalDuration;
    if (isNaN(newTime) || !isFinite(newTime)) return;

    vid.currentTime = newTime;
    setCurrentTime(newTime);
    setIsEnded(false);
  }, [duration]);

  // Click on scrubber bar to seek
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    seekToPosition(e.clientX);
  };

  // Dragging / scrubbing state
  const [isScrubbing, setIsScrubbing] = useState(false);

  const handleScrubberMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsScrubbing(true);
    seekToPosition(e.clientX);
  };

  useEffect(() => {
    if (!isScrubbing) return;

    const handleMouseMove = (e: MouseEvent) => {
      seekToPosition(e.clientX);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isScrubbing, seekToPosition]);

  // Hover over scrubber bar for timestamp preview
  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const vid = videoRef.current;
    const totalDuration = vid?.duration && !isNaN(vid.duration) && isFinite(vid.duration) && vid.duration > 0
      ? vid.duration
      : duration;
    setHoverPosition(pos * 100);
    setHoverTime(pos * (totalDuration || 0));
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

  // Auto-hide controls during playback
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        if (!speedMenuOpen) {
          setShowControls(false);
        }
      }, 3000);
    }
  };

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Initial Unloaded State: YouTube/Instagram style poster with duration chip & center play button
  if (!hasStarted) {
    return (
      <div
        onClick={handleStartPlay}
        className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/90 border border-border/70 shadow-md cursor-pointer group select-none my-2.5"
      >
        {/* Video Thumbnail Background */}
        {poster ? (
          <img
            src={poster}
            alt="Video Thumbnail"
            className="size-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="size-full bg-gradient-to-tr from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
            <Play className="size-12 text-muted-foreground/40" />
          </div>
        )}

        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />

        {/* Center YouTube Style Play Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-16 sm:size-18 rounded-full bg-red-600 group-hover:bg-red-500 text-white flex items-center justify-center shadow-2xl transition-all duration-200 group-hover:scale-110 active:scale-95 ring-4 ring-white/20">
            <Play className="size-7 sm:size-8 fill-current ml-1" />
          </div>
        </div>

        {/* Duration Badge Bottom Right */}
        {duration > 0 && (
          <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[11px] font-mono font-semibold text-white border border-white/10 shadow-md">
            {formatTime(duration)}
          </div>
        )}
      </div>
    );
  }

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
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (videoRef.current?.duration && !isNaN(videoRef.current.duration) && isFinite(videoRef.current.duration)) {
            setDuration(videoRef.current.duration);
          }
          if (pendingSeekRef.current !== null && videoRef.current) {
            const target = pendingSeekRef.current;
            pendingSeekRef.current = null;
            applySeek(target);
          }
        }}
        onCanPlay={() => {
          if (pendingSeekRef.current !== null && videoRef.current) {
            const target = pendingSeekRef.current;
            pendingSeekRef.current = null;
            applySeek(target);
          }
        }}
        onDurationChange={() => {
          if (videoRef.current?.duration && !isNaN(videoRef.current.duration) && isFinite(videoRef.current.duration)) {
            setDuration(videoRef.current.duration);
          }
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
          setIsEnded(false);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setIsEnded(true);
          setShowControls(true);
        }}
        className="size-full object-contain cursor-pointer"
        playsInline
      />

      {/* Double tap trigger overlay on top of video */}
      <div
        onClick={handleVideoAreaClick}
        className="absolute inset-0 z-10 cursor-pointer"
      />

      {/* Double-tap seek animated feedback ripples */}
      {doubleTapSide === "left" && (
        <div className="absolute inset-y-0 left-0 w-1/2 bg-white/10 backdrop-blur-xs flex flex-col items-center justify-center gap-1 text-white animate-in fade-in zoom-in-95 duration-200 z-20 pointer-events-none rounded-l-2xl">
          <RotateCcw className="size-8 animate-spin" />
          <span className="text-xs font-black tracking-wider">-10s</span>
        </div>
      )}

      {doubleTapSide === "right" && (
        <div className="absolute inset-y-0 right-0 w-1/2 bg-white/10 backdrop-blur-xs flex flex-col items-center justify-center gap-1 text-white animate-in fade-in zoom-in-95 duration-200 z-20 pointer-events-none rounded-r-2xl">
          <RotateCw className="size-8 animate-spin" />
          <span className="text-xs font-black tracking-wider">+10s</span>
        </div>
      )}

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none z-20">
          <Loader2 className="size-10 animate-spin text-white" />
        </div>
      )}

      {/* Replay Overlay when video ends */}
      {isEnded && (
        <div
          onClick={handleReplay}
          className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3.5 z-25 cursor-pointer animate-in fade-in zoom-in-95 duration-200"
        >
          <button
            type="button"
            onClick={handleReplay}
            className="size-16 sm:size-18 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95 ring-4 ring-white/20 cursor-pointer"
            title="Replay Video"
          >
            <RotateCcw className="size-7 sm:size-8" />
          </button>
          <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 shadow-lg text-white">
            <RotateCcw className="size-3.5" />
            <span className="text-xs sm:text-sm font-bold tracking-wide">
              Replay Video
            </span>
          </div>
        </div>
      )}

      {/* Overlay YouTube Controls */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-8 pb-3 px-3.5 transition-opacity duration-300 z-30 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Scrubber Progress Bar */}
        <div
          ref={progressBarRef}
          onClick={handleScrubberClick}
          onMouseDown={handleScrubberMouseDown}
          onMouseMove={handleScrubberMouseMove}
          onMouseLeave={() => !isScrubbing && setHoverTime(null)}
          className="relative h-2.5 bg-white/25 hover:h-3 rounded-full cursor-pointer group/scrubber flex items-center mb-2.5 transition-all"
        >
          {/* Buffered Progress */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-white/40 rounded-full transition-all duration-150 pointer-events-none"
            style={{ width: `${bufferedFraction * 100}%` }}
          />

          {/* Current Played Progress */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-red-600 rounded-full pointer-events-none"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Scrubber Handle Thumb */}
          <div
            className="absolute size-3.5 bg-red-600 rounded-full -translate-x-1/2 shadow-md scale-0 group-hover/scrubber:scale-100 transition-transform ring-2 ring-white pointer-events-none"
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
          {/* Left: Play/Pause/Replay, Volume, Time */}
          <div className="flex items-center gap-3">
            {/* Play/Pause/Replay Button */}
            <button
              type="button"
              onClick={isEnded ? handleReplay : togglePlay}
              className="hover:text-red-500 transition-colors p-1 cursor-pointer"
              title={isEnded ? "Replay Video" : isPlaying ? "Pause (k)" : "Play (k)"}
            >
              {isEnded ? (
                <RotateCcw className="size-5" />
              ) : isPlaying ? (
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

            {/* Time / Total Duration */}
            <div className="text-xs font-mono select-none opacity-90">
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1 text-white/50">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right: Settings/Speed, PiP, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Speed Menu Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSpeedMenuOpen(!speedMenuOpen)}
                className="hover:text-red-500 transition-colors p-1 flex items-center gap-0.5 text-xs font-bold cursor-pointer"
                title="Playback Speed"
              >
                <Settings className="size-4.5" />
                <span>{playbackSpeed}x</span>
              </button>

              {speedMenuOpen && (
                <div className="absolute bottom-8 right-0 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl py-1 w-24 shadow-2xl text-xs flex flex-col z-50 animate-in fade-in zoom-in-95">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => handleSpeedChange(speed)}
                      className={`px-3 py-1.5 text-left hover:bg-white/10 transition-colors ${
                        playbackSpeed === speed ? "text-red-500 font-bold" : "text-white"
                      }`}
                    >
                      {speed === 1 ? "Normal" : `${speed}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PiP */}
            <button
              type="button"
              onClick={togglePiP}
              className="hover:text-red-500 transition-colors p-1 cursor-pointer"
              title="Picture in Picture"
            >
              <PictureInPicture className="size-4.5" />
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="hover:text-red-500 transition-colors p-1 cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}
            >
              {isFullscreen ? (
                <Minimize className="size-4.5" />
              ) : (
                <Maximize className="size-4.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
