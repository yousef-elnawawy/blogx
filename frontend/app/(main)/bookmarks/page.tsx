"use client";

import { useEffect, useState } from "react";
import PostCard, { PostCardProps } from "@/components/PostCard";
import { Bookmark, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

export default function BookmarksPage() {
  const [posts, setPosts] = useState<PostCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
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
    <div className="min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/70 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Bookmark className="size-5 text-violet-500 fill-violet-500" />
                <h1 className="text-lg font-black text-foreground leading-tight">
                  Bookmarks
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Saved posts and resources
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="divide-y divide-border/60 animate-in fade-in-50 duration-300">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 sm:p-5 space-y-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-muted" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-4 w-3/4 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="p-12 text-center max-w-sm mx-auto space-y-3">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
            <Bookmark className="size-7 fill-current" />
          </div>
          <h2 className="text-base font-bold text-foreground">Save posts for later</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Bookmark posts on BlogX to easily find and read them again anytime.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {posts.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}
        </div>
      )}
    </div>
  );
}
