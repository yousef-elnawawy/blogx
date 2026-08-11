"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import PostCard, { PostCardProps } from "@/components/PostCard";
import CreatePost from "@/components/create-post/CreatePost";
import { Loader2, FileText, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";

function PostSkeleton() {
  return (
    <div className="border-b border-border/60 p-4 sm:p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="size-10 rounded-full bg-muted shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
        <div className="h-4 w-3/4 rounded bg-muted" />
      </div>
    </div>
  );
}

export default function Home() {
  const [posts, setPosts] = useState<PostCardProps[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get("/api/posts")
      .then((res) => {
        setPosts(res.data.data || []);
        setNextPageUrl(res.data.next_page_url);
      })
      .catch(() => setPosts([]))
      .finally(() => setPostsLoading(false));

    const handlePostCreated = (e: Event) => {
      const customEvent = e as CustomEvent<PostCardProps>;
      if (customEvent.detail) {
        setPosts((prev) => {
          if (prev.some((p) => String(p.id) === String(customEvent.detail.id))) {
            return prev;
          }
          return [customEvent.detail, ...prev];
        });
      }
    };

    const handlePostDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string | number }>;
      if (customEvent.detail && customEvent.detail.id) {
        setPosts((prev) => prev.filter((p) => String(p.id) !== String(customEvent.detail.id)));
      }
    };

    window.addEventListener("post-created", handlePostCreated);
    window.addEventListener("post-deleted", handlePostDeleted);
    return () => {
      window.removeEventListener("post-created", handlePostCreated);
      window.removeEventListener("post-deleted", handlePostDeleted);
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextPageUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.get(nextPageUrl);
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => String(p.id)));
        const newUniquePosts = (res.data.data || []).filter(
          (p: PostCardProps) => !existingIds.has(String(p.id))
        );
        return [...prev, ...newUniquePosts];
      });
      setNextPageUrl(res.data.next_page_url);
    } catch (error) {
      console.error("Error loading more posts:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [nextPageUrl, loadingMore]);

  // Automatic infinite scroll when scrolling near bottom
  useEffect(() => {
    const target = observerTarget.current;
    if (!target || !nextPageUrl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && nextPageUrl) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "300px" }
    );

    observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [nextPageUrl, loadingMore, loadMore]);

  return (
    <div>
      {/* Page Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/60 px-4 sm:px-5">
        <h1 className="text-xl font-bold text-foreground py-4">Feed</h1>
      </div>

      {/* Create Post */}
      <div className="border-b border-border/60">
        <CreatePost />
      </div>

      {/* Posts Feed */}
      {postsLoading ? (
        <>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </>
      ) : posts.length === 0 ? (
        <div className="p-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <FileText className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">No posts yet</h2>
          <p className="text-sm text-muted-foreground">Be the first to share something.</p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}

          {/* Sentinel element for infinite scrolling */}
          <div ref={observerTarget} className="h-4" />

          {/* Skeleton loader while fetching next batch */}
          {loadingMore && (
            <div className="py-2">
              <PostSkeleton />
            </div>
          )}

          {/* End of posts indicator */}
          {!nextPageUrl && posts.length > 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>You&apos;ve seen all posts</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}