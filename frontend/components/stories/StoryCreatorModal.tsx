"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Type,
  ImageIcon,
  Upload,
  Loader2,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Trash2,
  Check,
} from "lucide-react";
import { cn, getAvatarUrl } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface StoryCreatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoryCreated: () => void;
}

// Iconic Instagram Story Gradients
const INSTAGRAM_BACKGROUNDS = [
  { id: "ig_sunset", name: "Sunset", style: "bg-linear-to-tr from-amber-500 via-rose-500 to-purple-700 text-white" },
  { id: "ig_velvet", name: "Velvet", style: "bg-linear-to-tr from-purple-900 via-indigo-900 to-rose-950 text-white" },
  { id: "ig_neon", name: "Neon Pink", style: "bg-linear-to-tr from-fuchsia-600 via-pink-600 to-rose-600 text-white" },
  { id: "ig_emerald", name: "Emerald", style: "bg-linear-to-tr from-emerald-600 via-teal-700 to-zinc-950 text-white" },
  { id: "ig_crimson", name: "Ruby", style: "bg-linear-to-tr from-rose-700 via-red-800 to-zinc-950 text-white" },
  { id: "ig_ocean", name: "Oceanic", style: "bg-linear-to-tr from-blue-600 via-indigo-700 to-slate-950 text-white" },
  { id: "ig_midnight", name: "Obsidian", style: "bg-linear-to-b from-zinc-900 to-black text-white" },
];

// Instagram Fonts
const INSTAGRAM_FONTS = [
  { id: "modern", label: "Modern", className: "font-sans font-bold tracking-tight" },
  { id: "classic", label: "Classic", className: "font-serif italic font-semibold" },
  { id: "cairo", label: "Cairo", className: "font-[family-name:var(--font-cairo)] font-extrabold" },
  { id: "typewriter", label: "Typewriter", className: "font-mono tracking-wider font-semibold" },
  { id: "neon", label: "Neon", className: "font-sans font-black uppercase tracking-widest drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]" },
];

// Color Swatches
const COLOR_SWATCHES = [
  "#ffffff",
  "#000000",
  "#f43f5e",
  "#ec4899",
  "#a855f7",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#eab308",
  "#f97316",
];

