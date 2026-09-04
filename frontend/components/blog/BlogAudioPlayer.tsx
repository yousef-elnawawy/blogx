"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Gauge,
  X,
  Minimize2,
  Maximize2,
  Headphones,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BlogAudioPlayerProps {
  title: string;
  content: string;
  authorName?: string;
  className?: string;
  onActiveSentenceChange?: (sentenceIndex: number, text: string) => void;
  onClose?: () => void;
}

/**
 * Strips markdown and divides content into natural sentences for speech synthesis.
 */
export function prepareSpokenSentences(title: string, markdown: string): string[] {
  if (!markdown) return [title];

  // 1. Remove code blocks
  let clean = markdown.replace(/```[\s\S]*?```/g, "");

  // 2. Remove markdown tables
  clean = clean.replace(/\|.*\|/g, "");

  // 3. Remove image markdown: ![alt](url)
  clean = clean.replace(/!\[(.*?)\]\(.*?\)/g, "");

  // 4. Remove standalone URLs
  clean = clean.replace(/https?:\/\/[^\s]+/g, "");

  // 5. Remove alert callout tags: > [!NOTE], etc.
  clean = clean.replace(/>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/gi, "");

  // 6. Clean markdown links: [text](url) -> text
  clean = clean.replace(/\[(.*?)\]\(.*?\)/g, "$1");

  // 7. Clean formatting characters: *, #, >, `, ~, -
  clean = clean.replace(/[*#>`~_]/g, " ");

  // 8. Split into sentences by punctuation (. ! ? \n or Arabic punctuation ؟ .)
  const rawSentences = clean
    .split(/(?<=[.!?؟\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3 && !/^\d+$/.test(s));

  return [title, ...rawSentences];
}

export default function BlogAudioPlayer({
  title,
  content,
  authorName,
  className,
  onActiveSentenceChange,
  onClose,
}: BlogAudioPlayerProps) {
  const sentences = useMemo(
    () => prepareSpokenSentences(title, content),
    [title, content]
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [rate, setRate] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  const currentIdxRef = useRef(0);
  currentIdxRef.current = currentIdx;

  // Detect language
  const isArabic = useMemo(() => {
    return /[\u0600-\u06FF]/.test(title + content);
  }, [title, content]);

  // Estimate total listening duration (avg 130 words/min)
  const totalDurationMinutes = useMemo(() => {
    const totalWords = (title + " " + content).split(/\s+/).length;
    return Math.max(1, Math.ceil(totalWords / 130));
  }, [title, content]);

  // Initialize Speech Synthesis and find best matching voice
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSupported(false);
      return;
    }

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      if (isArabic) {
        // Find best Arabic voice
        const arVoice =
          voices.find((v) => v.lang.startsWith("ar") && v.localService) ||
          voices.find((v) => v.lang.startsWith("ar")) ||
          voices.find((v) => v.lang.includes("ar"));
        if (arVoice) setSelectedVoice(arVoice);
      } else {
        // Find natural English voice
        const enVoice =
          voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.localService)) ||
          voices.find((v) => v.lang.startsWith("en"));
        if (enVoice) setSelectedVoice(enVoice);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isArabic]);

  // Speak a specific sentence
  const speakSentence = (index: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (index < 0 || index >= sentences.length) {
      setIsPlaying(false);
      setCurrentIdx(0);
      return;
    }

    window.speechSynthesis.cancel();

    const textToSpeak = sentences[index];
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.lang = isArabic ? "ar-SA" : "en-US";
    utterance.rate = rate;
    utterance.volume = isMuted ? 0 : 1;

    utterance.onstart = () => {
      setCurrentIdx(index);
      if (onActiveSentenceChange) {
        onActiveSentenceChange(index, textToSpeak);
      }
    };

    utterance.onend = () => {
      if (isPlayingRef.current) {
        if (index + 1 < sentences.length) {
          speakSentence(index + 1);
        } else {
          setIsPlaying(false);
          setCurrentIdx(0);
        }
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== "canceled") {
        console.warn("Speech synthesis error:", e.error);
        setIsPlaying(false);
      }
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleTogglePlay = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      speakSentence(currentIdx);
    } else {
      setIsPlaying(false);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }
  };

  const handleSkipForward = () => {
    const nextIdx = Math.min(sentences.length - 1, currentIdx + 2);
    setCurrentIdx(nextIdx);
    if (isPlaying) {
      speakSentence(nextIdx);
    }
  };

  const handleSkipBackward = () => {
    const prevIdx = Math.max(0, currentIdx - 2);
    setCurrentIdx(prevIdx);
    if (isPlaying) {
      speakSentence(prevIdx);
    }
  };

  const handleSpeedCycle = () => {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    const nextIndex = (speeds.indexOf(rate) + 1) % speeds.length;
    const newRate = speeds[nextIndex];
    setRate(newRate);
    if (isPlaying) {
      speakSentence(currentIdx);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(e.target.value, 10);
    setCurrentIdx(newIndex);
    if (isPlaying) {
      speakSentence(newIndex);
    }
  };

  const handleStopAndClose = () => {
    setIsPlaying(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (onClose) onClose();
  };

  if (!isSupported) {
    return null;
  }

  const progressPercent = Math.round(
    sentences.length > 0 ? (currentIdx / sentences.length) * 100 : 0
  );

  // 1. Minimized Floating Pill Mode
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 animate-in slide-in-from-bottom-5 duration-200">
        <div className="flex items-center gap-2 p-2 px-3 rounded-full bg-card/95 backdrop-blur-md border border-border shadow-xl ring-1 ring-primary/20">
          <Button
            size="icon"
            variant="default"
            onClick={handleTogglePlay}
            className="size-8 rounded-full cursor-pointer shrink-0"
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 fill-current ml-0.5" />}
          </Button>

          <div className="flex flex-col min-w-0 pr-1 max-w-[130px] sm:max-w-[180px]">
            <span className="text-xs font-bold text-foreground truncate">{title}</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {progressPercent}% · {rate}x
            </span>
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsMinimized(false)}
            className="size-7 rounded-full text-muted-foreground hover:text-foreground"
            title="Maximize audio player"
          >
            <Maximize2 className="size-3.5" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={handleStopAndClose}
            className="size-7 rounded-full text-muted-foreground hover:text-destructive"
            title="Close player"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // 2. Full Player (Hero / Header Bar)
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card/75 backdrop-blur-md p-4 sm:p-5 shadow-sm space-y-3 transition-all",
        isPlaying && "ring-1 ring-primary/30 shadow-md",
        className
      )}
    >
      {/* Player Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="grid place-items-center size-9 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
            <Headphones className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                Audio Story Reader
              </h4>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Sparkles className="size-2.5" />
                AI Voice
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {authorName ? `AI narration for story by ${authorName}` : "Listen to full story on the go"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsMinimized(true)}
            className="size-7 rounded-md text-muted-foreground hover:text-foreground"
            title="Minimize"
          >
            <Minimize2 className="size-3.5" />
          </Button>
          {onClose && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleStopAndClose}
              className="size-7 rounded-md text-muted-foreground hover:text-destructive"
              title="Close"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Waveform Animation + Currently Speaking Text Excerpt */}
      {isPlaying && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-primary/5 border border-primary/15 text-xs text-foreground/90">
          {/* Animated Waveform Equalizer */}
          <div className="flex items-end gap-0.5 h-3.5 shrink-0">
            <span className="w-1 bg-primary rounded-full animate-bounce [animation-delay:0ms] h-full" />
            <span className="w-1 bg-primary rounded-full animate-bounce [animation-delay:150ms] h-3" />
            <span className="w-1 bg-primary rounded-full animate-bounce [animation-delay:300ms] h-full" />
            <span className="w-1 bg-primary rounded-full animate-bounce [animation-delay:75ms] h-2" />
          </div>
          <p className="truncate text-xs text-foreground/80 italic">
            &ldquo;{sentences[currentIdx] || title}&rdquo;
          </p>
        </div>
      )}

      {/* Progress Bar Slider */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={Math.max(0, sentences.length - 1)}
          value={currentIdx}
          onChange={handleSeek}
          className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span>
            {currentIdx + 1} / {sentences.length} sentences
          </span>
          <span>
            {progressPercent}% complete · ~{totalDurationMinutes} min
          </span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between pt-1">
        {/* Playback Speed */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSpeedCycle}
          className="h-8 px-2.5 rounded-lg text-xs font-mono font-semibold gap-1"
          title="Playback speed"
        >
          <Gauge className="size-3" />
          <span>{rate}x</span>
        </Button>

        {/* Center Transport Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSkipBackward}
            className="size-8 rounded-full text-muted-foreground hover:text-foreground"
            title="Rewind ~10s"
          >
            <RotateCcw className="size-4" />
          </Button>

          <Button
            size="icon"
            variant="default"
            onClick={handleTogglePlay}
            className="size-10 rounded-full cursor-pointer shadow-sm hover:scale-105 active:scale-95 transition-transform"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4 fill-current ml-0.5" />
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={handleSkipForward}
            className="size-8 rounded-full text-muted-foreground hover:text-foreground"
            title="Fast forward ~10s"
          >
            <RotateCw className="size-4" />
          </Button>
        </div>

        {/* Mute Toggle */}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            const nextMuted = !isMuted;
            setIsMuted(nextMuted);
            if (isPlaying) {
              speakSentence(currentIdx);
            }
          }}
          className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="size-4 text-destructive" /> : <Volume2 className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
