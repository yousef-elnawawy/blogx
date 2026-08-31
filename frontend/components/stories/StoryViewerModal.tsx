"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Send,
  Loader2,
  Pause,
  Play,
  ShieldCheck,
  Heart,
  ThumbsUp,
  Flame,
  Sparkles,
  Smile,
} from "lucide-react";
import { cn, getAvatarUrl } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/lib/api";
import Link from "next/link";
import { messagesService } from "@/services/messages";

export interface SingleStory {
  id: number;
  user_id: number;
  type: "text" | "image" | "video";
  media_url: string | null;
  caption: string | null;
  background_style: {
    preset?: string;
    gradientStyle?: string;
    fontFamily?: string;
    fontSize?: string;
    position?: string;
    color?: string;
    highlight?: string;
  } | null;
  overlay_data: Array<{
    text: string;
    color: string;
    hasBg: boolean;
    position?: string;
    font?: string;
  }> | null;
  created_at: string;
  expires_at: string;
  views_count: number;
  is_viewed: boolean;
  is_mine: boolean;
}

export interface UserStoryGroup {
  user: {
    id: number;
    name: string;
    username: string;
    avatar: string | null;
    verified: boolean;
  };
  has_unseen: boolean;
  stories: SingleStory[];
}

interface StoryViewerModalProps {
  open: boolean;
  onClose: () => void;
  userGroups: UserStoryGroup[];
  initialUserIndex?: number;
  onStoryDeleted?: (storyId: number) => void;
  onStoryViewed?: (userIndex: number, storyId: number) => void;
}

const STORY_DURATION_MS = 5500; // 5.5 seconds per story

const QUICK_EMOJI_REACTIONS = [
  { id: "heart", emoji: "❤️", label: "Heart" },
  { id: "like", emoji: "👍", label: "Like" },
  { id: "laugh", emoji: "😂", label: "Laugh" },
  { id: "wow", emoji: "😮", label: "Wow" },
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "clap", emoji: "👏", label: "Clap" },
  { id: "sad", emoji: "😢", label: "Sad" },
];

