"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Trash2, Send, Pause, Play, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onSend, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Format recording timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Start recording
  const startRecording = async () => {
    if (disabled) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      toast.error("Microphone access denied or unavailable.");
    }
  };

  // Stop recording & prepare preview
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
  };

  // Cancel & discard recording
  const cancelRecording = () => {
    if (isRecording) {
      stopRecording();
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setIsRecording(false);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPreviewPlaying(false);
    setRecordingTime(0);
  };

  // Send the recorded voice note
  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob, recordingTime);
      cancelRecording();
    } else if (isRecording) {
      // If currently recording and send clicked, stop and immediately send
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, {
            type: mediaRecorderRef.current?.mimeType || "audio/webm",
          });
          onSend(blob, recordingTime || 1);
          cancelRecording();
        };
        mediaRecorderRef.current.stop();
      }
    }
  };

  // Toggle preview playback
  const togglePreviewPlay = () => {
    if (!audioUrl) return;

    if (!previewAudioRef.current) {
      const audio = new Audio(audioUrl);
      previewAudioRef.current = audio;

      audio.onended = () => {
        setIsPreviewPlaying(false);
      };
    }

    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current.play();
      setIsPreviewPlaying(true);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // If not recording and no preview blob, render mic icon trigger button
  if (!isRecording && !audioBlob) {
    return (
      <button
        type="button"
        onClick={startRecording}
        disabled={disabled}
        className="size-9 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-50"
        title="Record voice message"
      >
        <Mic className="size-5" />
      </button>
    );
  }

  // Active Recording or Preview State Bar
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border/80 rounded-2xl shadow-sm w-full animate-in fade-in duration-150">
      {/* Cancel / Trash */}
      <button
        type="button"
        onClick={cancelRecording}
        className="size-8 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors cursor-pointer shrink-0"
        title="Discard voice message"
      >
        <Trash2 className="size-4" />
      </button>

      {/* Recording Visuals / Preview Play */}
      <div className="flex-1 flex items-center gap-2.5 min-w-0">
        {isRecording ? (
          <>
            <span className="size-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-xs font-mono font-bold text-foreground">
              {formatTime(recordingTime)}
            </span>
            <div className="flex items-center gap-0.5 h-4 flex-1 overflow-hidden">
              {[...Array(16)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-red-500/70 rounded-full animate-pulse"
                  style={{
                    height: `${Math.sin(i + recordingTime) * 8 + 10}px`,
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={togglePreviewPlay}
              className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0"
            >
              {isPreviewPlaying ? (
                <Pause className="size-3.5 fill-current" />
              ) : (
                <Play className="size-3.5 fill-current pl-0.5" />
              )}
            </button>
            <span className="text-xs font-mono font-bold text-foreground">
              {formatTime(recordingTime)}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              Voice Note Ready
            </span>
          </>
        )}
      </div>

      {/* Stop & Preview button (if recording) */}
      {isRecording && (
        <button
          type="button"
          onClick={stopRecording}
          className="size-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shrink-0"
          title="Stop and preview"
        >
          <Square className="size-3.5 fill-current text-amber-500" />
        </button>
      )}

      {/* Send Button */}
      <button
        type="button"
        onClick={handleSend}
        className="size-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
        title="Send voice note"
      >
        <Send className="size-3.5" />
      </button>
    </div>
  );
}
