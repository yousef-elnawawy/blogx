"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link2, Check, Share2, Send, Mail } from "lucide-react";
import { toast } from "sonner";
import { getAvatarUrl, getAvatarGradient, getInitials } from "@/lib/utils";
import api from "@/lib/api";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    id: string | number;
    author: {
      name: string;
      username: string;
      avatar: string | null;
    };
    content: string;
    images?: string[];
  };
}

export default function ShareDialog({
  open,
  onOpenChange,
  post,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/post/${post.id}`
      : `/post/${post.id}`;

  const shareText = `Check out this post by ${post.author.name} on BlogX: "${post.content.slice(
    0,
    80
  )}${post.content.length > 80 ? "..." : ""}"`;

  const notifyShare = (platform: string) => {
    api.post(`/api/posts/${post.id}/share`, { platform }).catch(() => {});
  };

  const copyFallback = (text: string) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let success = false;
    try {
      success = document.execCommand("copy");
    } catch {
      success = false;
    }
    document.body.removeChild(textarea);
    return success;
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const ok = copyFallback(shareUrl);
        if (!ok) throw new Error("copy failed");
      }
      setCopied(true);
      toast.success("Link copied to clipboard!");
      notifyShare("link");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // Web Share API
  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: `${post.author.name} on BlogX`,
        text: shareText,
        url: shareUrl,
      });
      notifyShare("device");
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        toast.error("Sharing failed");
      }
    }
  };

  const handleShareX = () => {
    notifyShare("X");
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText
    )}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareWhatsApp = () => {
    notifyShare("WhatsApp");
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(
      `${shareText} ${shareUrl}`
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareTelegram = () => {
    notifyShare("Telegram");
    const url = `https://t.me/share/url?url=${encodeURIComponent(
      shareUrl
    )}&text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareFacebook = () => {
    notifyShare("Facebook");
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      shareUrl
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareLinkedIn = () => {
    notifyShare("LinkedIn");
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      shareUrl
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareEmail = () => {
    notifyShare("Email");
    const url = `mailto:?subject=${encodeURIComponent(
      `Post by ${post.author.name} on BlogX`
    )}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
    window.location.href = url;
  };

  const avatarSrc = getAvatarUrl(post.author.avatar);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-5 sm:p-6 gap-5 bg-card border-border shadow-2xl">
        <DialogHeader className="flex items-center justify-between pb-2 border-b border-border/60">
          <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Share2 className="size-5 text-primary" />
            <span>Share Post</span>
          </DialogTitle>
        </DialogHeader>

        {/* Card Preview Container */}
        <div className="relative rounded-2xl p-4 sm:p-5 border border-border/70 bg-muted/30 backdrop-blur-sm overflow-hidden shadow-inner space-y-3">
          {/* Author Header */}
          <div className="flex items-center gap-3">
            <Avatar className="size-10 ring-2 ring-primary/20">
              <AvatarImage src={avatarSrc} />
              <AvatarFallback className={`text-xs font-bold ${getAvatarGradient(post.author.username || post.author.name)}`}>
                {getInitials(post.author.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-foreground truncate">
                {post.author.name}
              </h4>
              <p className="text-xs text-muted-foreground truncate">
                @{post.author.username}
              </p>
            </div>
          </div>

          {/* Post Content Excerpt */}
          <p className="text-sm text-foreground/90 leading-relaxed line-clamp-3 whitespace-pre-wrap">
            {post.content || "Check out this post on BlogX"}
          </p>
        </div>

        {/* Share Action Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-4 gap-3 pt-1">
          {/* Copy Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex flex-col items-center gap-1.5 group focus:outline-none cursor-pointer"
          >
            <div className="size-11 sm:size-12 rounded-2xl bg-muted border border-border/80 flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all shadow-xs active:scale-95">
              {copied ? (
                <Check className="size-5 text-emerald-500 group-hover:text-primary-foreground" />
              ) : (
                <Link2 className="size-5" />
              )}
            </div>
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
              {copied ? "Copied!" : "Copy Link"}
            </span>
          </button>

          {/* Native Share (Device Share) */}
          {canNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex flex-col items-center gap-1.5 group focus:outline-none cursor-pointer"
            >
              <div className="size-11 sm:size-12 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-xs active:scale-95">
                <Share2 className="size-5" />
              </div>
              <span className="text-[11px] font-semibold text-primary transition-colors text-center">
                System Share
              </span>
            </button>
          )}

          {/* WhatsApp */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex flex-col items-center gap-1.5 group focus:outline-none cursor-pointer"
          >
            <div className="size-11 sm:size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs active:scale-95">
              <svg className="size-5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
              WhatsApp
            </span>
          </button>

          {/* X / Twitter */}
          <button
            type="button"
            onClick={handleShareX}
            className="flex flex-col items-center gap-1.5 group focus:outline-none cursor-pointer"
          >
            <div className="size-11 sm:size-12 rounded-2xl bg-muted border border-border/80 flex items-center justify-center text-foreground group-hover:bg-foreground group-hover:text-background transition-all shadow-xs active:scale-95">
              <svg className="size-4.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
              X
            </span>
          </button>

          {/* Telegram */}
          <button
            type="button"
            onClick={handleShareTelegram}
            className="flex flex-col items-center gap-1.5 group focus:outline-none cursor-pointer"
          >
            <div className="size-11 sm:size-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-all shadow-xs active:scale-95">
              <Send className="size-5" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
              Telegram
            </span>
          </button>

          {/* Facebook */}
          <button
            type="button"
            onClick={handleShareFacebook}
            className="flex flex-col items-center gap-1.5 group focus:outline-none cursor-pointer"
          >
            <div className="size-11 sm:size-12 rounded-2xl bg-blue-600/10 border border-blue-600/30 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs active:scale-95">
              <svg className="size-5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
              Facebook
            </span>
          </button>

          {/* LinkedIn */}
          <button
            type="button"
            onClick={handleShareLinkedIn}
            className="flex flex-col items-center gap-1.5 group focus:outline-none cursor-pointer"
          >
            <div className="size-11 sm:size-12 rounded-2xl bg-blue-700/10 border border-blue-700/30 flex items-center justify-center text-blue-700 dark:text-blue-400 group-hover:bg-blue-700 group-hover:text-white transition-all shadow-xs active:scale-95">
              <svg className="size-4.5 fill-current" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
              LinkedIn
            </span>
          </button>

          {/* Email */}
          <button
            type="button"
            onClick={handleShareEmail}
            className="flex flex-col items-center gap-1.5 group focus:outline-none cursor-pointer"
          >
            <div className="size-11 sm:size-12 rounded-2xl bg-muted border border-border/80 flex items-center justify-center text-muted-foreground group-hover:bg-muted-foreground group-hover:text-background transition-all shadow-xs active:scale-95">
              <Mail className="size-5" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
              Email
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}