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
import SeriesCard, { SeriesCardProps } from "@/components/blog/SeriesCard";
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

/* ─────────────── Standard Person Item ─────────────── */
function PersonItem({
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
    <div className="flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors border-b border-border/60">
      <Link href={`/@${person.username}`} className="flex items-center gap-3 min-w-0 flex-1 group">
        <Avatar className="size-11 rounded-full ring-1 ring-border/50 shrink-0">
          <AvatarImage src={getAvatarUrl(person.avatar)} alt={person.name} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
            {getInitials(person.name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-foreground group-hover:underline truncate">
              {person.name}
            </span>
            {person.verified && <VerifiedBadge size="sm" />}
          </div>
          <p className="text-xs text-muted-foreground font-mono truncate">@{person.username}</p>
          {person.bio && (
            <p className="text-xs text-foreground/80 line-clamp-1 mt-0.5">{person.bio}</p>
          )}
        </div>
      </Link>

      {!isSelf && (
        <Button
          size="sm"
          variant={isFollowing ? "outline" : "default"}
          onClick={handleFollowClick}
          disabled={loadingFollow}
          className={cn(
            "rounded-full text-xs font-semibold h-8 px-4 shrink-0",
            isFollowing ? "hover:border-destructive hover:text-destructive" : ""
          )}
        >
          {loadingFollow ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : isFollowing ? (
            "Following"
          ) : (
            "Follow"
          )}
        </Button>
      )}
    </div>
  );
}

/* ─────────────── Community Item ─────────────── */
function CommunityItem({ community }: { community: CommunityResult }) {
  return (
    <Link
      href={`/c/${community.slug}`}
      className="flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors border-b border-border/60 group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Avatar className="size-11 rounded-xl ring-1 ring-border/50 shrink-0">
          <AvatarImage src={getAvatarUrl(community.avatar)} alt={community.name} />
          <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-xs">
            {getInitials(community.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
              {community.name}
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">c/{community.slug}</span>
          </div>
          {community.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {community.description}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground mt-1">
            {formatCount(community.members_count)} members
          </p>
        </div>
      </div>
      <Button size="sm" variant="outline" className="rounded-full text-xs h-8 px-3 shrink-0">
        View
      </Button>
    </Link>
  );
}

/* ─────────────── Hashtag Item ─────────────── */
function HashtagItem({ tag, usage_count, rank }: { tag: string; usage_count: number; rank?: number }) {
  return (
    <Link
      href={`/hashtag/${encodeURIComponent(tag)}`}
      className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors border-b border-border/60 group"
    >
      <div className="flex items-center gap-3">
        <div className="grid place-items-center size-9 rounded-lg bg-primary/10 text-primary font-bold text-xs shrink-0">
          {rank !== undefined ? `#${rank}` : <Hash className="size-4" />}
        </div>
        <div>
          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
            #{tag}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {usage_count > 0 ? `${formatCount(usage_count)} posts` : "Trending"}
          </p>
        </div>
      </div>
      <TrendingUp className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
    </Link>
  );
}

/* ─────────────── Skeletons ─────────────── */
function SearchSkeleton() {
  return (
    <div className="divide-y divide-border/60 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-muted" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-20 bg-muted rounded" />
            </div>
            <div className="h-8 w-16 bg-muted rounded-full" />
          </div>
          <div className="h-3.5 w-3/4 bg-muted rounded" />
        </div>
      ))}
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

  // Results
  const [posts, setPosts] = useState<PostCardProps[]>([]);
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [series, setSeries] = useState<SeriesCardProps[]>([]);
  const [people, setPeople] = useState<UserResult[]>([]);
  const [communities, setCommunities] = useState<CommunityResult[]>([]);
  const [hashtags, setHashtags] = useState<HashtagResult[]>([]);

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Discover state (empty query)
  const [trending, setTrending] = useState<HashtagResult[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = query ? `"${query}" - Search / BlogX` : "Search / BlogX";
  }, [query]);

  // Load recent searches
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {}
  }, []);

  const saveRecentSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    try {
      const filtered = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 10);
      setRecentSearches(filtered);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(filtered));
    } catch {}
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {}
  };

  const removeRecentSearch = (itemToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter((item) => item !== itemToRemove);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {}
  };

  // Fetch trending on mount
  useEffect(() => {
    api
      .get("/api/hashtags/trending?limit=10")
      .then((r) => setTrending(r.data.hashtags || []))
      .catch(() => {});

    api
      .get("/api/users/suggestions?limit=6")
      .then((r) => setSuggestedUsers(r.data.users || []))
      .catch(() => {});
  }, []);

  // Main search fetch
  const doSearch = useCallback(
    async (q: string, tab: Tab, pageNum: number = 1, append: boolean = false) => {
      if (!q.trim()) {
        setPosts([]);
        setBlogs([]);
        setSeries([]);
        setPeople([]);
        setCommunities([]);
        setHashtags([]);
        setHasMore(false);
        return;
      }

      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await api.get(
          `/api/search?q=${encodeURIComponent(q)}&type=${tab}&page=${pageNum}&per_page=15`
        );

        const data = res.data;

        if (tab === "all") {
          setPosts(data.posts || []);
          setBlogs(data.blogs || []);
          setSeries(data.series || []);
          setPeople(data.people || []);
          setCommunities(data.communities || []);
          setHashtags(data.hashtags || []);
          setHasMore(false);
        } else if (tab === "posts") {
          const incoming = data.posts || [];
          setPosts(append ? (prev) => [...prev, ...incoming] : incoming);
          setHasMore(Boolean(data.has_more));
        } else if (tab === "blogs") {
          const incomingBlogs = data.blogs || [];
          const incomingSeries = data.series || [];
          setBlogs(append ? (prev) => [...prev, ...incomingBlogs] : incomingBlogs);
          setSeries(append ? (prev) => [...prev, ...incomingSeries] : incomingSeries);
          setHasMore(Boolean(data.has_more));
        } else if (tab === "people") {
          const incoming = data.people || [];
          setPeople(append ? (prev) => [...prev, ...incoming] : incoming);
          setHasMore(Boolean(data.has_more));
        } else if (tab === "communities") {
          const incoming = data.communities || [];
          setCommunities(append ? (prev) => [...prev, ...incoming] : incoming);
          setHasMore(Boolean(data.has_more));
        } else if (tab === "hashtags") {
          const incoming = data.hashtags || [];
          setHashtags(append ? (prev) => [...prev, ...incoming] : incoming);
          setHasMore(Boolean(data.has_more));
        }
      } catch (err) {
        console.error("Search API failed:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Debounced input sync
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = inputValue.trim();
      if (trimmed !== query) {
        setQuery(trimmed);
        setPage(1);
        if (trimmed) {
          saveRecentSearch(trimmed);
          router.replace(`/search?q=${encodeURIComponent(trimmed)}&tab=${activeTab}`, { scroll: false });
        } else {
          router.replace("/search", { scroll: false });
        }
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [inputValue, query, activeTab, router]);

  // Execute search when query or activeTab changes
  useEffect(() => {
    setPage(1);
    doSearch(query, activeTab, 1, false);
  }, [query, activeTab, doSearch]);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    doSearch(query, activeTab, nextPage, true);
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setPage(1);
    if (query) {
      router.replace(`/search?q=${encodeURIComponent(query)}&tab=${tab}`, { scroll: false });
    }
  };

  const handleClear = () => {
    setInputValue("");
    setQuery("");
    router.replace("/search", { scroll: false });
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    setQuery(trimmed);
    if (trimmed) {
      saveRecentSearch(trimmed);
      router.replace(`/search?q=${encodeURIComponent(trimmed)}&tab=${activeTab}`, { scroll: false });
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "Top", icon: <Layers className="size-4" /> },
    { id: "posts", label: "Posts", icon: <FileText className="size-4" /> },
    { id: "blogs", label: "Articles & Stories", icon: <BookOpen className="size-4" /> },
    { id: "people", label: "People", icon: <Users className="size-4" /> },
    { id: "communities", label: "Communities", icon: <Users2 className="size-4" /> },
    { id: "hashtags", label: "Topics", icon: <Hash className="size-4" /> },
  ];

  const hasQuery = query.trim() !== "";

  return (
    <div className="min-h-screen pb-20">
      {/* ── Sticky Top Search Bar & Tabs ── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-4 pt-3 pb-0">
        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search BlogX..."
            autoFocus={!initialQ}
            className="w-full h-10 rounded-full bg-muted/60 hover:bg-muted/80 border border-border pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </form>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mt-2 overflow-x-auto no-scrollbar">
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
        /* Active Search Results */
        <div>
          {/* TAB: ALL */}
          {activeTab === "all" && (
            <div className="divide-y divide-border">
              {/* People Section */}
              {people.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border/60">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      People
                    </span>
                    <button
                      onClick={() => handleTabChange("people")}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  <div className="divide-y divide-border/60">
                    {people.slice(0, 3).map((p) => (
                      <PersonItem key={p.id} person={p} />
                    ))}
                  </div>
                </div>
              )}

              {/* Articles & Stories Section */}
              {(blogs.length > 0 || series.length > 0) && (
                <div>
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border/60">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <BookOpen className="size-3.5 text-primary" /> Articles & Stories
                    </span>
                    <button
                      onClick={() => handleTabChange("blogs")}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      View all ({blogs.length + series.length})
                    </button>
                  </div>
                  <div className="divide-y divide-border/60">
                    {series.slice(0, 2).map((s) => (
                      <SeriesCard key={`series-${s.id}`} series={s} />
                    ))}
                    {blogs.slice(0, 3).map((b) => (
                      <BlogCard key={`blog-${b.id}`} blog={b} />
                    ))}
                  </div>
                </div>
              )}

              {/* Communities Section */}
              {communities.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border/60">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Communities
                    </span>
                    <button
                      onClick={() => handleTabChange("communities")}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  <div className="divide-y divide-border/60">
                    {communities.slice(0, 3).map((c) => (
                      <CommunityItem key={c.id} community={c} />
                    ))}
                  </div>
                </div>
              )}

              {/* Posts Section */}
              {posts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border/60">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Posts
                    </span>
                    <button
                      onClick={() => handleTabChange("posts")}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {posts.slice(0, 4).map((p) => (
                      <PostCard key={p.id} {...p} />
                    ))}
                  </div>
                </div>
              )}

              {/* No results in ALL */}
              {posts.length === 0 && blogs.length === 0 && series.length === 0 && people.length === 0 && communities.length === 0 && (
                <div className="text-center py-16 px-4">
                  <p className="text-sm font-semibold text-foreground">No results found for &quot;{query}&quot;</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try searching with different keywords or names.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB: POSTS */}
          {activeTab === "posts" && (
            <div>
              {posts.length > 0 ? (
                <div className="divide-y divide-border">
                  {posts.map((p) => (
                    <PostCard key={p.id} {...p} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 px-4">
                  <p className="text-sm font-semibold text-foreground">No posts found</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: BLOGS & STORIES */}
          {activeTab === "blogs" && (
            <div>
              {blogs.length > 0 || series.length > 0 ? (
                <div className="divide-y divide-border/60">
                  {series.map((s) => (
                    <SeriesCard key={`series-${s.id}`} series={s} />
                  ))}
                  {blogs.map((b) => (
                    <BlogCard key={`blog-${b.id}`} blog={b} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 px-4">
                  <p className="text-sm font-semibold text-foreground">No articles or stories found</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: PEOPLE */}
          {activeTab === "people" && (
            <div className="divide-y divide-border">
              {people.length > 0 ? (
                people.map((p) => <PersonItem key={p.id} person={p} />)
              ) : (
                <div className="text-center py-16 px-4">
                  <p className="text-sm font-semibold text-foreground">No creators found</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: COMMUNITIES */}
          {activeTab === "communities" && (
            <div className="divide-y divide-border">
              {communities.length > 0 ? (
                communities.map((c) => <CommunityItem key={c.id} community={c} />)
              ) : (
                <div className="text-center py-16 px-4">
                  <p className="text-sm font-semibold text-foreground">No communities found</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: TOPICS */}
          {activeTab === "hashtags" && (
            <div className="divide-y divide-border">
              {hashtags.length > 0 ? (
                hashtags.map((h, i) => <HashtagItem key={h.tag} tag={h.tag} usage_count={h.usage_count} rank={i + 1} />)
              ) : (
                <div className="text-center py-16 px-4">
                  <p className="text-sm font-semibold text-foreground">No topics found</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination: Load More Button */}
          {activeTab !== "all" && hasMore && (
            <div className="py-6 text-center border-t border-border">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-full px-6 text-xs font-semibold"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Loading more...
                  </span>
                ) : (
                  "Load more results"
                )}
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* ── Discover / Explore Mode ── */
        <div className="divide-y divide-border">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5" /> Recent
                </span>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputValue(item);
                      setQuery(item);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted border border-border text-xs text-foreground transition-colors group"
                  >
                    <span>{item}</span>
                    <span
                      onClick={(e) => removeRecentSearch(item, e)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending Topics */}
          {trending.length > 0 && (
            <div>
              <div className="px-4 py-3 bg-muted/20 border-b border-border/60">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="size-3.5 text-primary" /> Trending Topics
                </span>
              </div>
              <div className="divide-y divide-border/60">
                {trending.map((t, idx) => (
                  <HashtagItem key={idx} tag={t.tag} usage_count={t.usage_count} rank={idx + 1} />
                ))}
              </div>
            </div>
          )}

          {/* Suggested Creators */}
          {suggestedUsers.length > 0 && (
            <div>
              <div className="px-4 py-3 bg-muted/20 border-b border-border/60">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Who to follow
                </span>
              </div>
              <div className="divide-y divide-border/60">
                {suggestedUsers.map((u) => (
                  <PersonItem key={u.id} person={u} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
