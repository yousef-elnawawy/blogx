"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Quote, Send, Loader2, Sparkles, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface BlogQuotePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blog: {
    id: number;
    title: string;
    slug: string;
    author: {
      name: string;
      username: string;
    };
  };
  quotedText: string;
  onSuccess?: () => void;
}

export default function BlogQuotePostModal({
  open,
  onOpenChange,
  blog,
  quotedText,
  onSuccess,
}: BlogQuotePostModalProps) {
  const [userComment, setUserComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quotedText.trim()) {
      toast.error("Quoted text cannot be empty");
      return;
    }

    setSubmitting(true);

    try {
      // Build social post content with blockquote and article attribution
      const formattedPostContent = [
        `> "${quotedText.trim()}"`,
        "",
        userComment.trim(),
        "",
        `📖 [${blog.title}](/blog/${blog.slug}) by @${blog.author.username}`,
      ]
        .filter((part) => part !== null && part !== undefined)
        .join("\n");

      await api.post("/api/posts", {
        content: formattedPostContent,
      });

      toast.success("Quote post shared to feed successfully!");
      setUserComment("");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to publish quote post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl border-border/80 bg-background/95 backdrop-blur-md p-6">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold font-[family-name:var(--font-fraunces)]">
            <Quote className="size-4 text-primary" />
            <span>Quote in Social Post</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Share this quote to your followers with an automatic link back to the story.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Quoted Box Preview */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Quote className="size-3.5 fill-current" />
              <span className="truncate">Quote from: {blog.title}</span>
            </div>
            <p className="text-xs sm:text-sm text-foreground/90 italic line-clamp-4 leading-relaxed pl-2 border-l-2 border-primary/50">
              &ldquo;{quotedText}&rdquo;
            </p>
            <div className="text-[11px] text-muted-foreground text-right">
              by @{blog.author.username}
            </div>
          </div>

          {/* User Commentary Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Add your thoughts or commentary (optional):
            </label>
            <Textarea
              value={userComment}
              onChange={(e) => setUserComment(e.target.value)}
              placeholder="What are your thoughts on this? Share with your network..."
              rows={3}
              className="resize-none rounded-xl border-border/70 focus-visible:ring-primary text-xs sm:text-sm"
            />
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="rounded-lg text-xs"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={submitting}
              className="rounded-lg gap-1.5 text-xs font-bold px-4 cursor-pointer shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  <span>Publish Post</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
