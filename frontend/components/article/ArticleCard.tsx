"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import {
  Clock,
  Heart,
  Eye,
  Bookmark,
  Pencil,
  Trash2,
  Lock,
  BookOpen,
} from "lucide-react";
import { getAvatarUrl, getAvatarGradient, getInitials, cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export interface ArticleItem {
  id: number;
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  cover_image?: string | null;
  tags?: string[];
  read_time: number;
  status: string;
  views_count: number;
  likes_count: number;
  is_liked?: boolean;
  published_at: string | null;
  created_at: string | null;
  author: {
    id: number | null;
    name: string;
    username: string;
    avatar: string | null;
    bio?: string | null;
    verified?: boolean;
  };
}

interface ArticleCardProps {
  article: ArticleItem;
  isDraft?: boolean;
  onEditDraft?: (article: ArticleItem) => void;
  onDeleteDraft?: (id: number) => void;
}

function formatCount(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(num);
}

export default function ArticleCard({
  article,
  isDraft = false,
  onEditDraft,
  onDeleteDraft,
}: ArticleCardProps) {
  const timeAgo = (() => {
    try {
      const dateStr = article.published_at || article.created_at;
      if (!dateStr) return "recently";
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return "recently";
    }
  })();

  return (
    <article className="border-b border-border hover:bg-muted/25 dark:hover:bg-muted/15 transition-all p-4 sm:p-5 group">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        {/* Left Column: Author + Title + Excerpt + Meta */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Author info & Draft Badge */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Link
              href={`/@${article.author.username}`}
              className="flex items-center gap-2 hover:underline"
            >
              <Avatar className="size-6 ring-1 ring-border/40">
                <AvatarImage src={getAvatarUrl(article.author.avatar)} alt={article.author.name} />
                <AvatarFallback className={`text-[10px] font-bold ${getAvatarGradient(article.author.username || article.author.name)}`}>
                  {getInitials(article.author.name)}
                </AvatarFallback>
              </Avatar>
              <span className="font-bold text-foreground">{article.author.name}</span>
              {article.author.verified && <VerifiedBadge size="sm" />}
            </Link>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{timeAgo}</span>

            {isDraft && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                <Lock className="size-3" />
                Private Draft
              </span>
            )}
          </div>

          {/* Title */}
          <Link
            href={isDraft ? "#" : `/article/${article.slug}`}
            onClick={(e) => {
              if (isDraft) {
                e.preventDefault();
                onEditDraft?.(article);
              }
            }}
            className="block"
          >
            <h2 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
              {article.title}
            </h2>
          </Link>

          {/* Excerpt */}
          {article.excerpt && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {article.excerpt}
            </p>
          )}

          {/* Tags & Meta Details */}
          <div className="flex items-center justify-between pt-1 flex-wrap gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                {article.read_time} min read
              </span>

              {article.tags && article.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {article.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full bg-muted/60 text-[11px] font-medium text-foreground/80"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {!isDraft && article.views_count > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Eye className="size-3.5" />
                  {formatCount(article.views_count)}
                </span>
              )}

              {!isDraft && article.likes_count > 0 && (
                <span className="inline-flex items-center gap-1 text-rose-500">
                  <Heart className="size-3.5 fill-current" />
                  {formatCount(article.likes_count)}
                </span>
              )}
            </div>

            {/* Actions for Draft */}
            {isDraft && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditDraft?.(article)}
                  className="h-7 px-3 text-xs rounded-full gap-1"
                >
                  <Pencil className="size-3" />
                  Edit Draft
                </Button>
                {onDeleteDraft && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDeleteDraft(article.id)}
                    className="h-7 px-2 text-xs rounded-full text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Cover Image thumbnail */}
        {article.cover_image && (
          <Link
            href={isDraft ? "#" : `/article/${article.slug}`}
            onClick={(e) => {
              if (isDraft) {
                e.preventDefault();
                onEditDraft?.(article);
              }
            }}
            className="shrink-0 w-full sm:w-36 h-28 sm:h-24 rounded-xl overflow-hidden border border-border/50 bg-muted"
          >
            <img
              src={getAvatarUrl(article.cover_image)}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </Link>
        )}
      </div>
    </article>
  );
}
