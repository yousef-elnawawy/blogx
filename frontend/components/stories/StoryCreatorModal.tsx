"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Type,
  ImageIcon,
  Video,
  Upload,
  Loader2,
  Sparkles,
  ArrowLeft,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  RotateCcw,
  Film,
  Smile,
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

type StoryMode = "text" | "image" | "video";
type CreatorStep = "select" | "create" | "preview";

// Curated Background Gradients for Text Stories
const STORY_BACKGROUNDS = [
  {
    id: "brand",
    name: "Brand Primary",
    style: "bg-gradient-to-tr from-primary via-primary/80 to-primary/60 text-primary-foreground",
    dot: "bg-primary",
  },
  {
    id: "sunset",
    name: "Sunset Ember",
    style: "bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-700 text-white",
    dot: "bg-gradient-to-r from-amber-500 to-rose-500",
  },
  {
    id: "ocean",
    name: "Oceanic Blue",
    style: "bg-gradient-to-tr from-blue-600 via-indigo-700 to-slate-950 text-white",
    dot: "bg-gradient-to-r from-blue-500 to-indigo-600",
  },
  {
    id: "emerald",
    name: "Emerald Forest",
    style: "bg-gradient-to-tr from-emerald-600 via-teal-700 to-zinc-950 text-white",
    dot: "bg-gradient-to-r from-emerald-500 to-teal-700",
  },
  {
    id: "crimson",
    name: "Crimson Rose",
    style: "bg-gradient-to-tr from-rose-700 via-red-800 to-zinc-950 text-white",
    dot: "bg-gradient-to-r from-rose-600 to-red-800",
  },
  {
    id: "violet",
    name: "Royal Violet",
    style: "bg-gradient-to-tr from-purple-800 via-fuchsia-800 to-indigo-950 text-white",
    dot: "bg-gradient-to-r from-purple-700 to-fuchsia-700",
  },
  {
    id: "obsidian",
    name: "Obsidian Black",
    style: "bg-gradient-to-b from-zinc-900 to-black text-white border border-white/10",
    dot: "bg-zinc-900",
  },
  {
    id: "pearl",
    name: "Clean Pearl",
    style: "bg-gradient-to-b from-white via-zinc-100 to-zinc-200 text-zinc-900",
    dot: "bg-zinc-200",
  },
];

const FONT_PRESETS = [
  { id: "modern", label: "Modern", className: "font-sans font-bold tracking-tight" },
  { id: "serif", label: "Editorial", className: "font-serif italic font-semibold" },
  { id: "mono", label: "Monospace", className: "font-mono tracking-wide font-medium" },
];

