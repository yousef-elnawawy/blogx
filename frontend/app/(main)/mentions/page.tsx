"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AtSign,
  ArrowLeft,
  MessageSquare,
  Heart,
  Eye,
  Loader2,
  Lock,
  ChevronRight,
  ImageIcon,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { getAvatarUrl } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { PostCardProps } from "@/components/PostCard";

function formatCount(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(num);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function renderMentionContent(text: string, validMentions?: string[]) {
  const parts = text.split(/(@[\w.]+|#[\p{L}\p{N}_]+)/gu);
  return parts.map((part, i) => {
    if (part.startsWith("#")) {
      return (
        <span
          key={i}
          className="text-primary font-semibold hover:underline"
        >
          {part}
        </span>
      );
    }
    if (part.startsWith("@")) {
      const username = part.slice(1);
      const isValid = validMentions
        ? validMentions.some((m) => m.toLowerCase() === username.toLowerCase())
        : true;

      if (!isValid) {
        return <span key={i} className="text-foreground/80">{part}</span>;
      }

      return (
        <span
          key={i}
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold border border-sky-500/20 align-baseline"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function MentionCardSkeleton() {
  return (
    <div className="p-4 sm:p-5 border-b border-border/50 animate-pulse flex items-start gap-3">
      <div className="size-10 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-36 bg-muted rounded" />
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-2/3 bg-muted rounded" />
        <div className="h-3 w-28 bg-muted rounded pt-1" />
      </div>
    </div>
  );
}

export default function MentionsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<PostCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchMentions = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await api.get(`/api/mentions?page=${pageNum}`);
      const newPosts: PostCardProps[] = res.data.data || [];
      const nextPageUrl = res.data.next_page_url;

      if (append) {
        setPosts((prev) => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }

      setHasMore(Boolean(nextPageUrl));
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to load mentions:", err);
      if (!append) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchMentions(1, false);
  }, [user, authLoading]);

  const handleCardClick = (postId: string | number) => {
    router.push(`/post/${postId}`);
  };

  return (
    <div className="min-h-screen">
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/60 px-4 py-2.5 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-muted transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <div className="grid place-items-center size-7 rounded-lg bg-sky-500/10 text-sky-500">
                  <AtSign className="size-4" strokeWidth={2.5} />
                </div>
                <h1 className="text-lg font-bold text-foreground leading-tight">
                  Mentions
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Posts and comments that tagged your username
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {authLoading || loading ? (
        <div>
          <MentionCardSkeleton />
          <MentionCardSkeleton />
          <MentionCardSkeleton />
          <MentionCardSkeleton />
        </div>
      ) : !user ? (
        /* Guest state */
        <div className="py-20 text-center px-4">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <Lock className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Log in to view mentions
          </h2>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm">
            See when other users mention your username across BlogX posts and discussions.
          </p>
          <Link href="/login">
            <Button className="rounded-full px-6 font-bold">Log in to BlogX</Button>
          </Link>
        </div>
      ) : posts.length === 0 ? (
        /* Empty state */
        <div className="py-20 text-center px-4">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-sky-500/10 text-sky-500">
            <AtSign className="size-8" strokeWidth={2} />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            No mentions yet
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm leading-relaxed">
            When someone mentions you with <span className="font-semibold text-sky-500">@{user.username}</span> in their posts or comments, it will appear here.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="rounded-full px-6"
          >
            Explore Feed
          </Button>
        </div>
      ) : (
        /* Mentions List */
        <div className="divide-y divide-border/50">
          {posts.map((post) => {
            const timeAgo = (() => {
              try {
                return formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                });
              } catch {
                return "recently";
              }
            })();

            return (
              <div
                key={post.id}
                onClick={() => handleCardClick(post.id)}
                className="group p-4 sm:p-5 hover:bg-muted/40 transition-colors cursor-pointer relative"
              >
                <div className="flex items-start gap-3.5">
                  {/* Author Avatar */}
                  <Link
                    href={`/@${post.author.username}`}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  >
                    <Avatar className="size-10 ring-2 ring-border/40 group-hover:ring-primary/40 transition-all">
                      <AvatarImage
                        src={getAvatarUrl(post.author.avatar)}
                        alt={post.author.name}
                      />
                      <AvatarFallback className="bg-muted text-xs font-bold text-muted-foreground">
                        {getInitials(post.author.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <Link
                          href={`/@${post.author.username}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-bold text-foreground hover:underline flex items-center gap-1 truncate"
                        >
                          <span>{post.author.name}</span>
                          {Boolean(post.author.verified) && (
                            <VerifiedBadge size="sm" />
                          )}
                        </Link>
                        <span className="text-xs text-muted-foreground truncate">
                          @{post.author.username}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {timeAgo}
                        </span>
                      </div>

                      <div className="text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all">
                        <ChevronRight className="size-4" />
                      </div>
                    </div>

                    {/* Content Snippet */}
                    <div className="mt-2">
                      <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap line-clamp-3">
                        {renderMentionContent(post.content, post.mentions)}
                      </p>
                    </div>

                    {/* Thumbnail previews if images present */}
                    {post.images && post.images.length > 0 && (
                      <div className="mt-2.5 flex items-center gap-2 overflow-hidden">
                        {post.images.slice(0, 3).map((img, idx) => (
                          <div
                            key={idx}
                            className="size-14 rounded-lg bg-muted border border-border/50 overflow-hidden relative shrink-0"
                          >
                            <img
                              src={img}
                              alt="Thumbnail"
                              className="size-full object-cover"
                            />
                            {idx === 2 && post.images!.length > 3 && (
                              <div className="absolute inset-0 bg-black/60 text-white text-[11px] font-bold grid place-items-center">
                                +{post.images!.length - 3}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick Footer Stats */}
                    <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 hover:text-red-500 transition-colors">
                        <Heart
                          className={`size-3.5 ${
                            post.is_liked ? "fill-red-500 text-red-500" : ""
                          }`}
                        />
                        <span>{formatCount(post.likes_count)}</span>
                      </span>

                      <span className="flex items-center gap-1 hover:text-primary transition-colors">
                        <MessageSquare className="size-3.5" />
                        <span>{formatCount(post.comments_count)}</span>
                      </span>

                      {typeof post.views_count === "number" && (
                        <span className="flex items-center gap-1">
                          <Eye className="size-3.5" />
                          <span>{formatCount(post.views_count)}</span>
                        </span>
                      )}

                      <span className="ml-auto text-[11px] font-medium text-sky-500 dark:text-sky-400 group-hover:underline">
                        View post →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Load more button */}
          {hasMore && (
            <div className="p-6 text-center">
              <Button
                variant="outline"
                onClick={() => fetchMentions(page + 1, true)}
                disabled={loadingMore}
                className="rounded-full px-6 text-sm font-semibold"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  "Load more mentions"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
