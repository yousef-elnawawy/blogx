"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link2, Check, Share2 } from "lucide-react";
import { toast } from "sonner";

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

function getInitials(name: string) {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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

  // manual fallback in case the Clipboard API isn't available (e.g. non-https, old browser)
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

  // Web Share API - opens the device's native share sheet
  // (Messages, WhatsApp, Mail, etc.) - mostly available on mobile
  const canNativeShare =
    typeof navigator !== "undefined" && !!navigator.share;

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: `${post.author.name} on BlogX`,
        text: shareText,
        url: shareUrl,
      });
      notifyShare("device");
    } catch (err) {
      // user cancelled the share sheet - not a real error
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

  const handleShareFacebook = () => {
    notifyShare("Facebook");
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      shareUrl
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareInstagram = async () => {
    notifyShare("Instagram");
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        copyFallback(shareUrl);
      }
      toast.success("Link copied! Open Instagram to share.");
    } catch {
      toast.error("Failed to copy link");
    }
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  };

  const avatarSrc = post.author.avatar ?? undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-6 gap-6 bg-card border-border shadow-2xl">
        <DialogHeader className="flex items-center justify-between pb-2 border-b border-border/60">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <img src="/logo.svg" alt="BlogX" className="h-6 w-auto inline-block dark:hidden" />
            <img src="/logo-dark.svg" alt="BlogX" className="h-6 w-auto hidden dark:inline-block" />
            <span>Share</span>
          </DialogTitle>
        </DialogHeader>

        {/* Card Preview Container */}
        <div className="relative rounded-2xl p-5 border border-border/70 bg-muted/30 backdrop-blur-sm overflow-hidden shadow-inner space-y-3.5">
          {/* Author Header */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
              <AvatarImage src={avatarSrc} />
              <AvatarFallback className="bg-muted text-xs font-bold">
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

          {/* Watermark Logo */}
          <div className="pt-2 flex justify-end items-center">
            <img src="/logo.svg" alt="BlogX" className="h-4 w-auto opacity-40 dark:hidden" />
            <img src="/logo-dark.svg" alt="BlogX" className="h-4 w-auto opacity-40 hidden dark:block" />
          </div>
        </div>

        {/* Share Action Grid */}
        <div
          className={`grid grid-cols-3 ${
            canNativeShare ? "sm:grid-cols-5" : "sm:grid-cols-4"
          } gap-3 pt-2`}
        >
          {/* Copy Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex flex-col items-center gap-2 group focus:outline-none"
          >
            <div className="size-12 rounded-full bg-muted border border-border/80 flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all shadow-sm">
              {copied ? (
                <Check className="size-5 text-green-500 group-hover:text-primary-foreground" />
              ) : (
                <Link2 className="size-5" />
              )}
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
              {copied ? "Copied!" : "Copy Link"}
            </span>
          </button>

          {/* Native Share (mobile: opens the device's own app list) */}
          {canNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex flex-col items-center gap-2 group focus:outline-none"
            >
              <div className="size-12 rounded-full bg-muted border border-border/80 flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all shadow-sm">
                <Share2 className="size-5" />
              </div>
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
                Share via...
              </span>
            </button>
          )}

          {/* X / Twitter */}
          <button
            type="button"
            onClick={handleShareX}
            className="flex flex-col items-center gap-2 group focus:outline-none"
          >
            <div className="size-12 rounded-full bg-muted border border-border/80 flex items-center justify-center text-foreground group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black group-hover:border-transparent transition-all shadow-sm">
              <svg className="size-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
              X
            </span>
          </button>

          {/* WhatsApp */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex flex-col items-center gap-2 group focus:outline-none"
          >
            <div className="size-12 rounded-full bg-muted border border-border/80 flex items-center justify-center text-foreground group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-all shadow-sm">
              <svg className="size-5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
              WhatsApp
            </span>
          </button>
          {/* Instagram */}
          <button
            type="button"
            onClick={handleShareInstagram}
            className="flex flex-col items-center gap-2 group focus:outline-none"
          >
            <div className="size-12 rounded-full bg-muted border border-border/80 flex items-center justify-center text-foreground group-hover:bg-gradient-to-tr group-hover:from-amber-500 group-hover:via-rose-500 group-hover:to-purple-600 group-hover:text-white group-hover:border-transparent transition-all shadow-sm">
              <svg className="size-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
              Instagram
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}