export default function StoryCreatorModal({
  open,
  onOpenChange,
  onStoryCreated,
}: StoryCreatorModalProps) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Workflow State
  const [step, setStep] = useState<CreatorStep>("select");
  const [mode, setMode] = useState<StoryMode>("text");

  // Text Story State
  const [text, setText] = useState("");
  const [bgIndex, setBgIndex] = useState(0);
  const [fontIndex, setFontIndex] = useState(0);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("center");

  // Media Story State (Photo / Video)
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  const [publishing, setPublishing] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open && step === "create" && mode === "text") {
      setTimeout(() => textInputRef.current?.focus(), 150);
    }
  }, [open, step, mode]);

  // Clean up object URLs on unmount or reset
  useEffect(() => {
    return () => {
      if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview);
      }
    };
  }, [mediaPreview]);

  const handleClose = () => {
    if (publishing) return;
    onOpenChange(false);
    setTimeout(reset, 200);
  };

  const reset = () => {
    setStep("select");
    setMode("text");
    setText("");
    setBgIndex(0);
    setFontIndex(0);
    setTextAlign("center");
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaFile(null);
    setMediaPreview(null);
    setCaption("");
  };

  const handleSelectMode = (chosenMode: StoryMode) => {
    setMode(chosenMode);
    if (chosenMode === "text") {
      setStep("create");
    } else if (chosenMode === "image") {
      imageInputRef.current?.click();
    } else if (chosenMode === "video") {
      videoInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    const file = e.target.files?.[0];
    // Reset file input value so same file can be re-selected if needed
    e.target.value = "";

    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be under 50MB");
      return;
    }

    if (type === "video" && !file.type.startsWith("video/")) {
      toast.error("Please choose a valid video file");
      return;
    }

    if (type === "image" && !file.type.startsWith("image/")) {
      toast.error("Please choose a valid image file");
      return;
    }

    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setMediaFile(file);
    setMediaPreview(previewUrl);
    setMode(type);
    setStep("preview");
  };

  const handlePublish = async () => {
    if (mode === "text" && !text.trim()) {
      toast.error("Please write something for your story");
      return;
    }

    if ((mode === "image" || mode === "video") && !mediaFile) {
      toast.error("Please select media to share");
      return;
    }

    setPublishing(true);

    try {
      const formData = new FormData();
      const currentBg = STORY_BACKGROUNDS[bgIndex];
      const currentFont = FONT_PRESETS[fontIndex];

      if (mode === "text") {
        formData.append("type", "text");
        formData.append("caption", text.trim());
        formData.append(
          "background_style",
          JSON.stringify({
            preset: currentBg.id,
            gradientStyle: currentBg.style,
            fontFamily: currentFont.id,
            align: textAlign,
          })
        );
      } else {
        formData.append("type", mode);
        if (mediaFile) {
          formData.append("media", mediaFile);
        }
        if (caption.trim()) {
          formData.append("caption", caption.trim());
        }
      }

      await api.post("/api/stories", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Story posted successfully!");
      onStoryCreated();
      handleClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to publish story");
    } finally {
      setPublishing(false);
    }
  };

  if (!mounted || !open) return null;

  const currentBg = STORY_BACKGROUNDS[bgIndex];
  const currentFont = FONT_PRESETS[fontIndex];
  const userAvatar = getAvatarUrl(user?.avatar);

  const modalContent = (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 select-none">
      {/* Hidden File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => handleFileChange(e, "image")}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        onChange={(e) => handleFileChange(e, "video")}
        className="hidden"
      />

      {/* ── STEP 1: INITIAL CHOOSE TYPE MODAL ── */}
      {step === "select" && (
        <div className="w-full max-w-lg rounded-3xl bg-card border border-border/80 shadow-2xl p-6 sm:p-8 relative animate-in zoom-in-95 duration-200">
          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3.5 mb-6">
            <div className="size-12 rounded-full p-0.5 border-2 border-primary shrink-0">
              <img
                src={userAvatar}
                alt={user?.name || "User"}
                className="size-full rounded-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                Create a Story
                <Sparkles className="size-4 text-primary" />
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Stories disappear automatically after 24 hours.
              </p>
            </div>
          </div>

          {/* 3 Main Choice Cards */}
          <div className="space-y-3">
            {/* 1. Text Story Card */}
            <button
              type="button"
              onClick={() => handleSelectMode("text")}
              className="w-full group p-4 rounded-2xl border border-border/80 bg-background hover:bg-muted/40 hover:border-primary/50 transition-all flex items-center gap-4 text-left cursor-pointer active:scale-[0.99]"
            >
              <div className="size-12 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center shrink-0 transition-all shadow-sm">
                <Type className="size-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors">
                    Text Story
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    Custom Colors
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  Write thoughts, status updates, or questions with vibrant backgrounds
                </p>
              </div>
            </button>

            {/* 2. Photo Story Card */}
            <button
              type="button"
              onClick={() => handleSelectMode("image")}
              className="w-full group p-4 rounded-2xl border border-border/80 bg-background hover:bg-muted/40 hover:border-primary/50 transition-all flex items-center gap-4 text-left cursor-pointer active:scale-[0.99]"
            >
              <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white flex items-center justify-center shrink-0 transition-all shadow-sm">
                <ImageIcon className="size-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-emerald-500 transition-colors">
                  Photo Story
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  Upload an image from your device with an optional caption
                </p>
              </div>
            </button>

            {/* 3. Video Story Card */}
            <button
              type="button"
              onClick={() => handleSelectMode("video")}
              className="w-full group p-4 rounded-2xl border border-border/80 bg-background hover:bg-muted/40 hover:border-primary/50 transition-all flex items-center gap-4 text-left cursor-pointer active:scale-[0.99]"
            >
              <div className="size-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500 group-hover:text-white flex items-center justify-center shrink-0 transition-all shadow-sm">
                <Video className="size-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-purple-500 transition-colors">
                  Video Story
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  Share short video clips (MP4, MOV, WebM up to 50MB)
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: TEXT STORY CREATOR ── */}
      {step === "create" && mode === "text" && (
        <div className="relative w-full max-w-sm sm:max-w-md h-[90vh] max-h-[760px] rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200">
          {/* Background Canvas */}
          <div className={cn("absolute inset-0 transition-all duration-300", currentBg.style)} />

          {/* Top Bar: Controls */}
          <div className="relative z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent text-white">
            <button
              type="button"
              onClick={() => setStep("select")}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white transition-all cursor-pointer"
              title="Back to options"
            >
              <ArrowLeft className="size-5" />
            </button>

            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15">
              {/* Font Style Toggle */}
              <button
                type="button"
                onClick={() => setFontIndex((prev) => (prev + 1) % FONT_PRESETS.length)}
                className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
              >
                {currentFont.label}
              </button>

              {/* Text Alignment Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (textAlign === "center") setTextAlign("left");
                  else if (textAlign === "left") setTextAlign("right");
                  else setTextAlign("center");
                }}
                className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
              >
                {textAlign === "left" && <AlignLeft className="size-4" />}
                {textAlign === "center" && <AlignCenter className="size-4" />}
                {textAlign === "right" && <AlignRight className="size-4" />}
              </button>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white transition-all cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Central Live Typing Canvas */}
          <div className="relative z-10 flex-1 flex items-center justify-center p-6 sm:p-8">
            <textarea
              ref={textInputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tap to start typing..."
              rows={4}
              maxLength={400}
              className={cn(
                "w-full bg-transparent resize-none border-none outline-none text-center placeholder:text-white/60 focus:ring-0 leading-snug drop-shadow-md",
                currentFont.className,
                text.length > 120 ? "text-xl sm:text-2xl" : text.length > 50 ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl",
                textAlign === "left" && "text-left",
                textAlign === "center" && "text-center",
                textAlign === "right" && "text-right"
              )}
            />
          </div>

          {/* Bottom Bar: Palette & Publish */}
          <div className="relative z-20 p-4 sm:p-5 space-y-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
            {/* Background Color Swatches */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 scrollbar-none">
              {STORY_BACKGROUNDS.map((bg, idx) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => setBgIndex(idx)}
                  className={cn(
                    "size-8 rounded-full transition-all shrink-0 cursor-pointer shadow-md",
                    bg.dot,
                    bgIndex === idx ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110" : "opacity-75 hover:opacity-100 hover:scale-105"
                  )}
                  title={bg.name}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("select")}
                className="px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-xs font-bold transition-all cursor-pointer"
              >
                Change Type
              </button>

              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing || !text.trim()}
                className="flex-1 py-2.5 rounded-full bg-white hover:bg-white/90 text-black font-extrabold text-xs sm:text-sm transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {publishing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Sharing Story...</span>
                  </>
                ) : (
                  <>
                    <span>Share Story</span>
                    <Sparkles className="size-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: PHOTO / VIDEO PREVIEW & CONFIRMATION ── */}
      {step === "preview" && (mode === "image" || mode === "video") && mediaPreview && (
        <div className="relative w-full max-w-sm sm:max-w-md h-[90vh] max-h-[760px] rounded-3xl overflow-hidden bg-black flex flex-col justify-between shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200">
          {/* Top Bar */}
          <div className="relative z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent text-white">
            <button
              type="button"
              onClick={() => setStep("select")}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white transition-all cursor-pointer"
              title="Back to options"
            >
              <ArrowLeft className="size-5" />
            </button>

            {/* Type badge */}
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white flex items-center gap-1.5">
              {mode === "image" ? <ImageIcon className="size-3.5" /> : <Film className="size-3.5" />}
              <span>{mode === "image" ? "Photo Preview" : "Video Preview"}</span>
            </span>

            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white transition-all cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Media Player / Image Display */}
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            {mode === "image" ? (
              <img
                src={mediaPreview}
                alt="Story preview"
                className="size-full object-contain"
              />
            ) : (
              <video
                src={mediaPreview}
                controls
                autoPlay
                loop
                playsInline
                className="size-full object-contain"
              />
            )}
          </div>

          {/* Bottom Bar: Caption & Confirm Publish */}
          <div className="relative z-20 p-4 sm:p-5 space-y-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
            {/* Caption Input */}
            <div className="relative">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption... (optional)"
                maxLength={300}
                className="w-full bg-white/15 backdrop-blur-md text-white placeholder:text-white/60 text-xs sm:text-sm px-4 py-2.5 rounded-2xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            {/* Confirmation & Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (mode === "image") imageInputRef.current?.click();
                  else videoInputRef.current?.click();
                }}
                className="px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                Change
              </button>

              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing}
                className="flex-1 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs sm:text-sm transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {publishing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Sharing Story...</span>
                  </>
                ) : (
                  <>
                    <Check className="size-4 stroke-[3]" />
                    <span>Post Story</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
