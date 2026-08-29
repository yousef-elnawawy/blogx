"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link2, Check, Share2, Send, BookOpen, MessageCircle, Loader2, Layers, Play, Video } from "lucide-react";
import { toast } from "sonner";
import { getAvatarUrl, getAvatarGradient, getInitials } from "@/lib/utils";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import UserBadges from "@/components/ui/UserBadges";
import { useAuth } from "@/contexts/AuthContext";
import { messagesService } from "@/services/messages";
import api from "@/lib/api";

export interface ShareItem {
  id: string | number;
  type?: "post" | "blog" | "series" | "story" | "video" | "snippet";
  title?: string;
  slug?: string;
  author: {
    name: string;
    username: string;
    avatar: string | null;
    verified?: boolean;
    equipped_badges?: string[] | null;
  };
  content?: string;
  excerpt?: string;
  images?: string[];
  cover_image?: string | null;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: ShareItem;
}

export default function ShareDialog({
  open,
  onOpenChange,
  post,
}: ShareDialogProps) {
  const { user: currentUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<any[]>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [sendingToUserId, setSendingToUserId] = useState<number | null>(null);
  const [sentUserIds, setSentUserIds] = useState<Set<number>>(new Set());

  // Fetch following users when dialog opens
  useEffect(() => {
    if (open && currentUser) {
      setLoadingFollowing(true);
      api
        .get("/api/user/following")
        .then((res) => {
          const list = res.data.users || res.data.data || res.data || [];
          setFollowingUsers(Array.isArray(list) ? list : []);
        })
        .catch(() => {})
        .finally(() => setLoadingFollowing(false));
    }
  }, [open, currentUser]);

  const isVideo = post.type === "video";
  const isSeries = post.type === "series" || post.type === "story";
  const isBlog = post.type === "blog" || (!isSeries && !isVideo && Boolean(post.slug));
  const slugOrId = post.slug || post.id;

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${isSeries ? "series" : isBlog ? "blog" : "post"}/${slugOrId}`
      : `/${isSeries ? "series" : isBlog ? "blog" : "post"}/${slugOrId}`;

  const postText = post.content || post.excerpt || post.title || "";
  const displayTitle = isSeries ? (post.title || "Series") : post.title || (isBlog ? "Blog Post" : "Post");

  const shareText = isSeries
    ? `Explore series "${post.title || "Stories"}" by ${post.author.name} on BlogX`
    : isBlog
    ? `Read "${post.title || postText.slice(0, 60)}" by ${post.author.name} on BlogX`
    : isVideo
    ? `Watch this video by ${post.author.name} on BlogX${postText ? `: "${postText.slice(0, 60)}${postText.length > 60 ? "..." : ""}"` : ""}`
    : `Check out this post by ${post.author.name} on BlogX: "${postText.slice(0, 80)}${postText.length > 80 ? "..." : ""}"`;

  const notifyShare = (platform: string) => {
    if (isSeries) {
      api.post(`/api/series/${post.id}/share`, { platform }).catch(() => {});
    } else if (isBlog) {
      api.post(`/api/blogs/${post.id}/share`, { platform }).catch(() => {});
    } else {
      api.post(`/api/posts/${post.id}/share`, { platform }).catch(() => {});
    }
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
      toast.success("Link copied! Opening Instagram...");
    } catch {
      // continue
    }
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  };

  const handleShareYouTube = async () => {
    notifyShare("YouTube");
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      } else {
        copyFallback(`${shareText}\n${shareUrl}`);
      }
      toast.success("Post text & link copied! Opening YouTube...");
    } catch {
      // continue
    }
    window.open("https://www.youtube.com/", "_blank", "noopener,noreferrer");
  };

  const handleShareX = () => {
    notifyShare("X");
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText
    )}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareTelegram = () => {
    notifyShare("Telegram");
    const url = `https://t.me/share/url?url=${encodeURIComponent(
      shareUrl
    )}&text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSendDirectMessage = async (recipient: any) => {
    if (!currentUser) return;
    try {
      setSendingToUserId(recipient.id);
      const startRes = await messagesService.startConversation({ recipient_id: recipient.id });
      const convId = startRes.conversation.id;

      await messagesService.sendMessage(convId, {
        shared_data: {
          type: (isSeries ? "series" : post.type || (isBlog ? "blog" : "post")) as any,
          id: slugOrId,
          title: post.title,
          author_name: post.author.name,
          author_username: post.author.username,
          author_avatar: post.author.avatar,
          author_verified: post.author.verified,
          excerpt: postText.slice(0, 120),
          image: post.cover_image || post.images?.[0] || null,
          url: shareUrl,
        },
      });

      setSentUserIds((prev) => new Set(prev).add(recipient.id));
      toast.success(`Sent to ${recipient.name} in direct messages!`);
      notifyShare("Direct Message");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send direct message");
    } finally {
      setSendingToUserId(null);
    }
  };

  const avatarSrc = getAvatarUrl(post.author.avatar);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-5 sm:p-6 gap-4 bg-card border-border shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex items-center justify-between pb-2 border-b border-border/60">
          <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            {isSeries ? (
              <Layers className="size-5 text-primary" />
            ) : isBlog ? (
              <BookOpen className="size-5 text-primary" />
            ) : isVideo ? (
              <Video className="size-5 text-primary" />
            ) : (
              <Share2 className="size-5 text-primary" />
            )}
            <span>{isSeries ? "Share Story Series" : isBlog ? "Share Blog Story" : isVideo ? "Share Video" : "Share Post"}</span>
          </DialogTitle>
        </DialogHeader>

        {/* 1. Direct Message Quick Share Row (If user is signed in) */}
        {currentUser && followingUsers.length > 0 && (
          <div className="space-y-2 pb-2 border-b border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MessageCircle className="size-3.5 text-primary" />
                <span>Send via Direct Message</span>
              </span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto py-1 scrollbar-none">
              {followingUsers.map((fUser) => {
                const isSending = sendingToUserId === fUser.id;
                const hasSent = sentUserIds.has(fUser.id);

                return (
                  <button
                    key={fUser.id}
                    type="button"
                    onClick={() => !hasSent && !isSending && handleSendDirectMessage(fUser)}
                    disabled={hasSent || isSending}
                    className="flex flex-col items-center gap-1 min-w-[56px] max-w-[64px] group focus:outline-none cursor-pointer disabled:cursor-default"
                  >
                    <div className="relative">
                      <Avatar className="size-11 ring-2 ring-primary/20 group-hover:ring-primary transition-all">
                        <AvatarImage src={getAvatarUrl(fUser.avatar)} />
                        <AvatarFallback className={`text-xs font-bold ${getAvatarGradient(fUser.username || fUser.name)}`}>
                          {getInitials(fUser.name)}
                        </AvatarFallback>
                      </Avatar>
                      {hasSent && (
                        <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                          <Check className="size-3 stroke-[3]" />
                        </div>
                      )}
                      {isSending && (
                        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                          <Loader2 className="size-4 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-foreground truncate w-full text-center">
                      {hasSent ? "Sent ✓" : fUser.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Card Preview Container */}
        <div className="relative rounded-2xl border border-border/70 bg-muted/30 backdrop-blur-sm overflow-hidden shadow-inner">
          {/* Video thumbnail preview */}
          {isVideo ? (
            <div className="relative">
              {post.cover_image ? (
                <div className="relative w-full aspect-video bg-black overflow-hidden">
                  <img
                    src={getAvatarUrl(post.cover_image)}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover opacity-85"
                  />
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="size-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg">
                      <Play className="size-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                  {/* Video badge */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/15">
                    <Video className="size-3" />
                    <span>Video</span>
                  </div>
                </div>
              ) : (
                /* No thumbnail fallback */
                <div className="relative w-full aspect-video bg-gradient-to-br from-neutral-900 to-neutral-800 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-white/50">
                    <div className="size-12 rounded-full bg-white/10 flex items-center justify-center">
                      <Play className="size-5 fill-white/50 text-white/50 ml-0.5" />
                    </div>
                    <span className="text-[11px] font-semibold tracking-wide uppercase">Video</span>
                  </div>
                  {/* Video badge */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/15">
                    <Video className="size-3" />
                    <span>Video</span>
                  </div>
                </div>
              )}
              {/* Author row below thumbnail */}
              <div className="p-3 flex items-center gap-2.5">
                <Avatar className="size-7 ring-1 ring-primary/20 shrink-0">
                  <AvatarImage src={avatarSrc} />
                  <AvatarFallback className={`text-[9px] font-bold ${getAvatarGradient(post.author.username || post.author.name)}`}>
                    {getInitials(post.author.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-foreground truncate">{post.author.name}</span>
                    {Boolean(post.author.verified) && <VerifiedBadge size="xs" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">@{post.author.username}</p>
                </div>
              </div>
              {postText && (
                <p className="px-3 pb-3 text-xs text-foreground/80 leading-relaxed line-clamp-2 -mt-1">
                  {postText}
                </p>
              )}
            </div>
          ) : (
            /* Regular post / blog preview */
            <div className="p-3.5 sm:p-4 space-y-2.5">
              {/* Author Header */}
              <div className="flex items-center gap-2.5">
                <Avatar className="size-8 ring-1 ring-primary/20">
                  <AvatarImage src={avatarSrc} />
                  <AvatarFallback className={`text-[10px] font-bold ${getAvatarGradient(post.author.username || post.author.name)}`}>
                    {getInitials(post.author.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 flex-wrap">
                    <h4 className="text-xs font-semibold text-foreground truncate">
                      {post.author.name}
                    </h4>
                    {Boolean(post.author.verified) && <VerifiedBadge size="xs" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    @{post.author.username}
                  </p>
                </div>
              </div>

              {/* Blog Title or Content Excerpt */}
              {post.title && (
                <h3 className="text-sm font-bold text-foreground leading-snug font-[family-name:var(--font-fraunces)] line-clamp-2">
                  {post.title}
                </h3>
              )}

              {postText && (
                <p className="text-xs text-foreground/90 leading-relaxed line-clamp-2 whitespace-pre-wrap">
                  {postText}
                </p>
              )}

              {/* Cover image */}
              {(post.cover_image || (post.images && post.images.length > 0)) && (
                <div className="rounded-xl overflow-hidden max-h-28 border border-border/50 bg-muted">
                  <img
                    src={getAvatarUrl(post.cover_image || post.images?.[0])}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Share Action Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-4 gap-3 pt-1">
          {/* 1. Copy Link */}
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

          {/* 2. WhatsApp */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex flex-col items-center gap-1.5 group focus:outline-none cursor-pointer"
          >
            <div className="size-11 sm:size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs active:scale-95">
              <svg className="size-5 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 0C5.399 0 0 5.399 0 12.031c0 2.12.553 4.188 1.603 6.008L.062 24l6.126-1.583a12.01 12.01 0 0 0 5.843 1.514h.005c6.632 0 12.031-5.4 12.031-12.031C24.067 5.4 18.663 0 12.031 0zm0 22.031h-.004a9.98 9.98 0 0 1-5.09-1.39l-.365-.217-3.778.977.994-3.68-.238-.378a9.988 9.988 0 0 1-1.547-5.312c0-5.526 4.498-10.024 10.028-10.024 2.678 0 5.196 1.043 7.089 2.937a10.007 10.007 0 0 1 2.937 7.09c0 5.526-4.5 10.024-10.026 10.024zm5.495-7.508c-.301-.15-1.782-.88-2.059-.98-.276-.1-.477-.15-.677.15-.2.301-.777.98-.953 1.18-.175.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.676-2.085-.175-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.175.2-.301.301-.502.101-.2.05-.376-.025-.527-.075-.15-.677-1.632-.928-2.235-.245-.588-.494-.508-.677-.518l-.577-.01c-.2 0-.527.075-.803.376s-1.054 1.029-1.054 2.509 1.079 2.91 1.229 3.111c.15.201 2.124 3.244 5.146 4.551.719.311 1.28.497 1.718.636.722.23 1.378.197 1.898.12.579-.087 1.782-.728 2.033-1.431.251-.703.251-1.305.176-1.431-.076-.125-.277-.201-.578-.351z" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
              WhatsApp
            </span>
          </button>

          {/* 3. Facebook */}
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

          {/* 4. Instagram */}
          <button
            type="button"
            onClick={handleShareInstagram}
            className="flex flex-col items-center gap-1.5 group focus:outline-none cursor-pointer"
          >
            <div className="size-11 sm:size-12 rounded-2xl bg-[#E4405F]/10 border border-[#E4405F]/30 flex items-center justify-center text-[#E4405F] group-hover:bg-[#E4405F] group-hover:text-white transition-all shadow-xs active:scale-95">
              <svg className="size-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
              Instagram
            </span>
          </button>

          {/* 5. YouTube */}
          <button
            type="button"
            onClick={handleShareYouTube}
            className="flex flex-col items-center gap-1.5 group focus:outline-none cursor-pointer"
          >
            <div className="size-11 sm:size-12 rounded-2xl bg-[#FF0000]/10 border border-[#FF0000]/30 flex items-center justify-center text-[#FF0000] group-hover:bg-[#FF0000] group-hover:text-white transition-all shadow-xs active:scale-95">
              <svg className="size-5 fill-current" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
              YouTube
            </span>
          </button>

          {/* 6. X (Twitter) */}
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

          {/* 7. Telegram */}
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

          {/* 8. System / Device Share */}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}