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
              className="p-1.5 -ml-1.5 rounded-full hover:bg-muted transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <div className="grid place-items-center size-7 rounded-lg bg-green-500/10 text-green-500">
                  <Bookmark className="size-4" strokeWidth={2.5} />
                </div>
                <h1 className="text-lg font-bold text-foreground leading-tight">
                  BookMarks
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
        <div className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="p-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-500/10">
            <Bookmark className="size-8 text-green-500 -foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">No saved posts</h2>
          <p className="text-sm text-muted-foreground">
            When you save posts, they will appear here.
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
