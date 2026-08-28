"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import UserBadges from "@/components/ui/UserBadges";
import ShareDialog from "@/components/post/ShareDialog";
import { Clock, Layers, Eye, ArrowRight, BookOpen, Share2 } from "lucide-react";
import { getAvatarUrl, getAvatarGradient, getInitials } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export interface SeriesCardProps {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  views_count: number;
  blogs_count: number;
  total_read_time: number;
  created_at: string | null;
  author: {
    id: number | null;
    name: string;
    username: string;
    avatar: string | null;
    verified?: boolean;
    equipped_badges?: string[] | null;
  };
}

export default function SeriesCard({ series }: { series: SeriesCardProps }) {
  const [shareOpen, setShareOpen] = useState(false);
  const author = series.author || {
    name: "Unknown",
    username: "unknown",
    avatar: null,
    verified: false,
    equipped_badges: [],
  };

  const timeAgo = (() => {
    try {
      if (!series.created_at) return "recently";
      return formatDistanceToNow(new Date(series.created_at), { addSuffix: true });
    } catch {
      return "recently";
    }
  })();

  return (
    <article className="p-4 sm:p-5 hover:bg-muted/15 transition-colors border-b border-border/70 group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Author info & series badge */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <Link
              href={`/@${author.username}`}
              className="flex items-center gap-2 hover:underline"
            >
              <Avatar className="size-6 ring-1 ring-border/40">
                <AvatarImage src={getAvatarUrl(author.avatar)} alt={author.name} />
                <AvatarFallback className={`text-[10px] font-bold ${getAvatarGradient(author.username || author.name)}`}>
                  {getInitials(author.name)}
                </AvatarFallback>
              </Avatar>
              <span className="font-bold text-foreground">{author.name}</span>
              {author.verified && <VerifiedBadge size="sm" />}
              <UserBadges equippedBadges={author.equipped_badges} size="xs" />
            </Link>

            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{timeAgo}</span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[11px]">
              <Layers className="size-3" />
              <span>{series.blogs_count} {series.blogs_count === 1 ? "Story" : "Stories"}</span>
            </span>
          </div>

          {/* Title */}
          <Link href={`/series/${encodeURIComponent(series.slug)}`} className="block">
            <h2 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2 font-[family-name:var(--font-fraunces)]">
              {series.title}
            </h2>
          </Link>

          {/* Description / Excerpt */}
          {series.description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {series.description}
            </p>
          )}

          {/* Meta bar */}
          <div className="flex items-center justify-between pt-1 flex-wrap gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {series.total_read_time > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {series.total_read_time} min total
                </span>
              )}

              {series.views_count > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Eye className="size-3.5" />
                  {series.views_count} views
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShareOpen(true);
                }}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Share Series"
                aria-label="Share"
              >
                <Share2 className="size-4" />
              </button>

              <Link
                href={`/series/${encodeURIComponent(series.slug)}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:underline"
              >
                <span>Explore Series</span>
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Optional Cover Thumbnail */}
        {series.cover_image && (
          <Link
            href={`/series/${encodeURIComponent(series.slug)}`}
            className="shrink-0 block"
          >
            <img
              src={getAvatarUrl(series.cover_image)}
              alt={series.title}
              className="size-20 sm:size-24 rounded-xl object-cover border border-border/60 group-hover:opacity-90 transition-opacity"
            />
          </Link>
        )}
      </div>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        post={{
          id: series.id,
          type: "series",
          title: series.title,
          slug: series.slug,
          author: author,
          content: series.description || series.title,
          cover_image: series.cover_image,
        }}
      />
    </article>
  );
}
