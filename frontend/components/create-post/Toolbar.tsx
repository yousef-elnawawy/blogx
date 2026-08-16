"use client";

import { useRef, useState, useEffect } from "react";
import {
  Image as ImageIcon,
  Hash,
  AtSign,
  Smile,
  BookOpen,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  onImageSelect?: (files: FileList) => void;
  onInsertHashtag: () => void;
  onInsertMention?: () => void;
  onInsertEmoji?: (emoji: string) => void;
  onOpenArticleEditor?: () => void;
  imageCount?: number;
  contentLength?: number;
  maxContentLength?: number;
}

const POPULAR_EMOJIS = [
  "😀", "😂", "🔥", "🚀", "❤️", "✨",
  "👍", "🎉", "💡", "🧠", "💻", "⚡",
  "🙌", "💯", "👏", "😍", "🤔", "🎯",
  "⭐", "📌", "📢", "💬", "👀", "🏆"
];

export default function Toolbar({
  onImageSelect,
  onInsertHashtag,
  onInsertMention,
  onInsertEmoji,
  onOpenArticleEditor,
  imageCount = 0,
  contentLength = 0,
  maxContentLength = 1000,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);
  const maxImages = 10;
  const canAddMore = imageCount < maxImages;

  const isNearLimit = contentLength > maxContentLength * 0.85;
  const isOverLimit = contentLength > maxContentLength;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    }
    if (emojiOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [emojiOpen]);

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) onImageSelect?.(e.target.files);
          e.target.value = "";
        }}
      />

      {/* 1. Add Image */}
      <button
        type="button"
        aria-label="Add image"
        disabled={!canAddMore}
        onClick={() => fileInputRef.current?.click()}
        className="size-8 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        title="Add Photos / Media"
      >
        <ImageIcon className="size-[17px]" />
      </button>

      {/* 2. Insert Hashtag */}
      <button
        type="button"
        aria-label="Add hashtag"
        onClick={onInsertHashtag}
        className="size-8 rounded-full flex items-center justify-center text-brand-hashtag hover:bg-brand-hashtag-subtle active:scale-95 transition-all cursor-pointer"
        title="Add Hashtag (#)"
      >
        <Hash className="size-[17px]" />
      </button>

      {/* 3. Insert Mention */}
      {onInsertMention && (
        <button
          type="button"
          aria-label="Mention someone"
          onClick={onInsertMention}
          className="size-8 rounded-full flex items-center justify-center text-brand-mention hover:bg-brand-mention-subtle active:scale-95 transition-all cursor-pointer"
          title="Mention User (@)"
        >
          <AtSign className="size-[17px]" />
        </button>
      )}

      {/* 4. Emoji Picker */}
      {onInsertEmoji && (
        <div className="relative" ref={emojiRef}>
          <button
            type="button"
            aria-label="Add emoji"
            onClick={() => setEmojiOpen(!emojiOpen)}
            className="size-8 rounded-full flex items-center justify-center text-amber-500 hover:bg-amber-500/10 active:scale-95 transition-all cursor-pointer"
            title="Add Emoji"
          >
            <Smile className="size-[17px]" />
          </button>

          {emojiOpen && (
            <div className="absolute bottom-full left-0 mb-2 z-50 w-64 p-2.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/40">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Popular Emojis
                </span>
                <button
                  type="button"
                  onClick={() => setEmojiOpen(false)}
                  className="p-0.5 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {POPULAR_EMOJIS.map((emoji, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onInsertEmoji(emoji);
                      setEmojiOpen(false);
                    }}
                    className="size-8 flex items-center justify-center text-lg rounded-lg hover:bg-muted active:scale-125 transition-transform cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Long Article Shortcut */}
      {onOpenArticleEditor && (
        <button
          type="button"
          aria-label="Write Article"
          onClick={onOpenArticleEditor}
          className="size-8 rounded-full flex items-center justify-center text-brand-article hover:bg-brand-article-subtle active:scale-95 transition-all cursor-pointer hidden sm:flex"
          title="Write Long Article"
        >
          <BookOpen className="size-[17px]" />
        </button>
      )}

      {/* Counter & Image count tags */}
      <div className="flex items-center gap-1.5 ml-1">
        {imageCount > 0 && (
          <span className="text-[10px] font-bold text-muted-foreground px-2 py-0.5 rounded-full bg-muted/80 shrink-0">
            {imageCount}/{maxImages}
          </span>
        )}

        {contentLength > 0 && (
          <div className="flex items-center gap-1">
            <span
              className={cn(
                "text-[10px] font-medium font-mono tabular-nums",
                isOverLimit
                  ? "text-red-500 font-bold"
                  : isNearLimit
                  ? "text-amber-500"
                  : "text-muted-foreground/70"
              )}
            >
              {maxContentLength - contentLength}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}