"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Clock,
  Sparkles,
  Smile,
  Trash2,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { getAvatarUrl, getInitials } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";

export interface RealNote {
  id: number | string;
  user_id: number;
  is_mine: boolean;
  text: string;
  emoji?: string | null;
  created_at: string;
  expires_at: string;
  created_at_human?: string;
  remaining_hours: number;
  remaining_minutes: number;
  user: {
    id: number;
    name: string;
    username: string;
    avatar: string | null;
    verified: boolean;
    badges?: any[];
  };
}

const SUGGESTED_EMOJIS = ["☕", "💡", "🚀", "💻", "🔥", "✨", "🎨", "🎧", "🧠", "⚡", "😴", "📚"];

function formatRemainingTime(expiresAt?: string, remainingHours?: number): string {
  if (expiresAt) {
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return "Expiring soon";
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours > 0) return `${hours}h left`;
    const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `${minutes}m left`;
  }
  const hours = Math.floor(Number(remainingHours) || 0);
  if (hours > 0) return `${hours}h left`;
  return "Expiring soon";
}

export default function NotesBar() {
  const { user } = useAuth();
  const router = useRouter();

  const [notes, setNotes] = useState<RealNote[]>([]);
  const [myNote, setMyNote] = useState<RealNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Dialog state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewNoteModal, setViewNoteModal] = useState<RealNote | null>(null);

  // Form state
  const [noteText, setNoteText] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("💭");

  // Fetch real active notes from backend API
  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/notes");
      setMyNote(res.data.my_note || null);
      setNotes(res.data.notes || []);
    } catch (err: any) {
      console.error("Failed to fetch notes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user, fetchNotes]);

  const handleOpenCreateModal = () => {
    if (myNote) {
      setNoteText(myNote.text);
      setSelectedEmoji(myNote.emoji || "💭");
    } else {
      setNoteText("");
      setSelectedEmoji("💭");
    }
    setCreateModalOpen(true);
  };

  const handleSaveMyNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || submitting) return;

    try {
      setSubmitting(true);
      const res = await api.post("/api/notes", {
        text: noteText.trim(),
        emoji: selectedEmoji !== "💭" ? selectedEmoji : null,
      });

      setMyNote(res.data.note);
      setCreateModalOpen(false);
      toast.success("Note shared! It will be visible for 24 hours.");
      // Refresh notes list
      fetchNotes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to share note");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMyNote = async () => {
    try {
      setSubmitting(true);
      await api.delete("/api/notes");
      setMyNote(null);
      setCreateModalOpen(false);
      toast.info("Your note has been deleted.");
      fetchNotes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete note");
    } finally {
      setSubmitting(false);
    }
  };

  const myAvatarSrc = getAvatarUrl(user?.avatar);

  return (
    <div className="border-b border-border/50 bg-card/20 py-3.5 px-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <Sparkles className="size-3.5 text-amber-500" />
          <span>Daily Notes</span>
          <span className="text-[10px] text-muted-foreground font-normal">
            • 24h
          </span>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div className="flex items-start gap-4 overflow-x-auto no-scrollbar py-2 px-1">
        {/* ── 1. Real User Note Bubble & Avatar ── */}
        <div className="flex flex-col items-center shrink-0 w-[78px] text-center group">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="relative flex flex-col items-center cursor-pointer transition-transform group-hover:scale-105"
          >
            {/* Thought Bubble */}
            {myNote ? (
              <div className="relative mb-2.5 max-w-[84px] bg-primary text-primary-foreground text-[11px] font-medium leading-tight px-2.5 py-1.5 rounded-2xl shadow-sm border border-primary/20 text-center animate-in fade-in zoom-in-95 duration-200">
                <span className="line-clamp-2">{myNote.text}</span>
                {/* Bubble pointer triangle */}
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-2 bg-primary rotate-45" />
              </div>
            ) : (
              <div className="relative mb-2.5 max-w-[80px] bg-muted/90 text-muted-foreground text-[10px] font-semibold leading-tight px-2 py-1 rounded-xl border border-border/80 text-center flex items-center gap-1 shadow-2xs">
                <span>Share note</span>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-1.5 bg-muted rotate-45 border-r border-b border-border/80" />
              </div>
            )}

            {/* Avatar with Plus Badge */}
            <div className="relative">
              <Avatar className="size-14 ring-2 ring-border/80 shadow-xs">
                <AvatarImage src={myAvatarSrc} alt={user?.name || "You"} />
                <AvatarFallback className="text-xs font-bold bg-muted text-foreground">
                  {getInitials(user?.name || "You")}
                </AvatarFallback>
              </Avatar>

              {/* Plus badge or active indicator */}
              <div
                className={`absolute -bottom-0.5 -right-0.5 size-5 rounded-full flex items-center justify-center shadow-xs ring-2 ring-background ${
                  myNote
                    ? "bg-emerald-500 text-white"
                    : "bg-primary text-primary-foreground"
                }`}
                title={myNote ? "Edit your note" : "Share a thought"}
              >
                {myNote ? (
                  <Sparkles className="size-2.5" />
                ) : (
                  <Plus className="size-3" strokeWidth={2.5} />
                )}
              </div>
            </div>
          </button>

          <span className="text-[11px] text-muted-foreground mt-1.5 truncate max-w-[76px] font-medium">
            {myNote ? "Your note" : "Share thought"}
          </span>
        </div>

        {/* ── 2. Real Other Users' Notes ── */}
        {notes.map((note) => {
          const avatarUrl = getAvatarUrl(note.user.avatar);
          const remainingText = formatRemainingTime(
            note.expires_at,
            note.remaining_hours
          );

          return (
            <div
              key={note.id}
              className="flex flex-col items-center shrink-0 w-[80px] text-center group"
            >
              <button
                type="button"
                onClick={() => setViewNoteModal(note)}
                className="relative flex flex-col items-center cursor-pointer transition-transform group-hover:scale-105"
              >
                {/* Floating Thought Bubble */}
                <div className="relative mb-2.5 max-w-[84px] bg-card text-foreground text-[11px] font-medium leading-tight px-2.5 py-1.5 rounded-2xl shadow-md border border-border text-center">
                  <span className="line-clamp-2">{note.text}</span>
                  {/* Bubble Tail */}
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-2 bg-card rotate-45 border-r border-b border-border" />
                </div>

                {/* Avatar with Story Ring */}
                <div className="relative">
                  <Avatar className="size-14 ring-2 ring-primary/40 p-0.5 bg-background shadow-xs">
                    <AvatarImage
                      src={avatarUrl}
                      alt={note.user.name}
                      className="rounded-full"
                    />
                    <AvatarFallback className="text-xs font-bold bg-muted">
                      {getInitials(note.user.name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Mood Emoji Badge */}
                  {note.emoji && (
                    <span className="absolute -bottom-1 -right-1 size-5 rounded-full bg-card border border-border/80 text-[11px] flex items-center justify-center shadow-xs">
                      {note.emoji}
                    </span>
                  )}
                </div>
              </button>

              <div className="flex items-center gap-0.5 max-w-[76px] mt-1.5 justify-center">
                <span className="text-[11px] font-medium text-foreground truncate">
                  {note.user.name.split(" ")[0]}
                </span>
                {note.user.verified && <VerifiedBadge size="xs" />}
              </div>
              <span className="text-[9px] text-muted-foreground/70 leading-none">
                {remainingText}
              </span>
            </div>
          );
        })}

        {/* Empty state placeholder if no other real notes yet */}
        {!loading && notes.length === 0 && !myNote && (
          <div className="flex items-center text-xs text-muted-foreground/70 py-4 px-2 italic">
            No active notes yet. Be the first to share!
          </div>
        )}
      </div>

      {/* ── Dialog: Create / Edit Real Note ── */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md p-6 rounded-3xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span>{myNote ? "Edit Your Note" : "Share a Thought"}</span>
            </DialogTitle>
          </DialogHeader>

          {/* Live Preview Bubble */}
          <div className="flex flex-col items-center justify-center py-5 px-4 bg-muted/40 rounded-2xl border border-border/60 mb-4">
            <div className="relative mb-3 max-w-[200px] bg-primary text-primary-foreground text-xs font-medium px-4 py-2 rounded-2xl shadow-md text-center">
              <span>{noteText.trim() || "Share what's on your mind..."}</span>
              {selectedEmoji && selectedEmoji !== "💭" && (
                <span className="ml-1.5">{selectedEmoji}</span>
              )}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-2.5 bg-primary rotate-45" />
            </div>

            <Avatar className="size-16 ring-2 ring-primary/30 shadow-sm">
              <AvatarImage src={myAvatarSrc} alt={user?.name || "You"} />
              <AvatarFallback className="text-sm font-bold">
                {getInitials(user?.name || "You")}
              </AvatarFallback>
            </Avatar>
            <p className="text-xs font-semibold text-foreground mt-2">
              {user?.name || "You"}
            </p>
          </div>

          <form onSubmit={handleSaveMyNote} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Your Note (Max 60 characters)
                </label>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {noteText.length}/60
                </span>
              </div>
              <input
                type="text"
                maxLength={60}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Share a thought with your followers..."
                className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                autoFocus
              />
            </div>

            {/* Quick Mood Picker */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                Select a Mood (Optional)
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {SUGGESTED_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() =>
                      setSelectedEmoji(selectedEmoji === emoji ? "💭" : emoji)
                    }
                    className={`size-8 rounded-xl flex items-center justify-center text-sm transition-all cursor-pointer ${
                      selectedEmoji === emoji
                        ? "bg-primary text-primary-foreground scale-110 shadow-xs"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Notice */}
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/50">
              <Clock className="size-3.5 text-primary shrink-0" />
              <span>
                Notes are visible to users on BlogX and expire automatically after <strong>24 hours</strong>.
              </span>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between gap-2 pt-1">
              {myNote ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={submitting}
                  onClick={handleDeleteMyNote}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl text-xs font-semibold"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Delete Note
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={submitting}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!noteText.trim() || submitting}
                  className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {submitting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : myNote ? (
                    "Update Note"
                  ) : (
                    "Share Note"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: View Real Other User's Note ── */}
      <Dialog
        open={Boolean(viewNoteModal)}
        onOpenChange={(open) => !open && setViewNoteModal(null)}
      >
        <DialogContent className="sm:max-w-sm p-6 rounded-3xl text-center">
          {viewNoteModal && (
            <div className="flex flex-col items-center py-4">
              <div className="relative mb-3 max-w-[240px] bg-primary text-primary-foreground text-sm font-medium px-4 py-2.5 rounded-2xl shadow-md text-center">
                <span>{viewNoteModal.text}</span>
                {viewNoteModal.emoji && (
                  <span className="ml-1.5">{viewNoteModal.emoji}</span>
                )}
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-2.5 bg-primary rotate-45" />
              </div>

              <Avatar className="size-18 ring-2 ring-primary/40 shadow-sm mt-1">
                <AvatarImage
                  src={getAvatarUrl(viewNoteModal.user.avatar)}
                  alt={viewNoteModal.user.name}
                />
                <AvatarFallback className="text-base font-bold">
                  {getInitials(viewNoteModal.user.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex items-center gap-1 mt-2 justify-center">
                <h3 className="text-sm font-bold text-foreground">
                  {viewNoteModal.user.name}
                </h3>
                {viewNoteModal.user.verified && <VerifiedBadge size="xs" />}
              </div>
              <p className="text-xs text-muted-foreground">
                @{viewNoteModal.user.username}
              </p>

              <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1 font-mono">
                <Clock className="size-3 text-amber-500" />
                <span>
                  {formatRemainingTime(
                    viewNoteModal.expires_at,
                    viewNoteModal.remaining_hours
                  )}
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const targetUsername = viewNoteModal.user.username;
                  setViewNoteModal(null);
                  router.push(`/@${targetUsername}`);
                }}
                className="mt-4 text-xs font-semibold rounded-xl"
              >
                View @{viewNoteModal.user.username}&apos;s Profile
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
