"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import {
  Highlighter,
  MessageSquare,
  Trash2,
  ExternalLink,
  Lock,
  Globe,
  Loader2,
  Sparkles,
} from "lucide-react";
import { getAvatarUrl, getInitials, cn } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";

export interface AnnotationItem {
  id: number;
  blog_id: number;
  user_id: number;
  highlighted_text: string;
  note: string | null;
  color: string;
  is_private: boolean;
  is_mine: boolean;
  created_at: string;
  created_at_human?: string;
  user: {
    id: number | null;
    name: string;
    username: string;
    avatar: string | null;
    verified?: boolean;
    equipped_badges?: string[];
  };
}

interface BlogAnnotationsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blogId: number;
  annotations: AnnotationItem[];
  onAnnotationDeleted?: (id: number) => void;
  onJumpToText?: (text: string) => void;
}

export default function BlogAnnotationsDrawer({
  open,
  onOpenChange,
  blogId,
  annotations,
  onAnnotationDeleted,
  onJumpToText,
}: BlogAnnotationsDrawerProps) {
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const displayedList = annotations.filter((item) => {
    if (filter === "mine") return item.is_mine;
    return true;
  });

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await api.delete(`/api/blogs/${blogId}/annotations/${id}`);
      toast.success("Highlight removed");
      if (onAnnotationDeleted) {
        onAnnotationDeleted(id);
      }
    } catch {
      toast.error("Failed to delete annotation");
    } finally {
      setDeletingId(null);
    }
  };

  const handleJump = (text: string) => {
    if (onJumpToText) {
      onJumpToText(text);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col rounded-2xl border-border/80 bg-background/95 backdrop-blur-md p-5">
        <DialogHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold font-[family-name:var(--font-fraunces)]">
              <Highlighter className="size-4 text-amber-500" />
              <span>Reader Notes & Highlights</span>
            </DialogTitle>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              {annotations.length}
            </span>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 pt-2">
            <Button
              variant={filter === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter("all")}
              className="h-7 text-xs rounded-full px-3"
            >
              All Highlights ({annotations.length})
            </Button>
            <Button
              variant={filter === "mine" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter("mine")}
              className="h-7 text-xs rounded-full px-3"
            >
              My Highlights ({annotations.filter((a) => a.is_mine).length})
            </Button>
          </div>
        </DialogHeader>

        {/* Annotations List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1">
          {displayedList.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <div className="grid place-items-center size-10 rounded-full bg-muted mx-auto text-muted-foreground">
                <Highlighter className="size-5" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                {filter === "mine"
                  ? "You haven't highlighted any text yet"
                  : "No highlights or notes on this story yet"}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Select any sentence or paragraph in the article to highlight, annotate, or share it!
              </p>
            </div>
          ) : (
            displayedList.map((item) => {
              const colorClass =
                {
                  amber: "border-amber-400 bg-amber-400/5",
                  emerald: "border-emerald-400 bg-emerald-400/5",
                  sky: "border-sky-400 bg-sky-400/5",
                  rose: "border-rose-400 bg-rose-400/5",
                  purple: "border-purple-400 bg-purple-400/5",
                }[item.color] || "border-amber-400 bg-amber-400/5";

              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-xl border p-3 space-y-2.5 transition-all hover:shadow-xs",
                    colorClass
                  )}
                >
                  {/* Author Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="size-6">
                        <AvatarImage src={getAvatarUrl(item.user.avatar)} />
                        <AvatarFallback className="text-[9px]">
                          {getInitials(item.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-xs font-bold text-foreground truncate">
                          {item.user.name}
                        </span>
                        {item.user.verified && <VerifiedBadge size="xs" />}
                        <span className="text-[10px] text-muted-foreground">
                          · {item.created_at_human || "Recently"}
                        </span>
                      </div>
                    </div>

                    {item.is_mine && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="size-6 text-muted-foreground hover:text-destructive"
                        title="Delete highlight"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Trash2 className="size-3" />
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Highlighted Quote */}
                  <div
                    onClick={() => handleJump(item.highlighted_text)}
                    className="cursor-pointer group"
                    title="Click to jump to this quote in the article"
                  >
                    <p className="text-xs leading-relaxed italic text-foreground/90 pl-2.5 border-l-2 border-primary/60 group-hover:text-primary transition-colors">
                      &ldquo;{item.highlighted_text}&rdquo;
                    </p>
                  </div>

                  {/* User Note (if provided) */}
                  {item.note && (
                    <div className="rounded-lg bg-background/70 border border-border/60 p-2.5 text-xs text-foreground/95 flex items-start gap-2">
                      <MessageSquare className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <p className="leading-relaxed flex-1">{item.note}</p>
                    </div>
                  )}

                  {/* Footer Jump Button */}
                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleJump(item.highlighted_text)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      <span>Jump to passage</span>
                      <ExternalLink className="size-2.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