export default function StoryViewerModal({
  open,
  onClose,
  userGroups,
  initialUserIndex = 0,
  onStoryDeleted,
  onStoryViewed,
}: StoryViewerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Viewers Drawer State
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewersList, setViewersList] = useState<any[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  // In-App Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingStory, setDeletingStory] = useState(false);

  // DM Reply & Reaction State
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [reactionAnimation, setReactionAnimation] = useState<string | null>(null);

  // Keep latest refs to prevent stale closure or reset loops
  const userGroupsRef = useRef(userGroups);
  userGroupsRef.current = userGroups;

  const currentUserIndexRef = useRef(currentUserIndex);
  currentUserIndexRef.current = currentUserIndex;

  const currentStoryIndexRef = useRef(currentStoryIndex);
  currentStoryIndexRef.current = currentStoryIndex;

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const viewersOpenRef = useRef(viewersOpen);
  viewersOpenRef.current = viewersOpen;

  const deleteConfirmOpenRef = useRef(deleteConfirmOpen);
  deleteConfirmOpenRef.current = deleteConfirmOpen;

  const prevOpenRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ONLY initialize when the modal actually transitions from closed -> open
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      const uIdx = initialUserIndex < userGroups.length ? initialUserIndex : 0;
      setCurrentUserIndex(uIdx);

      const targetGroup = userGroups[uIdx];
      let startStoryIdx = 0;
      if (targetGroup && targetGroup.stories) {
        const firstUnseen = targetGroup.stories.findIndex((s) => !s.is_viewed);
        if (firstUnseen !== -1) {
          startStoryIdx = firstUnseen;
        }
      }
      setCurrentStoryIndex(startStoryIdx);
      setProgress(0);
      setIsPaused(false);
      setViewersOpen(false);
    }
    prevOpenRef.current = open;
  }, [open, initialUserIndex, userGroups]);

  const currentGroup = userGroups[currentUserIndex];
  const currentStory = currentGroup?.stories?.[currentStoryIndex];

  // Mark story as viewed on server once per story view (deferred to avoid render warning)
  const viewedStoriesTracker = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!open) {
      viewedStoriesTracker.current.clear();
      return;
    }

    if (currentStory && !currentStory.is_mine && !viewedStoriesTracker.current.has(currentStory.id)) {
      const sId = currentStory.id;
      const uIdx = currentUserIndex;
      viewedStoriesTracker.current.add(sId);
      api.post(`/api/stories/${sId}/view`).catch(() => {});
      if (onStoryViewed) {
        setTimeout(() => {
          onStoryViewed(uIdx, sId);
        }, 0);
      }
    }
  }, [open, currentStory, currentUserIndex, onStoryViewed]);

  // Next story handler
  const handleNextStory = useCallback(() => {
    const groups = userGroupsRef.current;
    const uIdx = currentUserIndexRef.current;
    const sIdx = currentStoryIndexRef.current;
    const group = groups[uIdx];

    if (!group) {
      setTimeout(() => onClose(), 0);
      return;
    }

    // Advance to next story of same user
    if (sIdx < group.stories.length - 1) {
      setCurrentStoryIndex(sIdx + 1);
      setProgress(0);
      return;
    }

    // Advance to next user
    if (uIdx < groups.length - 1) {
      setCurrentUserIndex(uIdx + 1);
      setCurrentStoryIndex(0);
      setProgress(0);
      return;
    }

    // Finished all stories
    setTimeout(() => onClose(), 0);
  }, [onClose]);

  // Prev story handler
  const handlePrevStory = useCallback(() => {
    const groups = userGroupsRef.current;
    const uIdx = currentUserIndexRef.current;
    const sIdx = currentStoryIndexRef.current;

    // Previous story of same user
    if (sIdx > 0) {
      setCurrentStoryIndex(sIdx - 1);
      setProgress(0);
      return;
    }

    // Previous user
    if (uIdx > 0) {
      const prevGroup = groups[uIdx - 1];
      setCurrentUserIndex(uIdx - 1);
      setCurrentStoryIndex(prevGroup ? Math.max(0, prevGroup.stories.length - 1) : 0);
      setProgress(0);
    }
  }, []);

  // Timer Progress Loop (Stable, non-looping)
  useEffect(() => {
    if (!open || !currentStory) return;

    const stepMs = 50;
    const increment = (stepMs / STORY_DURATION_MS) * 100;

    const timer = setInterval(() => {
      if (isPausedRef.current || viewersOpenRef.current || deleteConfirmOpenRef.current) return;

      setProgress((prev) => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + increment;
      });
    }, stepMs);

    return () => clearInterval(timer);
  }, [open, currentStory, handleNextStory]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (deleteConfirmOpen) {
          setDeleteConfirmOpen(false);
          setIsPaused(false);
          return;
        }
        if (viewersOpen) {
          setViewersOpen(false);
          setIsPaused(false);
          return;
        }
        onClose();
      }
      if (e.key === "ArrowRight") handleNextStory();
      if (e.key === "ArrowLeft") handlePrevStory();
      if (e.key === " ") setIsPaused((p) => !p);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, handleNextStory, handlePrevStory, deleteConfirmOpen, viewersOpen]);

  // Fetch story viewers
  const handleOpenViewers = async () => {
    if (!currentStory) return;
    setIsPaused(true);
    setViewersOpen(true);
    setLoadingViewers(true);

    try {
      const res = await api.get(`/api/stories/${currentStory.id}/viewers`);
      setViewersList(res.data.viewers || []);
    } catch {
      setViewersList([]);
    } finally {
      setLoadingViewers(false);
    }
  };

  // Open in-app Delete Confirmation Dialog
  const handleDeleteStoryClick = () => {
    setIsPaused(true);
    setDeleteConfirmOpen(true);
  };

  // Perform Delete after in-app confirmation
  const handleConfirmDelete = async () => {
    if (!currentStory) return;
    setDeletingStory(true);

    try {
      await api.delete(`/api/stories/${currentStory.id}`);
      toast.success("Story deleted successfully");
      setDeleteConfirmOpen(false);
      if (onStoryDeleted) onStoryDeleted(currentStory.id);

      if (currentGroup && currentGroup.stories.length > 1) {
        handleNextStory();
      } else {
        onClose();
      }
    } catch {
      toast.error("Failed to delete story");
    } finally {
      setDeletingStory(false);
    }
  };

  // Send Direct Message reply to story author with attached story snapshot
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentGroup || !currentStory) return;

    setSendingReply(true);
    try {
      const convRes = await messagesService.startConversation({ recipient_id: currentGroup.user.id });
      await api.post(`/api/conversations/${convRes.conversation.id}/messages`, {
        text: replyText.trim(),
        shared_data: {
          type: "story",
          id: currentStory.id,
          story_id: currentStory.id,
          story_type: currentStory.type,
          title: currentStory.type === "text" ? currentStory.caption : (currentStory.caption || "Photo Story"),
          image: currentStory.media_url || null,
          gradient: currentStory.background_style?.gradientStyle || null,
          author_id: currentGroup.user.id,
          author_name: currentGroup.user.name,
          author_username: currentGroup.user.username,
          author_avatar: currentGroup.user.avatar,
        },
      });

      toast.success("Reply sent in Direct Messages");
      setReplyText("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  // Send Quick Emoji Reaction with attached story snapshot
  const handleSendReaction = async (reaction: (typeof QUICK_EMOJI_REACTIONS)[0]) => {
    if (!currentGroup || !currentStory) return;

    setReactionAnimation(reaction.emoji);
    setTimeout(() => setReactionAnimation(null), 1500);

    try {
      const convRes = await messagesService.startConversation({ recipient_id: currentGroup.user.id });
      await api.post(`/api/conversations/${convRes.conversation.id}/messages`, {
        text: reaction.emoji,
        shared_data: {
          type: "story",
          id: currentStory.id,
          story_id: currentStory.id,
          story_type: currentStory.type,
          title: currentStory.type === "text" ? currentStory.caption : (currentStory.caption || "Story"),
          image: currentStory.media_url || null,
          gradient: currentStory.background_style?.gradientStyle || null,
          author_id: currentGroup.user.id,
          author_name: currentGroup.user.name,
          author_username: currentGroup.user.username,
          author_avatar: currentGroup.user.avatar,
        },
      });
      toast.success(`Reaction ${reaction.emoji} sent to ${currentGroup.user.name}`);
    } catch {
      // silent
    }
  };

  if (!mounted || !open || !currentGroup || !currentStory) return null;

  const authorAvatar = getAvatarUrl(currentGroup.user.avatar);

  const modalContent = (
    <div className="fixed inset-0 z-9999 bg-black/95 backdrop-blur-xl flex items-center justify-center select-none animate-in fade-in duration-200 p-0 sm:p-4">
      {/* Top Close Button (Desktop) */}
      <button
        type="button"
        onClick={onClose}
        className="hidden sm:flex absolute top-5 right-6 z-50 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer hover:scale-110 shadow-lg"
        aria-label="Close story viewer"
      >
        <X className="size-6" />
      </button>

      {/* Desktop Left/Right Navigation Arrows */}
      {(currentUserIndex > 0 || currentStoryIndex > 0) && (
        <button
          type="button"
          onClick={handlePrevStory}
          className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 z-40 p-3.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer hover:scale-110 shadow-xl"
        >
          <ChevronLeft className="size-8" />
        </button>
      )}

      {(currentUserIndex < userGroups.length - 1 || currentStoryIndex < currentGroup.stories.length - 1) && (
        <button
          type="button"
          onClick={handleNextStory}
          className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 z-40 p-3.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer hover:scale-110 shadow-xl"
        >
          <ChevronRight className="size-8" />
        </button>
      )}

      {/* ── CENTRAL 9:16 STORY CARD CONTAINER ── */}
      <div className="relative w-full h-full sm:h-[88vh] sm:max-h-[820px] sm:max-w-[430px] sm:rounded-3xl overflow-hidden bg-zinc-950 flex flex-col justify-between shadow-2xl border border-white/15">
        {/* ── TOP HEADER: Progress Bars & Author Profile ── */}
        <div className="absolute top-0 inset-x-0 z-30 p-4 pt-3 bg-linear-to-b from-black/85 via-black/50 to-transparent space-y-3 pointer-events-none">
          {/* Segmented Progress Bars */}
          <div className="flex items-center gap-1.5 w-full">
            {currentGroup.stories.map((s, idx) => {
              let fillPercent = 0;
              if (idx < currentStoryIndex) fillPercent = 100;
              else if (idx === currentStoryIndex) fillPercent = progress;

              return (
                <div
                  key={s.id}
                  className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden"
                >
                  <div
                    className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Author Details & Story Controls */}
          <div className="flex items-center justify-between pointer-events-auto">
            <Link
              href={`/@${currentGroup.user.username}`}
              onClick={onClose}
              className="flex items-center gap-2.5 group min-w-0"
            >
              <div className="relative size-10 rounded-full overflow-hidden border-2 border-white/40 bg-zinc-800 shrink-0">
                {authorAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={authorAvatar}
                    alt={currentGroup.user.name}
                    className="size-full object-cover rounded-full"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center font-bold text-xs text-white">
                    {currentGroup.user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 text-left">
                <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1">
                  <span className="truncate">{currentGroup.user.name}</span>
                  {currentGroup.user.verified && (
                    <ShieldCheck className="size-3.5 text-sky-400 shrink-0 fill-current" />
                  )}
                </div>
                <div className="text-[10px] text-white/70 font-mono">
                  {new Date(currentStory.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </Link>

            {/* Top Right Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsPaused((p) => !p)}
                className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                title={isPaused ? "Play" : "Pause"}
              >
                {isPaused ? <Play className="size-4.5" /> : <Pause className="size-4.5" />}
              </button>

              {currentStory.is_mine && (
                <button
                  type="button"
                  onClick={handleDeleteStoryClick}
                  className="p-2 rounded-full text-white/80 hover:text-rose-400 hover:bg-white/15 transition-colors cursor-pointer"
                  title="Delete story"
                >
                  <Trash2 className="size-4.5" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer sm:hidden"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── STORY CANVAS / BODY ── */}
        <div
          className="relative size-full flex items-center justify-center overflow-hidden bg-black"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Left / Right Tap Touch Areas */}
          <div
            className="absolute left-0 top-16 bottom-24 w-1/3 z-20 cursor-pointer"
            onClick={handlePrevStory}
          />
          <div
            className="absolute right-0 top-16 bottom-24 w-2/3 z-20 cursor-pointer"
            onClick={handleNextStory}
          />

          {/* Floating Reaction Animation Popup */}
          {reactionAnimation && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none animate-in zoom-in-50 fade-in duration-300">
              <div className="text-6xl sm:text-7xl animate-bounce drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)] select-none">
                {reactionAnimation}
              </div>
            </div>
          )}

          {/* 1. Text Story */}
          {currentStory.type === "text" && (() => {
            const bg = currentStory.background_style as any;
            const fontClass =
              bg?.fontFamily === "cairo" ? "font-[family-name:var(--font-cairo)] font-extrabold" :
              bg?.fontFamily === "classic" || bg?.fontFamily === "fraunces" ? "font-serif italic font-semibold" :
              bg?.fontFamily === "typewriter" || bg?.fontFamily === "ibm" ? "font-mono tracking-wider font-semibold" :
              bg?.fontFamily === "neon" ? "font-sans font-black uppercase tracking-widest drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]" :
              "font-sans font-bold tracking-tight";

            const textAlign = bg?.align || "center";

            return (
              <div
                className={cn(
                  "size-full p-8 flex flex-col justify-center transition-all select-text",
                  bg?.gradientStyle || "bg-zinc-950 text-white"
                )}
              >
                <div
                  className={cn(
                    "w-full transition-all",
                    textAlign === "left" && "text-left",
                    textAlign === "center" && "text-center",
                    textAlign === "right" && "text-right"
                  )}
                >
                  <p
                    className={cn(
                      "leading-relaxed whitespace-pre-line break-words text-2xl sm:text-3xl drop-shadow-md",
                      fontClass,
                      bg?.highlight === "box" && "bg-black/70 px-4 py-2 rounded-2xl backdrop-blur-xs inline-block shadow-xl"
                    )}
                    style={{ color: bg?.color || "#ffffff", textAlign: textAlign }}
                  >
                    {currentStory.caption}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* 2. Image Story */}
          {currentStory.type === "image" && currentStory.media_url && (
            <div className="relative size-full bg-black flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentStory.media_url}
                alt="Story image"
                className="size-full object-cover"
              />

              {/* Overlays with positions and custom styling */}
              {currentStory.overlay_data && currentStory.overlay_data.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {currentStory.overlay_data.map((ov: any, i: number) => {
                    const fontClass =
                      ov.font === "cairo" ? "font-[family-name:var(--font-cairo)]" :
                      ov.font === "fraunces" ? "font-[family-name:var(--font-fraunces)]" :
                      ov.font === "ibm" ? "font-mono" :
                      "font-sans";

                    return (
                      <div
                        key={i}
                        className={cn(
                          "absolute inset-x-4 flex items-center justify-center transition-all",
                          ov.position === "top" && "top-20",
                          ov.position === "center" && "top-1/2 -translate-y-1/2",
                          ov.position === "bottom" && "bottom-24",
                          !ov.position && "top-1/2 -translate-y-1/2"
                        )}
                      >
                        <div
                          className={cn(
                            "px-4 py-2 rounded-xl font-bold text-base sm:text-lg text-center shadow-xl max-w-[88%]",
                            fontClass,
                            ov.hasBg ? "bg-black/70 backdrop-blur-xs text-white" : "drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                          )}
                          style={{ color: ov.color || "#ffffff" }}
                        >
                          {ov.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. Video Story */}
          {currentStory.type === "video" && currentStory.media_url && (
            <div className="relative size-full bg-black flex items-center justify-center">
              <video
                src={currentStory.media_url}
                autoPlay
                playsInline
                muted={false}
                className="size-full object-cover"
              />
            </div>
          )}
        </div>

        {/* ── BOTTOM BAR: Viewers Drawer or DM Reply + Reactions ── */}
        <div className="relative z-30 p-4 bg-linear-to-t from-black/95 via-black/60 to-transparent space-y-2.5">
          {/* Caption for media story */}
          {currentStory.type !== "text" && currentStory.caption && (
            <div className="px-2 text-xs sm:text-sm text-white/95 text-center line-clamp-2 drop-shadow-sm font-medium">
              {currentStory.caption}
            </div>
          )}

          {currentStory.is_mine ? (
            /* Owner View: Facebook-Style Viewers Button */
            <button
              type="button"
              onClick={handleOpenViewers}
              className="w-full flex items-center justify-between py-3 px-4 rounded-2xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all cursor-pointer shadow-lg backdrop-blur-md border border-white/20 group"
            >
              <div className="flex items-center gap-2">
                <Eye className="size-4 text-primary group-hover:scale-110 transition-transform" />
                <span>Seen by {currentStory.views_count} {currentStory.views_count === 1 ? "person" : "people"}</span>
              </div>
              <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider bg-white/15 px-2.5 py-1 rounded-full">
                Viewers List
              </span>
            </button>
          ) : (
            /* Viewer View: Quick Emoji Reactions Bar & DM Reply */
            <div className="space-y-2">
              {/* Quick Reactions with Real Emojis */}
              <div className="flex items-center justify-between px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20">
                {QUICK_EMOJI_REACTIONS.map((re) => (
                  <button
                    key={re.id}
                    type="button"
                    onClick={() => handleSendReaction(re)}
                    className="text-xl sm:text-2xl transition-transform hover:scale-135 active:scale-95 cursor-pointer select-none px-1"
                    title={re.label}
                  >
                    {re.emoji}
                  </button>
                ))}
              </div>

              {/* DM Reply Box */}
              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Reply to ${currentGroup.user.name}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  maxLength={200}
                  className="flex-1 px-4 py-2.5 rounded-full text-xs sm:text-sm bg-white/15 border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-primary backdrop-blur-md"
                />

                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="size-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40 cursor-pointer shrink-0 shadow-md"
                >
                  {sendingReply ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ── VIEWERS DRAWER (FOR STORY OWNER) ── */}
        {viewersOpen && (
          <div className="absolute inset-x-0 bottom-0 top-1/4 z-40 bg-zinc-900/98 backdrop-blur-2xl rounded-t-3xl border-t border-white/15 p-5 flex flex-col justify-between animate-in slide-in-from-bottom duration-200">
            {/* Grab pill */}
            <div className="h-1.5 w-12 bg-white/25 rounded-full mx-auto mb-3" />

            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-white text-sm font-bold">
                <Eye className="size-4.5 text-primary" />
                <span>Story Viewers ({viewersList.length})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewersOpen(false);
                  setIsPaused(false);
                }}
                className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-white/5 py-2 scrollbar-none">
              {loadingViewers ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : viewersList.length === 0 ? (
                <div className="text-center py-12 text-xs text-white/50">
                  No views recorded yet.
                </div>
              ) : (
                viewersList.map((viewer) => (
                  <div key={viewer.id} className="flex items-center justify-between py-3">
                    <Link
                      href={`/@${viewer.username}`}
                      onClick={onClose}
                      className="flex items-center gap-3 group min-w-0"
                    >
                      <div className="relative size-10 rounded-full overflow-hidden bg-zinc-800 shrink-0 border border-white/20">
                        {viewer.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getAvatarUrl(viewer.avatar)}
                            alt={viewer.name}
                            className="size-full object-cover rounded-full"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center font-bold text-xs text-white">
                            {viewer.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-white group-hover:text-primary transition-colors truncate">
                          {viewer.name}
                        </div>
                        <div className="text-[11px] text-white/60 truncate">@{viewer.username}</div>
                      </div>
                    </Link>

                    {viewer.viewed_at && (
                      <span className="text-[11px] text-white/50 font-mono shrink-0 ml-2">
                        {new Date(viewer.viewed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── IN-APP DELETE STORY CONFIRMATION DIALOG ── */}
        {deleteConfirmOpen && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
            <div className="w-full max-w-xs sm:max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-center">
              <div className="mx-auto size-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shadow-sm">
                <Trash2 className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-foreground tracking-tight">Delete Story?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This story will be permanently removed from your profile and cannot be recovered.
                </p>
              </div>
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setIsPaused(false);
                  }}
                  disabled={deletingStory}
                  className="flex-1 py-2.5 rounded-full border border-border bg-background hover:bg-muted text-foreground text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deletingStory}
                  className="flex-1 py-2.5 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {deletingStory ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
