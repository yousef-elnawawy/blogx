"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Video,
  Plus,
  Loader2,
  Sparkles,
  TrendingUp,
  Clock,
  Film,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PostCard, { PostCardProps } from "@/components/PostCard";
import PostEditorDialog from "@/components/create-post/PostEditorDialog";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";

export default function VideosPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [posts, setPosts] = useState<PostCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    document.title = "Videos / BlogX";
  }, []);

  const fetchVideos = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await api.get(`/api/posts/videos?page=${pageNum}`);
      const data = res.data;
      const items = data.data || [];

      setPosts((prev) => (append ? [...prev, ...items] : items));
      setHasMore(Boolean(data.next_page_url));
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to load videos:", err);
      toast.error("Failed to load videos feed.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos(1);
  }, [fetchVideos]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchVideos(page + 1, true);
    }
  };

  const handlePostCreated = (newPost: PostCardProps) => {
    if (newPost.video) {
      setPosts((prev) => [newPost, ...prev]);
    }
  };

  const handlePostDeleted = (deletedId: string | number) => {
    setPosts((prev) => prev.filter((p) => String(p.id) !== String(deletedId)));
  };

  return (
    <div className="min-h-screen border-x border-border/70 pb-20 sm:pb-12 bg-background/50">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/80 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shadow-xs">
            <Video className="size-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Videos</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                Hub
              </span>
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Watch tech demos, coding sessions, and creator videos
            </p>
          </div>
        </div>

        {/* Upload Video Post Button */}
        {user && (
          <Button
            onClick={() => setEditorOpen(true)}
            className="rounded-full gap-1.5 px-4 h-9 text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="size-4" />
            <span>Upload Video</span>
          </Button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="p-0 sm:p-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-red-600" />
            <p className="text-sm font-medium">Loading videos...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4">
            <div className="size-16 rounded-3xl bg-muted border border-border/80 flex items-center justify-center text-muted-foreground shadow-inner">
              <Film className="size-8 text-red-500/70" />
            </div>
            <div className="max-w-sm space-y-1.5">
              <h3 className="text-base font-bold text-foreground">
                No videos published yet
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Be the first creator to share a video or tutorial on BlogX!
              </p>
            </div>
            {user && (
              <Button
                onClick={() => setEditorOpen(true)}
                className="rounded-full gap-1.5 px-5 h-9 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                <Plus className="size-3.5" />
                <span>Share a Video</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                {...post}
                onDelete={() => handlePostDeleted(post.id)}
              />
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="py-6 flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-full px-6 h-10 text-xs font-bold border-border/80 hover:bg-muted"
                >
                  {loadingMore ? (
                    <Loader2 className="size-4 animate-spin mr-2" />
                  ) : null}
                  Load more videos
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Video Post Dialog */}
      <PostEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
}
