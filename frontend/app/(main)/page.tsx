"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import PostCard, { PostCardProps } from "@/components/PostCard";
import CreatePost from "@/components/create-post/CreatePost";
import {
  Loader2,
  FileText,
  CheckCircle2,
  Sparkles,
  UserCheck,
  Code2,
  Utensils,
  Cpu,
  Bot,
  Palette,
  Gamepad2,
  Briefcase,
  Atom,
  Trophy,
  Compass,
} from "lucide-react";
import {
  SuggestedUsersFeedCard,
  TrendingTopicsFeedCard,
  FeaturedArticleFeedCard,
  SuggestedCommunitiesFeedCard,
} from "@/components/feed/FeedDiscoveryCards";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type FeedTab = "for_you" | "following";

const CATEGORY_TAGS = [
  { id: "all", label: "All Topics", icon: Compass },
  { id: "programming", label: "Programming", icon: Code2 },
  { id: "cooking", label: "Cooking", icon: Utensils },
  { id: "technology", label: "Technology", icon: Cpu },
  { id: "ai", label: "AI & ML", icon: Bot },
  { id: "design", label: "Design", icon: Palette },
  { id: "gaming", label: "Gaming", icon: Gamepad2 },
  { id: "business", label: "Business", icon: Briefcase },
  { id: "science", label: "Science", icon: Atom },
  { id: "sports", label: "Sports", icon: Trophy },
];

