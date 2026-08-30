"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { BookOpen, FileText, Video, ExternalLink, Layers, Sparkles } from "lucide-react";
import { getAvatarUrl, getInitials, cn } from "@/lib/utils";
import { DirectMessageSharedData } from "@/services/messages";

interface SharedContentCardProps {
  data: DirectMessageSharedData & {
    story_id?: number;
    story_type?: string;
    gradient?: string;
  };
  isMe?: boolean;
}

export default function SharedContentCard({ data, isMe = false }: SharedContentCardProps) {
  const router = useRouter();
  if (!data) return null;

  const isStory = data.type === "story";
  const isSeries = data.type === "series";
  const isBlog = data.type === "blog";
  const isVideo = data.type === "video";

  // ── 1. INSTAGRAM/FACEBOOK-STYLE STORY REPLY CARD ──
  if (isStory) {
    const avatarSrc = getAvatarUrl(data.author_avatar);
    const imageSrc = getAvatarUrl(data.image);

    return (
      <div
        className={cn(
          "mb-1.5 p-2 rounded-xl border flex items-center gap-2.5 max-w-xs transition-all select-none",
          isMe
            ? "bg-black/20 border-white/20 text-white"
            : "bg-muted/40 border-border/80 text-foreground"
        )}
      >
        {/* Story Thumbnail / Text Preview */}
        <div className="relative size-12 sm:size-14 rounded-lg overflow-hidden shrink-0 border border-border/40 shadow-xs bg-zinc-900 flex items-center justify-center">
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt="Story snapshot"
              className="size-full object-cover"
            />
          ) : (
            <div
              className={cn(
                "size-full p-1 flex items-center justify-center text-[9px] font-bold text-center leading-tight text-white",
                data.gradient || "bg-zinc-800"
              )}
            >
              <span className="line-clamp-3">{data.title || "Story"}</span>
            </div>
          )}
        </div>

        {/* Story Metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-75 mb-0.5">
            <Sparkles className="size-3 text-primary shrink-0" />
            <span>Story reply</span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold truncate">
              {data.author_name || "Author"}
            </span>
            {data.author_verified && <VerifiedBadge size="xs" />}
          </div>

          {data.title && !imageSrc && (
            <p className="text-[11px] opacity-85 truncate mt-0.5">
              &ldquo;{data.title}&rdquo;
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── 2. GENERAL SHARED POST / BLOG / SERIES CARD ──
  const targetUrl = data.url || (isSeries ? `/series/${data.id}` : isBlog ? `/blog/${data.id}` : `/post/${data.id}`);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
      const urlObj = new URL(targetUrl);
      if (typeof window !== "undefined" && urlObj.origin === window.location.origin) {
        router.push(urlObj.pathname + urlObj.search);
        return;
      }
      window.open(targetUrl, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(targetUrl);
  };

  const avatarSrc = getAvatarUrl(data.author_avatar);
  const imageSrc = getAvatarUrl(data.image);

  return (
    <div
      onClick={handleClick}
      className={`mt-1.5 rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer shadow-xs max-w-sm ${
        isMe
          ? "bg-black/15 border-primary-foreground/20 hover:bg-black/25 text-primary-foreground"
          : "bg-card border-border/80 hover:border-primary/40 hover:shadow-md text-foreground"
      }`}
    >
      {/* Attached Image Thumbnail */}
      {imageSrc && (
        <div className="relative aspect-[2/1] w-full overflow-hidden bg-black/10">
          <img
            src={imageSrc}
            alt={data.title || "Preview"}
            className="size-full object-cover group-hover:scale-105 transition-transform"
          />
          {isVideo && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="size-9 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                <Video className="size-4 fill-current" />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-3 space-y-1.5">
        {/* Author Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar className="size-5 ring-1 ring-border/50 shrink-0">
              <AvatarImage src={avatarSrc} alt={data.author_name || "Author"} />
              <AvatarFallback className="text-[9px] font-bold">
                {getInitials(data.author_name || "U")}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-bold truncate">
              {data.author_name || "Author"}
            </span>
            {data.author_verified && <VerifiedBadge size="xs" />}
          </div>

          <span
            className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 ${
              isSeries
                ? isMe ? "bg-black/20 text-primary-foreground" : "bg-primary/15 text-primary"
                : isBlog
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                : isVideo
                ? "bg-red-500/15 text-red-500"
                : "bg-primary/15 text-primary"
            }`}
          >
            {isSeries ? (
              <Layers className="size-2.5" />
            ) : isBlog ? (
              <BookOpen className="size-2.5" />
            ) : isVideo ? (
              <Video className="size-2.5" />
            ) : (
              <FileText className="size-2.5" />
            )}
            <span>{isSeries ? "Series" : data.type}</span>
          </span>
        </div>

        {/* Title or Excerpt */}
        {data.title && (
          <h4 className="text-xs font-bold leading-snug line-clamp-2">
            {data.title}
          </h4>
        )}

        {data.excerpt && (
          <p className="text-[11px] opacity-85 line-clamp-2 leading-relaxed">
            {data.excerpt}
          </p>
        )}

        {/* View Action Footer */}
        <div className="pt-1 flex items-center gap-1 text-[10px] font-semibold opacity-85 hover:opacity-100">
          <span>{isSeries ? "View Series" : isBlog ? "Read Story" : "View Post"}</span>
          <ExternalLink className="size-2.5" />
        </div>
      </div>
    </div>
  );
}
