"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  TrendingUp,
  Hash,
  Users,
  FileText,
  X,
  Loader2,
  Layers,
  UserPlus,
  MapPin,
  Globe,
  Clock,
  Trash2,
  Sparkles,
  ArrowRight,
  Flame,
  BookOpen,
  Users2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import PostCard, { PostCardProps } from "@/components/PostCard";
import BlogCard, { BlogItem } from "@/components/blog/BlogCard";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import api from "@/lib/api";
import { getAvatarUrl, cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Link from "next/link";

/* ─────────────── Types ─────────────── */
interface UserResult {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  cover?: string | null;
  bio: string | null;
  location?: string | null;
  website?: string | null;
  verified: boolean;
  followers_count: number;
  following_count?: number;
  posts_count?: number;
  is_following: boolean;
}

interface CommunityResult {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  avatar: string | null;
  cover?: string | null;
  type?: string;
  members_count: number;
  posts_count?: number;
  is_member?: boolean;
}

interface HashtagResult {
  tag: string;
  usage_count: number;
}

type Tab = "all" | "posts" | "blogs" | "people" | "communities" | "hashtags";

const RECENT_SEARCHES_KEY = "blogx_recent_searches";

function formatCount(n: number = 0) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ─────────────── Rich Person Card ─────────────── */
function RichPersonCard({
  person,
  onFollowToggle,
}: {
  person: UserResult;
  onFollowToggle?: (userId: number, isFollowing: boolean) => void;
}) {
  const { user: currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(person.is_following);
  const [followerCount, setFollowerCount] = useState(person.followers_count);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const isSelf = currentUser && (currentUser.id === person.id || currentUser.username === person.username);

  useEffect(() => {
    setIsFollowing(person.is_following);
    setFollowerCount(person.followers_count);
  }, [person.is_following, person.followers_count]);

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      toast.error("Please sign in to follow users");
      return;
    }

    if (isSelf || loadingFollow) return;

    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setFollowerCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
    setLoadingFollow(true);

    try {
      const res = await api.post(`/api/users/${person.id}/follow`);
      const confirmedState = res.data.is_following;
      setIsFollowing(confirmedState);
      if (typeof res.data.followers_count === "number") {
        setFollowerCount(res.data.followers_count);
      }
      onFollowToggle?.(person.id, confirmedState);
      toast.success(confirmedState ? `Following @${person.username}` : `Unfollowed @${person.username}`);
    } catch {
      setIsFollowing(!nextState);
      setFollowerCount((prev) => (!nextState ? prev + 1 : Math.max(0, prev - 1)));
      toast.error("Failed to update follow status");
    } finally {
      setLoadingFollow(false);
    }
  };

  return (
    <div className="relative border-b border-border hover:bg-muted/20 transition-all group overflow-hidden">
      {/* Background Accent Banner */}
      <div className="h-16 w-full bg-gradient-to-r from-primary/15 via-amber-500/10 to-violet-500/15 relative overflow-hidden">
        {person.cover && (
          <img
            src={getAvatarUrl(person.cover)}
            alt=""
            className="w-full h-full object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      <div className="px-4 pb-4 sm:px-5 relative">
        {/* Avatar and Action Button */}
        <div className="flex items-end justify-between -mt-8 mb-3">
          <Link
            href={`/@${person.username}`}
            className="relative z-10 block transition-transform group-hover:scale-105"
          >
            <Avatar className="size-16 ring-4 ring-background shadow-md">
              <AvatarImage src={getAvatarUrl(person.avatar)} alt={person.name} />
              <AvatarFallback className="bg-muted text-sm font-bold">
                {getInitials(person.name)}
              </AvatarFallback>
            </Avatar>
          </Link>

          {!isSelf && (
            <div className="relative z-10">
              <Button
                size="sm"
                variant={isFollowing ? "outline" : "default"}
                onClick={handleFollowClick}
                disabled={loadingFollow}
                className={cn(
                  "h-8 px-4 rounded-full text-xs font-semibold transition-all",
                  isFollowing
                    ? "hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive text-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                )}
              >
                {loadingFollow ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : isFollowing ? (
                  <span className="group-hover:hidden">Following</span>
                ) : (
                  <span className="flex items-center gap-1">
                    <UserPlus className="size-3.5" />
                    Follow
                  </span>
                )}
                {isFollowing && !loadingFollow && (
                  <span className="hidden group-hover:inline">Unfollow</span>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* User Info */}
        <Link href={`/@${person.username}`} className="block">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-base font-bold text-foreground hover:underline truncate">
              {person.name}
            </span>
            {Boolean(person.verified) && <VerifiedBadge size="sm" />}
          </div>
          <p className="text-xs text-muted-foreground font-medium">@{person.username}</p>

          {/* Bio */}
          {person.bio && (
            <p className="text-sm text-foreground/90 mt-2 leading-relaxed line-clamp-2">
              {person.bio}
            </p>
          )}

          {/* Meta details: location / website */}
          <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground flex-wrap">
            {person.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5 text-muted-foreground/70 shrink-0" />
                <span className="truncate max-w-[150px]">{person.location}</span>
              </span>
            )}
            {person.website && (
              <span className="inline-flex items-center gap-1">
                <Globe className="size-3.5 text-muted-foreground/70 shrink-0" />
                <span className="truncate max-w-[150px]">{person.website.replace(/^https?:\/\//, "")}</span>
              </span>
            )}
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-border/40 text-xs">
            <div>
              <span className="font-bold text-foreground">{formatCount(followerCount)}</span>
              <span className="text-muted-foreground ml-1">Followers</span>
            </div>
            {typeof person.following_count === "number" && (
              <div>
                <span className="font-bold text-foreground">{formatCount(person.following_count)}</span>
                <span className="text-muted-foreground ml-1">Following</span>
              </div>
            )}
            {typeof person.posts_count === "number" && (
              <div>
                <span className="font-bold text-foreground">{formatCount(person.posts_count)}</span>
                <span className="text-muted-foreground ml-1">Posts</span>
              </div>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}

/* ─────────────── Community Search Card ─────────────── */
function CommunitySearchCard({ community }: { community: CommunityResult }) {
  const avatarSrc = getAvatarUrl(community.avatar);
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/c/${community.slug}`)}
      className="p-4 sm:p-5 hover:bg-muted/30 transition-colors border-b border-border/60 cursor-pointer group"
    >
      <div className="flex items-start gap-3.5">
        <Avatar className="size-12 rounded-2xl ring-1 ring-border/60 shrink-0">
          <AvatarImage src={avatarSrc} alt={community.name} />
          <AvatarFallback className="rounded-2xl text-sm font-bold bg-primary/10 text-primary">
            {getInitials(community.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                {community.name}
              </h3>
              <p className="text-xs text-muted-foreground font-mono">c/{community.slug}</p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/c/${community.slug}`);
              }}
              className="rounded-full text-xs font-semibold h-8 px-3.5 hover:border-primary/50"
            >
              View
            </Button>
          </div>

          {community.description && (
            <p className="text-xs sm:text-sm text-foreground/80 mt-1.5 line-clamp-2 leading-relaxed">
              {community.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>{formatCount(community.members_count)} members</span>
            {typeof community.posts_count === "number" && (
              <>
                <span>•</span>
                <span>{formatCount(community.posts_count)} posts</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Hashtag Card ─────────────── */
function HashtagCard({
  tag,
  usage_count,
  rank,
}: {
  tag: string;
  usage_count: number;
  rank?: number;
}) {
  return (
    <Link
      href={`/hashtag/${encodeURIComponent(tag)}`}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0 group"
    >
      <div className="grid place-items-center size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-500 shrink-0 group-hover:scale-105 transition-transform">
        {rank !== undefined ? (
          <span className="text-xs font-black">#{rank}</span>
        ) : (
          <Hash className="size-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
          #{tag}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {usage_count > 0 ? `${formatCount(usage_count)} posts` : "Trending topic"}
        </p>
      </div>
      <TrendingUp className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
    </Link>
  );
}

/* ─────────────── Skeletons ─────────────── */
function SearchSkeleton() {
  return (
    <div className="divide-y divide-border/60 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full bg-muted" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-20 bg-muted rounded" />
            </div>
            <div className="h-8 w-20 bg-muted rounded-full" />
          </div>
          <div className="h-3.5 w-3/4 bg-muted rounded" />
          <div className="h-3.5 w-1/2 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

/* ─────────────── Empty State ─────────────── */
function EmptyState({
  title,
  subtitle,
  onReset,
}: {
  title: string;
  subtitle: string;
  onReset?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="size-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4 text-muted-foreground/60 ring-8 ring-muted/20">
        <Search className="size-8" />
      </div>
      <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-4">
        {subtitle}
      </p>
      {onReset && (
        <Button variant="outline" size="sm" onClick={onReset} className="rounded-full text-xs">
          Clear Search
        </Button>
      )}
    </div>
  );
}

/* ─────────────── Main Search Page Content ─────────────── */
function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialTab = (searchParams.get("tab") as Tab | null) ?? "all";

  const [query, setQuery] = useState(initialQ);
  const [inputValue, setInputValue] = useState(initialQ);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(false);

  const [posts, setPosts] = useState<PostCardProps[]>([]);
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [people, setPeople] = useState<UserResult[]>([]);
  const [communities, setCommunities] = useState<CommunityResult[]>([]);
  const [hashtags, setHashtags] = useState<HashtagResult[]>([]);

  // Discover state (no query)
  const [trending, setTrending] = useState<HashtagResult[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [suggestedUsers, setSuggestedUsers] = useState<UserResult[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = query ? `"${query}" - Search / BlogX` : "Search & Explore / BlogX";
  }, [query]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const saveRecentSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    try {
      const filtered = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 10);
      setRecentSearches(filtered);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(filtered));
    } catch {
      /* ignore */
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      /* ignore */
    }
  };

  const removeRecentSearch = (itemToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter((item) => item !== itemToRemove);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  };

  // Load trending and suggested users on mount
  useEffect(() => {
    api
      .get("/api/hashtags/trending?limit=10")
      .then((r) => setTrending(r.data.hashtags || []))
      .catch(() => {})
      .finally(() => setTrendingLoading(false));

    api
      .get("/api/users/suggestions?limit=6")
      .then((r) => setSuggestedUsers(r.data.users || []))
      .catch(() => {})
      .finally(() => setSuggestedLoading(false));
  }, []);

  // Perform search
  const doSearch = useCallback(
    async (q: string, tab: Tab) => {
      if (!q.trim()) {
        setPosts([]);
        setBlogs([]);
        setPeople([]);
        setCommunities([]);
        setHashtags([]);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get(
          `/api/search?q=${encodeURIComponent(q)}&type=${tab}`
        );
        setPosts(res.data.posts || []);
        setBlogs(res.data.blogs || []);
        setPeople(res.data.people || []);
        setCommunities(res.data.communities || []);
        setHashtags(res.data.hashtags || []);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    doSearch(query, activeTab);
  }, [query, activeTab, doSearch]);

  const handleExecuteSearch = (q: string) => {
    const trimmed = q.trim();
    setInputValue(trimmed);
    setQuery(trimmed);
    if (trimmed) {
      saveRecentSearch(trimmed);
      router.replace(`/search?q=${encodeURIComponent(trimmed)}&tab=${activeTab}`, {
        scroll: false,
      });
    } else {
      router.replace("/search", { scroll: false });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecuteSearch(inputValue);
  };

  const handleClear = () => {
    setInputValue("");
    setQuery("");
    router.replace("/search", { scroll: false });
    inputRef.current?.focus();
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (query) {
      router.replace(
        `/search?q=${encodeURIComponent(query)}&tab=${tab}`,
        { scroll: false }
      );
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "Top", icon: <Layers className="size-4" /> },
    { id: "posts", label: "Posts", icon: <FileText className="size-4" /> },
    { id: "blogs", label: "Blog", icon: <BookOpen className="size-4" /> },
    { id: "people", label: "People", icon: <Users className="size-4" /> },
    { id: "communities", label: "Communities", icon: <Users2 className="size-4" /> },
    { id: "hashtags", label: "Topics", icon: <Hash className="size-4" /> },
  ];

  const hasQuery = query.trim() !== "";

  return (
    <div className="min-h-screen pb-16">
      {/* ── Sticky Search Header ── */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 pt-3 pb-0 sm:px-6">
        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search profiles, keywords, #hashtags..."
            autoFocus={!initialQ}
            className="w-full h-11 rounded-full bg-muted/60 hover:bg-muted/80 border border-border/60 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
          />
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Clear input"
            >
              <X className="size-4" />
            </button>
          )}
        </form>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 mt-2.5 overflow-x-auto no-scrollbar">
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors shrink-0",
                  isActive
                    ? "text-primary font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-t-lg"
                )}
              >
                {t.icon}
                <span>{t.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content Area ── */}
      {loading ? (
        <SearchSkeleton />
      ) : hasQuery ? (
        /* ────────────── Active Search Results ────────────── */
        <div>
          {/* TAB: ALL */}
          {activeTab === "all" && (
            <div>
              {/* Top People Section */}
              {people.length > 0 && (
                <div className="border-b border-border">
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/20 sm:px-6">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-primary" />
                      <h2 className="text-sm font-bold text-foreground">People</h2>
                    </div>
                    {people.length > 2 && (
                      <button
                        onClick={() => handleTabChange("people")}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        View all
                        <ArrowRight className="size-3" />
                      </button>
                    )}
                  </div>
                  <div>
                    {people.slice(0, 3).map((person) => (
                      <RichPersonCard key={person.id} person={person} />
                    ))}
                  </div>
                </div>
              )}

              {/* Top Communities Section */}
              {communities.length > 0 && (
                <div className="border-b border-border">
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/20 sm:px-6">
                    <div className="flex items-center gap-2">
                      <Users2 className="size-4 text-primary" />
                      <h2 className="text-sm font-bold text-foreground">Communities</h2>
                    </div>
                    {communities.length > 2 && (
                      <button
                        onClick={() => handleTabChange("communities")}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        View all
                        <ArrowRight className="size-3" />
                      </button>
                    )}
                  </div>
                  <div>
                    {communities.slice(0, 3).map((c) => (
                      <CommunitySearchCard key={c.id} community={c} />
                    ))}
                  </div>
                </div>
              )}

              {/* Top Hashtags Pills */}
              {hashtags.length > 0 && (
                <div className="p-4 sm:px-6 border-b border-border bg-muted/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Hash className="size-4 text-amber-500" />
                    <h2 className="text-sm font-bold text-foreground">Matching Topics</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hashtags.map((h) => (
                      <Link
                        key={h.tag}
                        href={`/hashtag/${encodeURIComponent(h.tag)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border/70 hover:border-primary/50 text-xs font-bold text-foreground hover:text-primary transition-colors shadow-2xs"
                      >
                        <span className="text-primary font-bold">#</span>
                        <span>{h.tag}</span>
                        {h.usage_count > 0 && (
                          <span className="text-[11px] font-normal text-muted-foreground">
                            · {formatCount(h.usage_count)}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Blogs Section */}
              {blogs.length > 0 && (
                <div className="border-b border-border">
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/20 sm:px-6">
                    <div className="flex items-center gap-2">
                      <BookOpen className="size-4 text-primary" />
                      <h2 className="text-sm font-bold text-foreground">Blog Stories</h2>
                    </div>
                    {blogs.length > 2 && (
                      <button
                        onClick={() => handleTabChange("blogs")}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        View all
                        <ArrowRight className="size-3" />
                      </button>
                    )}
                  </div>
                  <div>
                    {blogs.slice(0, 3).map((blog) => (
                      <BlogCard key={blog.id} blog={blog} />
                    ))}
                  </div>
                </div>
              )}

              {/* Posts Feed */}
              {posts.length > 0 && (
                <div>
                  <div className="px-4 py-3 bg-muted/20 border-b border-border sm:px-6 flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    <h2 className="text-sm font-bold text-foreground">Posts</h2>
                  </div>
                  {posts.map((post) => (
                    <PostCard key={post.id} {...post} showPinnedBadge={false} />
                  ))}
                </div>
              )}

              {/* No results at all */}
              {people.length === 0 && communities.length === 0 && hashtags.length === 0 && posts.length === 0 && blogs.length === 0 && (
                <EmptyState
                  title={`No results for "${query}"`}
                  subtitle="Try searching for something else, checking for spelling errors, or browsing trending topics."
                  onReset={handleClear}
                />
              )}
            </div>
          )}

          {/* TAB: PEOPLE */}
          {activeTab === "people" && (
            <div>
              {people.length > 0 ? (
                <div>
                  {people.map((person) => (
                    <RichPersonCard key={person.id} person={person} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={`No people found for "${query}"`}
                  subtitle="Try searching for a different username or full name."
                  onReset={handleClear}
                />
              )}
            </div>
          )}

          {/* TAB: POSTS */}
          {activeTab === "posts" && (
            <div>
              {posts.length > 0 ? (
                <div>
                  {posts.map((post) => (
                    <PostCard key={post.id} {...post} showPinnedBadge={false} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={`No posts found for "${query}"`}
                  subtitle="Try searching for different keywords or hashtags."
                  onReset={handleClear}
                />
              )}
            </div>
          )}

          {/* TAB: BLOGS */}
          {activeTab === "blogs" && (
            <div>
              {blogs.length > 0 ? (
                <div className="divide-y divide-border/60">
                  {blogs.map((blog) => (
                    <BlogCard key={blog.id} blog={blog} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={`No blog stories found for "${query}"`}
                  subtitle="Try searching for different blog topics or keywords."
                  onReset={handleClear}
                />
              )}
            </div>
          )}

          {/* TAB: COMMUNITIES */}
          {activeTab === "communities" && (
            <div>
              {communities.length > 0 ? (
                <div>
                  {communities.map((c) => (
                    <CommunitySearchCard key={c.id} community={c} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={`No communities found for "${query}"`}
                  subtitle="Try searching for a different community name or keyword."
                  onReset={handleClear}
                />
              )}
            </div>
          )}

          {/* TAB: HASHTAGS */}
          {activeTab === "hashtags" && (
            <div>
              {hashtags.length > 0 ? (
                <div className="divide-y divide-border/60">
                  {hashtags.map((h) => (
                    <HashtagCard key={h.tag} {...h} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={`No hashtags found for "${query}"`}
                  subtitle="No hashtags matched your search."
                  onReset={handleClear}
                />
              )}
            </div>
          )}
        </div>
      ) : (
        /* ────────────── Discover / Explore Mode (No query) ────────────── */
        <div className="space-y-6 pt-4">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="px-4 sm:px-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-bold text-foreground">Recent Searches</h2>
                </div>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <Trash2 className="size-3" />
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    onClick={() => handleExecuteSearch(item)}
                    className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted text-xs font-medium text-foreground transition-colors border border-border/40"
                  >
                    <Search className="size-3 text-muted-foreground" />
                    <span>{item}</span>
                    <span
                      onClick={(e) => removeRecentSearch(item, e)}
                      className="p-0.5 rounded-full hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="size-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggested People to Follow */}
          <div className="px-4 sm:px-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">Who to Follow</h2>
              </div>
            </div>

            {suggestedLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-44 rounded-2xl bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : suggestedUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">No suggestions available right now.</p>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/60">
                {suggestedUsers.map((person) => (
                  <RichPersonCard key={person.id} person={person} />
                ))}
              </div>
            )}
          </div>

          {/* Trending Topics on BlogX */}
          <div className="px-4 sm:px-6">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="size-4 text-amber-500" />
              <h2 className="text-base font-bold text-foreground">Trending on BlogX</h2>
            </div>

            {trendingLoading ? (
              <div className="space-y-2 py-4">
                <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : trending.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trending hashtags yet. Be the first to start a conversation!</p>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/60">
                {trending.map((h, index) => (
                  <HashtagCard key={h.tag} {...h} rank={index + 1} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageContent />
    </Suspense>
  );
}
