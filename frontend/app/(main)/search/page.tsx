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
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import PostCard, { PostCardProps } from "@/components/PostCard";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import api from "@/lib/api";
import { getAvatarUrl } from "@/lib/utils";
import Link from "next/link";

/* ─────────────── Types ─────────────── */
interface UserResult {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  verified: boolean;
  followers_count: number;
  is_following: boolean;
}

interface HashtagResult {
  tag: string;
  usage_count: number;
}

type Tab = "posts" | "people" | "hashtags";

function formatCount(n: number) {
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

/* ─────────────── People Card ─────────────── */
function PersonCard({ person }: { person: UserResult }) {
  return (
    <Link
      href={`/@${person.username}`}
      className="flex items-start gap-3 px-4 py-4 hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0"
    >
      <Avatar className="size-11 shrink-0 ring-2 ring-border/40">
        <AvatarImage src={getAvatarUrl(person.avatar)} alt={person.name} />
        <AvatarFallback className="bg-muted text-xs font-bold">
          {getInitials(person.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-bold text-foreground truncate">
            {person.name}
          </p>
          {Boolean(person.verified) && <VerifiedBadge size="sm" />}
        </div>
        <p className="text-xs text-muted-foreground">@{person.username}</p>
        {person.bio && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {person.bio}
          </p>
        )}
        <p className="text-xs text-muted-foreground/70 mt-1">
          {formatCount(person.followers_count)} followers
        </p>
      </div>
    </Link>
  );
}

/* ─────────────── Hashtag Card ─────────────── */
function HashtagCard({ tag, usage_count }: HashtagResult) {
  return (
    <Link
      href={`/hashtag/${encodeURIComponent(tag)}`}
      className="flex items-center gap-3 px-4 py-4 hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0"
    >
      <div className="grid place-items-center size-11 rounded-2xl bg-primary/10 shrink-0">
        <Hash className="size-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">#{tag}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {usage_count > 0 ? `${formatCount(usage_count)} posts` : "New hashtag"}
        </p>
      </div>
      <TrendingUp className="size-4 text-muted-foreground/50 shrink-0" />
    </Link>
  );
}

/* ─────────────── Empty State ─────────────── */
function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
      <Search className="size-10 opacity-30" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/* ─────────────── Main Search Page ─────────────── */
function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialTab = (searchParams.get("tab") as Tab | null) ?? "posts";

  const [query, setQuery] = useState(initialQ);
  const [inputValue, setInputValue] = useState(initialQ);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(false);

  const [posts, setPosts] = useState<PostCardProps[]>([]);
  const [people, setPeople] = useState<UserResult[]>([]);
  const [hashtags, setHashtags] = useState<HashtagResult[]>([]);
  const [trending, setTrending] = useState<HashtagResult[]>([]);
  const [trendingLoaded, setTrendingLoaded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  /* Load trending once */
  useEffect(() => {
    if (trendingLoaded) return;
    api
      .get("/api/hashtags/trending?limit=15")
      .then((r) => setTrending(r.data.hashtags || []))
      .catch(() => {})
      .finally(() => setTrendingLoaded(true));
  }, [trendingLoaded]);

  /* Search when query or tab changes */
  const doSearch = useCallback(
    async (q: string, tab: Tab) => {
      if (!q.trim()) {
        setPosts([]);
        setPeople([]);
        setHashtags([]);
        return;
      }
      setLoading(true);
      try {
        const typeMap: Record<Tab, string> = {
          posts: "posts",
          people: "people",
          hashtags: "hashtags",
        };
        const res = await api.get(
          `/api/search?q=${encodeURIComponent(q)}&type=${typeMap[tab]}`
        );
        setPosts(res.data.posts || []);
        setPeople(res.data.people || []);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputValue.trim();
    setQuery(q);
    router.replace(`/search?q=${encodeURIComponent(q)}&tab=${activeTab}`, {
      scroll: false,
    });
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
    { id: "posts", label: "Posts", icon: <FileText className="size-4" /> },
    { id: "people", label: "People", icon: <Users className="size-4" /> },
    { id: "hashtags", label: "Hashtags", icon: <Hash className="size-4" /> },
  ];

  const hasQuery = query.trim() !== "";

  return (
    <div className="min-h-screen">
      {/* ── Sticky search header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-3 sm:px-6">
        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search posts, people, hashtags…"
            autoFocus={!initialQ}
            className="w-full h-10 sm:h-11 rounded-full bg-muted/60 border border-border/50 pl-9 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
          />
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </form>

        {/* Tabs */}
        <div className="flex items-center gap-0 mt-3 -mb-3 border-b border-transparent">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : hasQuery ? (
        /* ── Search results ── */
        <div>
          {activeTab === "posts" &&
            (posts.length > 0 ? (
              posts.map((post) => <PostCard key={post.id} {...post} />)
            ) : (
              <EmptyState label={`No posts found for "${query}"`} />
            ))}

          {activeTab === "people" &&
            (people.length > 0 ? (
              <div>
                {people.map((p) => (
                  <PersonCard key={p.id} person={p} />
                ))}
              </div>
            ) : (
              <EmptyState label={`No people found for "${query}"`} />
            ))}

          {activeTab === "hashtags" &&
            (hashtags.length > 0 ? (
              <div>
                {hashtags.map((h) => (
                  <HashtagCard key={h.tag} {...h} />
                ))}
              </div>
            ) : (
              <EmptyState label={`No hashtags found for "${query}"`} />
            ))}
        </div>
      ) : (
        /* ── Trending hashtags (no query) ── */
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="size-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Trending Hashtags</h2>
          </div>

          {!trendingLoaded ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : trending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trending hashtags yet.</p>
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {trending.map((h) => (
                <HashtagCard key={h.tag} {...h} />
              ))}
            </div>
          )}
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
