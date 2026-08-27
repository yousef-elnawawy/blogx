"use client";

import { useEffect, useState, useCallback } from "react";
import PostCard, { PostCardProps } from "@/components/PostCard";
import BlogCard, { BlogItem } from "@/components/blog/BlogCard";
import {
  Bookmark,
  ArrowLeft,
  Plus,
  Folder,
  MoreVertical,
  Pencil,
  Trash2,
  FolderPlus,
  Sparkles,
} from "lucide-react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BookmarkCollectionDialog, {
  CollectionItem,
  getCollectionColorBadge,
} from "@/components/bookmarks/BookmarkCollectionDialog";
import { toast } from "sonner";

type TabType = "all" | "posts" | "blogs";

export default function BookmarksPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<PostCardProps[]>([]);
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("all");

  // Collection modal states
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<CollectionItem | null>(null);

  useEffect(() => {
    document.title = "Saved Bookmarks / BlogX";
  }, []);

  // Fetch collections
  const fetchCollections = useCallback(() => {
    api
      .get("/api/bookmark-collections")
      .then((res) => {
        setCollections(res.data.collections || []);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  // Fetch bookmarks with optional collection filter
  const fetchBookmarks = useCallback((colId: number | null) => {
    setLoading(true);
    const url = colId ? `/api/bookmarks?collection_id=${colId}` : "/api/bookmarks";
    api
      .get(url)
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
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  useEffect(() => {
    fetchBookmarks(activeCollectionId);

    const handlePostDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string | number }>;
      if (customEvent.detail && customEvent.detail.id) {
        setPosts((prev) => prev.filter((p) => String(p.id) !== String(customEvent.detail.id)));
      }
    };

    window.addEventListener("post-deleted", handlePostDeleted);
    return () => window.removeEventListener("post-deleted", handlePostDeleted);
  }, [activeCollectionId, fetchBookmarks]);

  const handleDeleteCollection = async (id: number) => {
    if (!confirm("Are you sure you want to delete this collection? Your bookmarks will remain safe.")) return;
    try {
      await api.delete(`/api/bookmark-collections/${id}`);
      toast.success("Collection deleted");
      if (activeCollectionId === id) {
        setActiveCollectionId(null);
      }
      setCollections((prev) => prev.filter((c) => c.id !== id));
    } catch {
      toast.error("Failed to delete collection");
    }
  };

  const handleCollectionSaved = (col: CollectionItem) => {
    fetchCollections();
    if (editingCollection) {
      setCollections((prev) => prev.map((c) => (c.id === col.id ? col : c)));
    } else {
      setCollections((prev) => [col, ...prev]);
      setActiveCollectionId(col.id);
    }
  };

  const displayedPosts = activeTab === "blogs" ? [] : posts;
  const displayedBlogs = activeTab === "posts" ? [] : blogs;
  const totalCount = displayedPosts.length + displayedBlogs.length;

  const currentCollection = collections.find((c) => c.id === activeCollectionId);

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
                  {currentCollection ? currentCollection.name : "Bookmarks"}
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentCollection?.description || "Saved posts, articles, and collections"}
              </p>
            </div>
          </div>

          {/* New Collection Button */}
          <button
            type="button"
            onClick={() => {
              setEditingCollection(null);
              setCollectionDialogOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <FolderPlus className="size-4" />
            <span className="hidden sm:inline">New Collection</span>
          </button>
        </div>

        {/* Collections Horizontal Scroll Bar */}
        <div className="px-4 py-2 border-t border-border/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* All Bookmarks Pill */}
          <button
            type="button"
            onClick={() => setActiveCollectionId(null)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 border cursor-pointer",
              activeCollectionId === null
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-muted/50 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground"
            )}
          >
            <Bookmark className="size-3.5" />
            <span>All Bookmarks</span>
          </button>

          {/* Custom Collections Pills */}
          {collections.map((col) => {
            const isActive = activeCollectionId === col.id;
            const itemCount = (col.posts_count || 0) + (col.blogs_count || 0);

            return (
              <div key={col.id} className="relative group shrink-0 flex items-center">
                <button
                  type="button"
                  onClick={() => setActiveCollectionId(col.id)}
                  className={cn(
                    "pl-3 pr-2 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer",
                    isActive
                      ? "bg-foreground text-background border-foreground shadow-xs"
                      : cn("hover:opacity-100", getCollectionColorBadge(col.color))
                  )}
                >
                  <Folder className="size-3.5" />
                  <span>{col.name}</span>
                  {itemCount > 0 && (
                    <span className={cn(
                      "px-1.5 py-0.2 text-[10px] rounded-full font-mono font-black",
                      isActive ? "bg-background/20 text-background" : "bg-black/10 dark:bg-white/10"
                    )}>
                      {itemCount}
                    </span>
                  )}
                </button>

                {/* Options Menu on collection */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 -ml-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/80 transition-colors cursor-pointer"
                    title="Collection options"
                  >
                    <MoreVertical className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36 rounded-xl">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingCollection(col);
                        setCollectionDialogOpen(true);
                      }}
                      className="gap-2 cursor-pointer"
                    >
                      <Pencil className="size-3.5" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteCollection(col.id)}
                      className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>

        {/* Filter Tabs (All / Posts / Blog) */}
        <div className="grid grid-cols-3 border-t border-border/40 text-center">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "py-2.5 text-xs sm:text-sm font-bold transition-colors relative cursor-pointer",
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
              "py-2.5 text-xs sm:text-sm font-bold transition-colors relative cursor-pointer",
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
              "py-2.5 text-xs sm:text-sm font-bold transition-colors relative cursor-pointer",
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
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-bookmark-subtle text-brand-bookmark">
            <Bookmark className="size-7 fill-current" />
          </div>
          <h2 className="text-base font-bold text-foreground font-[family-name:var(--font-fraunces)]">
            {activeCollectionId ? "No items in this collection" : "Save stories and posts for later"}
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {activeCollectionId
              ? "Bookmark posts and blogs and assign them to this collection to see them here."
              : "Bookmark posts and blogs on BlogX to easily find and read them again anytime."}
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

      {/* Collection Create/Edit Dialog */}
      <BookmarkCollectionDialog
        open={collectionDialogOpen}
        onOpenChange={setCollectionDialogOpen}
        collectionToEdit={editingCollection}
        onSaved={handleCollectionSaved}
      />
    </div>
  );
}