function FeedSkeleton() {
  return (
    <div className="divide-y divide-border animate-in fade-in-50 duration-300">
      {/* Post Skeleton 1 */}
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-muted/80 animate-pulse shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-36 rounded-full bg-muted/80 animate-pulse" />
            <div className="h-3 w-20 rounded-full bg-muted/60 animate-pulse" />
          </div>
        </div>
        <div className="space-y-2 pl-0 sm:pl-13">
          <div className="h-4 w-full rounded-full bg-muted/70 animate-pulse" />
          <div className="h-4 w-4/5 rounded-full bg-muted/70 animate-pulse" />
          <div className="h-4 w-2/3 rounded-full bg-muted/60 animate-pulse" />
        </div>
        <div className="flex items-center gap-6 pt-2 pl-0 sm:pl-13">
          <div className="h-3 w-10 rounded-full bg-muted/50 animate-pulse" />
          <div className="h-3 w-10 rounded-full bg-muted/50 animate-pulse" />
          <div className="h-3 w-10 rounded-full bg-muted/50 animate-pulse" />
        </div>
      </div>

      {/* Carousel Skeleton (Who to follow) */}
      <div className="py-4 px-4 sm:px-5 bg-muted/10 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 w-28 rounded-full bg-muted/80 animate-pulse" />
          <div className="h-4 w-12 rounded-full bg-muted/50 animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-44 shrink-0 p-4 rounded-xl border border-border/60 bg-background space-y-3 flex flex-col items-center">
              <div className="size-14 rounded-full bg-muted/80 animate-pulse" />
              <div className="h-3.5 w-24 rounded-full bg-muted/80 animate-pulse" />
              <div className="h-3 w-16 rounded-full bg-muted/60 animate-pulse" />
              <div className="h-7 w-full rounded-full bg-muted/70 animate-pulse mt-2" />
            </div>
          ))}
        </div>
      </div>

      {/* Post Skeleton 2 (with media preview) */}
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-muted/80 animate-pulse shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-32 rounded-full bg-muted/80 animate-pulse" />
            <div className="h-3 w-24 rounded-full bg-muted/60 animate-pulse" />
          </div>
        </div>
        <div className="space-y-2 pl-0 sm:pl-13">
          <div className="h-4 w-full rounded-full bg-muted/70 animate-pulse" />
          <div className="h-4 w-3/4 rounded-full bg-muted/70 animate-pulse" />
          <div className="h-48 w-full rounded-xl bg-muted/60 animate-pulse mt-3" />
        </div>
      </div>

      {/* Featured Story Skeleton */}
      <div className="p-4 sm:p-5 space-y-3">
        <div className="h-3.5 w-32 rounded-full bg-muted/70 animate-pulse" />
        <div className="h-44 w-full rounded-xl bg-muted/60 animate-pulse" />
        <div className="h-5 w-3/4 rounded-full bg-muted/80 animate-pulse" />
        <div className="h-3.5 w-full rounded-full bg-muted/60 animate-pulse" />
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FeedTab>("for_you");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [posts, setPosts] = useState<PostCardProps[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async (tab: FeedTab) => {
    setPostsLoading(true);
    try {
      const res = await api.get(`/api/posts?tab=${tab}`);
      setPosts(res.data.data || []);
      setNextPageUrl(res.data.next_page_url);
    } catch {
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = activeTab === "following" ? "Following Feed / BlogX" : "Home / BlogX";
  }, [activeTab]);

  useEffect(() => {
    fetchPosts(activeTab);
  }, [activeTab, fetchPosts]);

  useEffect(() => {
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
    <div className="min-h-screen">
      {/* Sticky Header with Category Topic Pills */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/70">
        <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar bg-background/80">
          {CATEGORY_TAGS.map((tag) => {
            const Icon = tag.icon;
            const isSelected = selectedTag === tag.id;

            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => setSelectedTag(tag.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                    : "bg-background text-muted-foreground border-border/70 hover:text-foreground hover:border-primary/40 hover:bg-muted/40"
                )}
              >
                <Icon className={cn("size-3.5", isSelected ? "text-primary-foreground" : "text-primary")} />
                <span>{tag.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Create Post Area */}
      <div className="border-b border-border">
        <CreatePost />
      </div>

      {/* Posts Stream with Seamless In-Feed Discovery Elements */}
      {postsLoading ? (
        <FeedSkeleton />
      ) : posts.length === 0 ? (
        <div className="p-8 sm:p-12 text-center space-y-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <FileText className="size-7" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              {activeTab === "following" ? "No posts from followed creators" : "No posts found"}
            </h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              {activeTab === "following"
                ? "Follow creators to see their latest thoughts and articles here."
                : "Be the first to share an update with the community."}
            </p>
          </div>

          {/* Show Discovery Sections */}
          <div className="text-left pt-4 space-y-4">
            <SuggestedUsersFeedCard />
            <FeaturedArticleFeedCard />
            <TrendingTopicsFeedCard />
            <SuggestedCommunitiesFeedCard />
          </div>
        </div>
      ) : (
        <div>
          {posts.map((post, index) => (
            <div
              key={post.id}
              className="animate-in fade-in-0 slide-in-from-bottom-2 duration-400 fill-mode-both"
              style={{ animationDelay: `${Math.min(index * 50, 450)}ms` }}
            >
              <PostCard {...post} />

              {/* Discovery Section 1: Who to follow (Horizontal Carousel) after post #1 */}
              {index === 0 && <SuggestedUsersFeedCard />}

              {/* Discovery Section 2: Featured Story after post #2 */}
              {index === 1 && <FeaturedArticleFeedCard />}

              {/* Discovery Section 3: Trending Topics bar after post #4 */}
              {index === 3 && <TrendingTopicsFeedCard />}

              {/* Discovery Section 4: Communities to explore (Horizontal with REAL images) after post #6 */}
              {index === 5 && <SuggestedCommunitiesFeedCard />}
            </div>
          ))}

          {/* If there are fewer posts, display remaining discovery elements */}
          {posts.length === 1 && (
            <>
              <FeaturedArticleFeedCard />
              <TrendingTopicsFeedCard />
              <SuggestedCommunitiesFeedCard />
            </>
          )}

          {/* Sentinel element for infinite scrolling */}
          <div ref={observerTarget} className="h-4" />

          {/* Skeleton loader while fetching next batch */}
          {loadingMore && (
            <div className="py-6 text-center">
              <Loader2 className="size-5 animate-spin text-primary mx-auto" />
            </div>
          )}

          {/* End of posts indicator */}
          {!nextPageUrl && posts.length > 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground flex items-center justify-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>You&apos;ve reached the end of the feed</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}