export default function StoryCreatorModal({
  open,
  onOpenChange,
  onStoryCreated,
}: StoryCreatorModalProps) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  const [mode, setMode] = useState<"text" | "media">("text");

  // Text state
  const [text, setText] = useState("");
  const [bgIndex, setBgIndex] = useState(0);
  const [fontIndex, setFontIndex] = useState(0);
  const [align, setAlign] = useState<"left" | "center" | "right">("center");
  const [textColor, setTextColor] = useState("#ffffff");
  const [hasHighlight, setHasHighlight] = useState(false);

  // Media state
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [mediaOverlayText, setMediaOverlayText] = useState("");

  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open && mode === "text") {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [open, mode]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be under 50MB");
      return;
    }

    setMediaFile(file);
    const isVideo = file.type.startsWith("video/");
    setMediaType(isVideo ? "video" : "image");
    setMediaPreview(URL.createObjectURL(file));
    setMode("media");
  };

  const handlePublish = async () => {
    if (mode === "text" && !text.trim()) {
      toast.error("Type something to share");
      return;
    }

    if (mode === "media" && !mediaFile) {
      toast.error("Upload a photo or video");
      return;
    }

    setPublishing(true);

    try {
      const formData = new FormData();
      const currentBg = INSTAGRAM_BACKGROUNDS[bgIndex];
      const currentFont = INSTAGRAM_FONTS[fontIndex];

      if (mode === "text") {
        formData.append("type", "text");
        formData.append("caption", text.trim());
        formData.append(
          "background_style",
          JSON.stringify({
            preset: currentBg.id,
            gradientStyle: currentBg.style,
            fontFamily: currentFont.id,
            align: align,
            color: textColor,
            highlight: hasHighlight ? "box" : "none",
          })
        );
      } else {
        formData.append("type", mediaType);
        if (mediaFile) {
          formData.append("media", mediaFile);
        }
        if (mediaOverlayText.trim()) {
          formData.append("caption", mediaOverlayText.trim());
          formData.append(
            "overlay_data",
            JSON.stringify([
              {
                text: mediaOverlayText.trim(),
                color: textColor,
                hasBg: hasHighlight,
                font: currentFont.id,
              },
            ])
          );
        }
      }

      await api.post("/api/stories", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Story shared to your profile");
      onStoryCreated();
      onOpenChange(false);
      reset();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to share story");
    } finally {
      setPublishing(false);
    }
  };

  const reset = () => {
    setText("");
    setBgIndex(0);
    setFontIndex(0);
    setAlign("center");
    setTextColor("#ffffff");
    setHasHighlight(false);
    setMediaFile(null);
    setMediaPreview(null);
    setMediaOverlayText("");
    setMode("text");
  };

  if (!mounted || !open) return null;

  const currentBg = INSTAGRAM_BACKGROUNDS[bgIndex];
  const currentFont = INSTAGRAM_FONTS[fontIndex];
  const userAvatar = getAvatarUrl(user?.avatar);

  const modalContent = (
    <div className="fixed inset-0 z-9999 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* ── Main 9:16 Instagram Canvas Card ── */}
      <div className="relative w-full h-full sm:h-[90vh] sm:max-h-[820px] sm:max-w-[430px] sm:rounded-3xl overflow-hidden bg-zinc-950 flex flex-col justify-between shadow-2xl border border-white/15">
        {/* ── TOP CONTROLS BAR ── */}
        <div className="relative z-30 p-4 pt-3 flex items-center justify-between text-white bg-linear-to-b from-black/80 to-transparent">
          {/* Close Button */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-transform active:scale-90 cursor-pointer"
          >
            <X className="size-5" />
          </button>

          {/* Top Customization Pill Controls */}
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
            {/* Font Family Cycler */}
            <button
              type="button"
              onClick={() => setFontIndex((prev) => (prev + 1) % INSTAGRAM_FONTS.length)}
              className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/15 hover:bg-white/25 transition-colors cursor-pointer"
            >
              {currentFont.label}
            </button>

            {/* Text Alignment */}
            <button
              type="button"
              onClick={() => {
                if (align === "center") setAlign("left");
                else if (align === "left") setAlign("right");
                else setAlign("center");
              }}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
            >
              {align === "left" && <AlignLeft className="size-4" />}
              {align === "center" && <AlignCenter className="size-4" />}
              {align === "right" && <AlignRight className="size-4" />}
            </button>

            {/* Highlight Box Toggle (Instagram 'A' button) */}
            <button
              type="button"
              onClick={() => setHasHighlight((h) => !h)}
              className={cn(
                "size-7 rounded-lg text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer",
                hasHighlight ? "bg-white text-black font-black" : "border border-white/40 text-white"
              )}
            >
              A
            </button>
          </div>

          {/* Mode Switcher / Gallery Trigger */}
          <div className="flex items-center gap-1.5">
            {mode === "text" ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-transform active:scale-90 cursor-pointer"
                title="Add photo or video"
              >
                <ImageIcon className="size-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode("text");
                  setMediaFile(null);
                  setMediaPreview(null);
                }}
                className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-transform active:scale-90 cursor-pointer"
                title="Switch to text mode"
              >
                <Type className="size-5" />
              </button>
            )}
          </div>
        </div>

        {/* ── CENTRAL CANVAS (CLICK & TYPE) ── */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden p-6">
          {mode === "text" ? (
            /* ── Text Canvas ── */
            <div
              className={cn(
                "absolute inset-0 size-full p-8 flex items-center justify-center transition-all duration-300",
                currentBg.style
              )}
              onClick={() => textareaRef.current?.focus()}
            >
              <div
                className={cn(
                  "w-full transition-all text-center",
                  align === "left" && "text-left",
                  align === "center" && "text-center",
                  align === "right" && "text-right"
                )}
              >
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Tap to type..."
                  rows={4}
                  maxLength={300}
                  className={cn(
                    "w-full bg-transparent border-none focus:outline-none resize-none placeholder:text-white/60 leading-relaxed drop-shadow-md text-2xl sm:text-3xl",
                    currentFont.className,
                    hasHighlight && "bg-black/70 px-4 py-2 rounded-2xl backdrop-blur-xs inline-block shadow-xl"
                  )}
                  style={{ color: textColor, textAlign: align }}
                />
              </div>
            </div>
          ) : (
            /* ── Photo/Video Canvas ── */
            <div className="absolute inset-0 size-full bg-black flex items-center justify-center overflow-hidden">
              {mediaPreview && (
                mediaType === "video" ? (
                  <video src={mediaPreview} autoPlay loop muted playsInline className="size-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaPreview} alt="Story" className="size-full object-cover" />
                )
              )}

              {/* Text Overlay on Media */}
              <div className="absolute inset-x-6 top-1/3 -translate-y-1/2 z-20">
                <input
                  type="text"
                  placeholder="Add text..."
                  value={mediaOverlayText}
                  onChange={(e) => setMediaOverlayText(e.target.value)}
                  maxLength={100}
                  className={cn(
                    "w-full text-center text-xl font-bold bg-transparent border-none focus:outline-none placeholder:text-white/60",
                    currentFont.className,
                    hasHighlight && "bg-black/70 px-4 py-2 rounded-2xl backdrop-blur-xs text-white shadow-xl"
                  )}
                  style={{ color: textColor }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── BOTTOM CONTROLS & PUBLISH BAR ── */}
        <div className="relative z-30 p-4 pb-5 bg-linear-to-t from-black/90 via-black/50 to-transparent space-y-3.5">
          {/* Horizontal Color Palette */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto scrollbar-none px-2 py-1">
            {/* Background Gradient Cycle Button */}
            {mode === "text" && (
              <button
                type="button"
                onClick={() => setBgIndex((prev) => (prev + 1) % INSTAGRAM_BACKGROUNDS.length)}
                className="size-7 rounded-full p-0.5 bg-linear-to-tr from-amber-500 via-rose-500 to-purple-600 border border-white/60 hover:scale-115 active:scale-95 transition-transform cursor-pointer shrink-0 shadow-md mr-2"
                title="Cycle background"
              >
                <div className="size-full rounded-full bg-black/40 flex items-center justify-center">
                  <Palette className="size-3.5 text-white" />
                </div>
              </button>
            )}

            {/* Text Color Swatches */}
            {COLOR_SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setTextColor(color)}
                className={cn(
                  "size-6 rounded-full transition-transform hover:scale-125 active:scale-95 cursor-pointer shrink-0 border",
                  textColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110 border-white" : "border-white/30"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* ── Instagram "Your story" Publish Button ── */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing || (mode === "text" && !text.trim()) || (mode === "media" && !mediaFile)}
              className="flex-1 flex items-center gap-3 py-2.5 px-4 rounded-full bg-white/15 hover:bg-white/25 active:scale-98 transition-all border border-white/20 backdrop-blur-md cursor-pointer disabled:opacity-40 group shadow-lg"
            >
              {/* Instagram Avatar with Gradient Ring */}
              <div className="relative size-8 rounded-full p-[1.5px] bg-linear-to-tr from-amber-500 via-rose-500 to-fuchsia-600 shrink-0">
                <div className="size-full rounded-full overflow-hidden bg-zinc-900">
                  {userAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={userAvatar} alt="You" className="size-full object-cover" />
                  ) : (
                    <div className="size-full flex items-center justify-center text-[10px] font-bold text-white">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-left min-w-0 flex-1">
                <span className="block text-xs font-bold text-white group-hover:text-rose-300 transition-colors truncate">
                  Your story
                </span>
                <span className="block text-[10px] text-white/70">
                  Share for 24h
                </span>
              </div>

              {publishing ? (
                <Loader2 className="size-4 animate-spin text-white" />
              ) : (
                <span className="text-xs font-bold text-rose-400 group-hover:translate-x-0.5 transition-transform">
                  Share &rarr;
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
