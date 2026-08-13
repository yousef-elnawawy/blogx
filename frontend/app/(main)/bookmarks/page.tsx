"use client";

import { useEffect, useState } from "react";
import PostCard, { PostCardProps } from "@/components/PostCard";
import { Loader2, Bookmark, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

export default function BookmarksPage() {
  const [posts, setPosts] = useState<PostCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api
      .get("/api/bookmarks")
      .then((res) => {
        setPosts(res.data.data ?? []);
      })
      .catch((err) => {
        console.error(err);
        setPosts([]);
      })
      .finally(() => setLoading(false));

    const handlePostDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string | number }>;
      if (customEvent.detail && customEvent.detail.id) {
        setPosts((prev) => prev.filter((p) => String(p.id) !== String(customEvent.detail.id)));
      }
    };

    window.addEventListener("post-deleted", handlePostDeleted);
    return () => window.removeEventListener("post-deleted", handlePostDeleted);
  }, []);

  return (
    <div>
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/60 px-4 py-2.5 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Back"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <div className="grid place-items-center size-7 rounded-lg bg-violet-500/10 dark:bg-violet-500/20 text-violet-500 dark:text-violet-400">
                  <Bookmark className="size-4 fill-violet-500/30 dark:fill-violet-400/30" strokeWidth={2.5} />
                </div>
                <h1 className="text-lg font-bold text-foreground leading-tight">
                  Bookmarks
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Posts you have saved
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-violet-500" />
        </div>
      ) : posts.length === 0 ? (
        <div className="p-12 text-center max-w-sm mx-auto">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-violet-500/10 dark:bg-violet-500/20 ring-8 ring-violet-500/5">
            <Bookmark className="size-8 text-violet-500 dark:text-violet-400 fill-violet-500/30 dark:fill-violet-400/30" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">Save posts for later</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Don't let the good ones fly away! Bookmark posts to easily find them again anytime.
          </p>
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}
        </div>
      )}
    </div>
  );
}
