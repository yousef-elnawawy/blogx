"use client";

import { useEffect, useState, useCallback, use } from "react";
import { Hash, TrendingUp, Loader2, ArrowLeft, BookOpen, FileText, Layers } from "lucide-react";
import PostCard, { PostCardProps } from "@/components/PostCard";
import BlogCard, { BlogItem } from "@/components/blog/BlogCard";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

type TabType = "all" | "posts" | "blogs";

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
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("all");
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
        setBlogs(data.blogs ?? []);

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

  const displayedPosts = activeTab === "blogs" ? [] : posts;
  const displayedBlogs = activeTab === "posts" ? [] : blogs;
  const totalItems = displayedPosts.length + displayedBlogs.length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <Link href="/" className="shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-md size-9 p-0 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-5" />
            </Button>
          </Link>

          <div className="flex items-center gap-3 min-w-0">
            <div className="grid place-items-center size-10 rounded-lg bg-primary/10 shrink-0">
              <Hash className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate font-[family-name:var(--font-fraunces)]">
                #{decodedTag}
              </h1>
              {hashtagInfo && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="size-3 text-primary" />
                  {formatCount(total + blogs.length)} items
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="grid grid-cols-3 border-t border-border/40 text-center">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "py-3 text-xs sm:text-sm font-bold transition-colors relative cursor-pointer",
              activeTab === "all" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>All ({posts.length + blogs.length})</span>
            {activeTab === "all" && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={cn(
              "py-3 text-xs sm:text-sm font-bold transition-colors relative cursor-pointer",
              activeTab === "posts" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Posts ({posts.length})</span>
            {activeTab === "posts" && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("blogs")}
            className={cn(
              "py-3 text-xs sm:text-sm font-bold transition-colors relative cursor-pointer",
              activeTab === "blogs" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Blog ({blogs.length})</span>
            {activeTab === "blogs" && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Content Stream */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : totalItems === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
          <div className="grid place-items-center size-16 rounded-lg bg-muted/60">
            <Hash className="size-8 opacity-40" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-foreground font-[family-name:var(--font-fraunces)]">No content found</p>
            <p className="text-sm mt-1">
              Be the first to publish a post or blog with{" "}
              <span className="text-primary font-bold">#{decodedTag}</span>
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border/60">
            {/* Blogs */}
            {displayedBlogs.map((blog) => (
              <BlogCard key={`tag_blog_${blog.id}`} blog={blog} />
            ))}

            {/* Posts */}
            {displayedPosts.map((post) => (
              <PostCard key={`tag_post_${post.id}`} {...post} />
            ))}
          </div>

          {/* Load More */}
          {activeTab !== "blogs" && page < lastPage && (
            <div className="flex justify-center py-6">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-md px-6 text-xs font-semibold"
              >
                {loadingMore ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Load more posts"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
