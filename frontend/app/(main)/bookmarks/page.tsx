"use client";

import { useEffect, useState } from "react";
import PostCard, { PostCardProps } from "@/components/PostCard";
import BlogCard, { BlogItem } from "@/components/blog/BlogCard";
import { Bookmark, ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type TabType = "all" | "posts" | "blogs";

export default function BookmarksPage() {
  const [posts, setPosts] = useState<PostCardProps[]>([]);
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    api
      .get("/api/bookmarks")
      .then((res) => {
        setPosts(res.data.posts ?? res.data.data ?? []);
        setBlogs(res.data.blogs ?? res.data.articles ?? []);
      })
      .catch((err) => {
        console.error(err);
        setPosts([]);
        setBlogs([]);
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

  const displayedPosts = activeTab === "blogs" ? [] : posts;
  const displayedBlogs = activeTab === "posts" ? [] : blogs;
  const totalCount = displayedPosts.length + displayedBlogs.length;

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/70">
        <div className="px-4 py-3 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 -ml-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Bookmark className="size-5 text-brand-bookmark fill-brand-bookmark" />
                <h1 className="text-lg font-black text-foreground leading-tight font-[family-name:var(--font-fraunces)]">
                  Bookmarks
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Saved posts and blog stories
              </p>
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
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-brand-bookmark rounded-full" />
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
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-brand-bookmark rounded-full" />
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
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-brand-bookmark rounded-full" />
            )}
          </button>
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
      ) : totalCount === 0 ? (
        <div className="p-12 text-center max-w-sm mx-auto space-y-3">
          <div className="mx-auto flex size-14 items-center justify-center rounded-lg bg-brand-bookmark-subtle text-brand-bookmark">
            <Bookmark className="size-7 fill-current" />
          </div>
          <h2 className="text-base font-bold text-foreground font-[family-name:var(--font-fraunces)]">Save stories and posts for later</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Bookmark posts and blogs on BlogX to easily find and read them again anytime.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {/* Saved Blogs */}
          {displayedBlogs.map((blog) => (
            <BlogCard key={`saved_blog_${blog.id}`} blog={blog} />
          ))}

          {/* Saved Posts */}
          {displayedPosts.map((post) => (
            <PostCard key={`saved_post_${post.id}`} {...post} />
          ))}
        </div>
      )}
    </div>
  );
}
