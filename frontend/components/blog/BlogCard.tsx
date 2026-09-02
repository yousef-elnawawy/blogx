"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import UserBadges from "@/components/ui/UserBadges";
import ShareDialog from "@/components/post/ShareDialog";
import SaveToCollectionDialog from "@/components/bookmarks/SaveToCollectionDialog";
import LikeHeartButton from "@/components/ui/LikeHeartButton";
import {
  Clock,
  Heart,
  Eye,
  Bookmark,
  Share2,
  Pencil,
  Trash2,
  Lock,
} from "lucide-react";
import { getAvatarUrl, getAvatarGradient, getInitials } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface BlogItem {
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
  is_bookmarked?: boolean;
  published_at: string | null;
  created_at: string | null;
  author: {
    id: number | null;
    name: string;
    username: string;
    avatar: string | null;
    bio?: string | null;
    verified?: boolean;
    equipped_badges?: string[] | null;
  };
}

interface BlogCardProps {
  blog: BlogItem;
  isDraft?: boolean;
  onEditDraft?: (blog: BlogItem) => void;
  onDeleteDraft?: (id: number) => void;
}

function formatCount(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(num);
}

export default function BlogCard({
  blog,
  isDraft = false,
  onEditDraft,
  onDeleteDraft,
}: BlogCardProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(Boolean(blog.is_liked));
  const [likesCount, setLikesCount] = useState(blog.likes_count ?? 0);
  const [isBookmarked, setIsBookmarked] = useState(Boolean(blog.is_bookmarked));
  const [bookmarking, setBookmarking] = useState(false);
  const [liking, setLiking] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [saveToCollectionOpen, setSaveToCollectionOpen] = useState(false);

  const timeAgo = (() => {
    try {
      const dateStr = blog.published_at || blog.created_at;
      if (!dateStr) return "recently";
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return "recently";
    }
  })();

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Please sign in to like blog posts");
      return;
    }
    if (liking) return;
    setLiking(true);

    const prevLiked = isLiked;
    const prevCount = likesCount;
    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const res = await api.post(`/api/blogs/${blog.id}/like`);
      setIsLiked(Boolean(res.data.is_liked));
      setLikesCount(res.data.likes_count ?? 0);
    } catch {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
      toast.error("Failed to update like");
    } finally {
      setLiking(false);
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Please sign in to save blog posts");
      return;
    }
    if (bookmarking) return;

    const prevSaved = isBookmarked;
    setIsBookmarked(!prevSaved);
    setBookmarking(true);

    try {
      const res = await api.post(`/api/blogs/${blog.id}/bookmark`);
      const isSaved = Boolean(res.data.is_bookmarked);
      setIsBookmarked(isSaved);
      if (isSaved) {
        setSaveToCollectionOpen(true);
      } else {
        toast.success("Removed from bookmarks");
      }
    } catch {
      setIsBookmarked(prevSaved);
      toast.error("Failed to update bookmark");
    } finally {
      setBookmarking(false);
    }
  };

  return (
    <article className="border-b border-border hover:bg-muted/25 dark:hover:bg-muted/15 transition-all p-4 sm:p-5 group">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        {/* Left Column: Author + Title + Excerpt + Meta */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Author info & Draft Badge */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Link
              href={`/@${blog.author.username}`}
              className="flex items-center gap-2 hover:underline"
            >
              <Avatar className="size-6 ring-1 ring-border/40">
                <AvatarImage src={getAvatarUrl(blog.author.avatar)} alt={blog.author.name} />
                <AvatarFallback className={`text-[10px] font-bold ${getAvatarGradient(blog.author.username || blog.author.name)}`}>
                  {getInitials(blog.author.name)}
                </AvatarFallback>
              </Avatar>
              <span className="font-bold text-foreground">{blog.author.name}</span>
              {blog.author.verified && <VerifiedBadge size="sm" />}
              <UserBadges equippedBadges={blog.author.equipped_badges} size="xs" />
            </Link>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{timeAgo}</span>

            {isDraft && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                <Lock className="size-3" />
                Private Draft
              </span>
            )}
          </div>

          {/* Title */}
          <Link
            href={isDraft ? `/blogs/${encodeURIComponent(blog.slug)}/edit` : `/blog/${encodeURIComponent(blog.slug)}`}
            onClick={(e) => {
              if (isDraft && onEditDraft) {
                e.preventDefault();
                onEditDraft(blog);
              }
            }}
            className="block"
          >
            <h2 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2 font-[family-name:var(--font-fraunces)]">
              {blog.title}
            </h2>
          </Link>

          {/* Excerpt */}
          {blog.excerpt && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {blog.excerpt}
            </p>
          )}

          {/* Tags & Meta Details */}
          <div className="flex items-center justify-between pt-1 flex-wrap gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                {blog.read_time} min read
              </span>

              {blog.tags && blog.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {blog.tags.slice(0, 3).map((tag) => (
                    <Link
                      key={tag}
                      href={`/hashtag/${encodeURIComponent(tag)}`}
                      className="px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-[11px] font-medium text-foreground/80 hover:text-foreground transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}

              {!isDraft && blog.views_count > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Eye className="size-3.5" />
                  {formatCount(blog.views_count)}
                </span>
              )}

              {!isDraft && (
                <LikeHeartButton
                  isLiked={isLiked}
                  likesCount={likesCount}
                  onClick={handleLike}
                  size="sm"
                  className="py-0.5 px-2 h-7"
                />
              )}
            </div>

            {/* Actions for Draft */}
            {isDraft ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditDraft ? onEditDraft(blog) : null}
                  className="h-7 px-3 text-xs rounded-md gap-1"
                >
                  <Pencil className="size-3" />
                  Edit Draft
                </Button>
                {onDeleteDraft && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDeleteDraft(blog.id)}
                    className="h-7 px-2 text-xs rounded-md text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleBookmark}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    isBookmarked
                      ? "text-brand-bookmark bg-brand-bookmark-subtle"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  title={isBookmarked ? "Remove from bookmarks" : "Save to bookmarks"}
                  aria-label="Bookmark"
                >
                  <Bookmark className={`size-4 ${isBookmarked ? "fill-brand-bookmark text-brand-bookmark" : ""}`} />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShareOpen(true);
                  }}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Share blog post"
                  aria-label="Share"
                >
                  <Share2 className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Cover Image thumbnail */}
        {blog.cover_image && (
          <Link
            href={isDraft ? `/blogs/${encodeURIComponent(blog.slug)}/edit` : `/blog/${encodeURIComponent(blog.slug)}`}
            onClick={(e) => {
              if (isDraft && onEditDraft) {
                e.preventDefault();
                onEditDraft(blog);
              }
            }}
            className="shrink-0 w-full sm:w-36 h-28 sm:h-24 rounded-lg overflow-hidden border border-border/50 bg-muted block"
          >
            <img
              src={getAvatarUrl(blog.cover_image)}
              alt={blog.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </Link>
        )}
      </div>

      {/* Share Dialog */}
      {!isDraft && (
        <>
          <ShareDialog
            open={shareOpen}
            onOpenChange={setShareOpen}
            post={{
              id: blog.id,
              type: "blog",
              title: blog.title,
              slug: blog.slug,
              author: blog.author,
              content: blog.excerpt || blog.content || blog.title,
              cover_image: blog.cover_image,
            }}
          />

          <SaveToCollectionDialog
            open={saveToCollectionOpen}
            onOpenChange={setSaveToCollectionOpen}
            blogId={blog.id}
          />
        </>
      )}
    </article>
  );
}
