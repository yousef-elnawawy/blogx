"use client";

import { useEffect, useState, useCallback, use } from "react";
import { Hash, TrendingUp, Loader2, ArrowLeft } from "lucide-react";
import PostCard, { PostCardProps } from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import Link from "next/link";

interface HashtagInfo {
  tag: string;
  usage_count: number;
}

interface PaginatedPosts {
  data: PostCardProps[];
  current_page: number;
  last_page: number;
  total: number;
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function HashtagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = use(params);
  const decodedTag = decodeURIComponent(tag).replace(/^#/, "");

  const [hashtagInfo, setHashtagInfo] = useState<HashtagInfo | null>(null);
  const [posts, setPosts] = useState<PostCardProps[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPosts = useCallback(
    async (pageNum: number, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const res = await api.get(
          `/api/hashtags/${encodeURIComponent(decodedTag)}/posts?page=${pageNum}`
        );

        const data = res.data;
        setHashtagInfo(data.hashtag);

        const newPosts: PostCardProps[] = Array.isArray(data.posts)
          ? data.posts
          : (data.posts as PaginatedPosts).data ?? [];

        setPosts((prev) => (append ? [...prev, ...newPosts] : newPosts));

        if (!Array.isArray(data.posts)) {
          setLastPage((data.posts as PaginatedPosts).last_page ?? 1);
          setTotal((data.posts as PaginatedPosts).total ?? newPosts.length);
        } else {
          setTotal(newPosts.length);
        }
      } catch {
        /* silent */
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [decodedTag]
  );

  useEffect(() => {
    fetchPosts(1);
  }, [fetchPosts]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <Link href="/" className="shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full size-9 p-0 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-5" />
            </Button>
          </Link>

          <div className="flex items-center gap-3 min-w-0">
            <div className="grid place-items-center size-10 rounded-2xl bg-primary/10 shrink-0">
              <Hash className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">
                #{decodedTag}
              </h1>
              {hashtagInfo && total > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="size-3" />
                  {formatCount(total)} posts
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
          <div className="grid place-items-center size-16 rounded-full bg-muted/60">
            <Hash className="size-8 opacity-40" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold">No posts yet</p>
            <p className="text-sm mt-1">
              Be the first to post with{" "}
              <span className="text-primary font-semibold">#{decodedTag}</span>
            </p>
          </div>
        </div>
      ) : (
        <>
          <div>
            {posts.map((post) => (
              <PostCard key={post.id} {...post} />
            ))}
          </div>

          {/* Load More */}
          {page < lastPage && (
            <div className="flex justify-center py-6">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-full px-6"
              >
                {loadingMore ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
