"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Search, Hash, Loader2, Code2, Bot, Gamepad2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import VerifiedBadge from "./ui/VerifiedBadge";
import Link from "next/link";
import api from "@/lib/api";
import { getAvatarUrl, cn } from "@/lib/utils";
import { toast } from "sonner";

interface TrendingHashtag {
  tag: string;
  usage_count: number;
}

interface SuggestedUser {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  verified?: boolean;
  is_following: boolean;
}

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

export default function RightSidebar() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [trending, setTrending] = useState<TrendingHashtag[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<number, boolean>>({});
  const [joinedCommMap, setJoinedCommMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api
      .get("/api/hashtags/trending?limit=5")
      .then((r) => setTrending(r.data.hashtags || []))
      .catch(() => {})
      .finally(() => setTrendingLoading(false));

    api
      .get("/api/users/suggestions")
      .then((r) => setSuggestions(r.data.users || []))
      .catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
    else router.push("/search");
  };

  const handleFollow = async (userId: number) => {
    try {
      const res = await api.post(`/api/users/${userId}/follow`);
      setFollowingMap((prev) => ({
        ...prev,
        [userId]: res.data.is_following,
      }));
    } catch {
      /* silent */
    }
  };

  const handleJoinCommunity = (id: string, name: string) => {
    const isJoined = !joinedCommMap[id];
    setJoinedCommMap((prev) => ({ ...prev, [id]: isJoined }));
    toast.success(isJoined ? `Joined ${name}!` : `Left ${name}`);
  };

  return (
    <aside
      className="fixed right-0 top-0 z-40 hidden lg:flex flex-col h-screen border-l border-border bg-background/95 backdrop-blur-sm overflow-y-auto"
      style={{ width: "var(--right-sidebar-width, 280px)" }}
    >
      <div className="flex flex-col gap-5 p-5 pt-6">
        {/* Search box → /search */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-[18px] text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search…"
            className="w-full h-11 rounded-full bg-muted/60 border border-border/50 pl-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
          />
        </form>

        {/* Trending Hashtags */}
        <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="flex items-start gap-3 px-4 pt-4">
            <div className="grid place-items-center size-11 rounded-2xl bg-brand-hashtag-subtle text-brand-hashtag">
              <TrendingUp className="size-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">Trending Hashtags</h2>
              <p className="text-sm text-muted-foreground">
                Discover what people are posting about right now.
              </p>
            </div>
          </div>

          {trendingLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : trending.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-4">
              No trending hashtags yet.
            </p>
          ) : (
            <div className="divide-y divide-border/50 mt-3">
              {trending.map((item, index) => (
                <Link
                  key={item.tag}
                  href={`/hashtag/${encodeURIComponent(item.tag)}`}
                  className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
                    index === 0 ? "bg-brand-hashtag-subtle/30 hover:bg-brand-hashtag-subtle/50" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="grid place-items-center size-9 rounded-xl bg-muted/70 shrink-0">
                    <Hash className="size-4 text-brand-hashtag" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      #{item.tag}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.usage_count > 0
                        ? `${formatCount(item.usage_count)} posts`
                        : "New"}
                    </p>
                  </div>
                  {index === 0 && (
                    <span className="rounded-full bg-brand-hashtag-subtle px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-hashtag">
                      Top
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}

          <Link
            href="/search"
            className="block px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <span className="text-sm font-medium text-primary">
              Show more hashtags →
            </span>
          </Link>
        </div>

        {/* Who to follow */}
        {suggestions.length > 0 && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <h2 className="text-lg font-bold text-foreground">Who to follow</h2>
            </div>
            <div className="divide-y divide-border/50">
              {suggestions.map((person) => {
                const isFollowing =
                  followingMap[person.id] ?? person.is_following;
                return (
                  <div
                    key={person.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <Link href={`/@${person.username}`} className="shrink-0">
                      <Avatar className="size-10">
                        <AvatarImage
                          src={getAvatarUrl(person.avatar)}
                          alt={person.name}
                        />
                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                          {getInitials(person.name)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/@${person.username}`} className="flex items-center gap-1">
                        <p className="text-sm font-semibold text-foreground truncate hover:underline">
                          {person.name}
                        </p>
                        {Boolean(person.verified) && <VerifiedBadge size="sm" />}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">
                        @{person.username}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleFollow(person.id)}
                      className={`rounded-full px-4 h-8 text-xs font-bold shrink-0 transition-colors ${
                        isFollowing
                          ? "bg-muted text-foreground hover:bg-destructive/10 hover:text-destructive border border-border"
                          : "bg-amber-500 text-white hover:bg-amber-600"
                      }`}
                    >
                      {isFollowing ? "Unfollow" : "Follow"}
                    </Button>
                  </div>
                );
              })}
            </div>
            <Link
              href="/search?tab=people"
              className="block px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-medium text-primary">Show more →</span>
            </Link>
          </div>
        )}

        {/* Suggested Communities */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-sm font-bold text-foreground">Suggested communities</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600">
              New
            </span>
          </div>

          <div className="divide-y divide-border/50">
            {[
              {
                id: "web",
                name: "Web Development",
                members: "14.2k",
                image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=200&auto=format&fit=crop&q=80",
              },
              {
                id: "ai",
                name: "Artificial Intelligence",
                members: "18.5k",
                image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
              },
              {
                id: "gaming",
                name: "Game Development",
                members: "9.1k",
                image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=80",
              },
            ].map((comm) => {
              const isJoined = joinedCommMap[comm.id];

              return (
                <div
                  key={comm.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <img
                    src={comm.image}
                    alt={comm.name}
                    className="size-9 rounded-xl object-cover shrink-0 border border-border/50"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{comm.name}</p>
                    <p className="text-[11px] text-muted-foreground">{comm.members} members</p>
                  </div>
                  <Button
                    size="sm"
                    variant={isJoined ? "outline" : "secondary"}
                    onClick={() => handleJoinCommunity(comm.id, comm.name)}
                    className={cn(
                      "rounded-full px-3 h-7 text-[11px] font-bold shrink-0 transition-colors",
                      isJoined ? "border-border text-foreground hover:text-destructive" : "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                  >
                    {isJoined ? "Joined" : "Join"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-1 pb-4">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="hover:underline cursor-pointer">Privacy Policy</span>
            <span className="hover:underline cursor-pointer">Terms of Service</span>
            <span className="hover:underline cursor-pointer">Accessibility</span>
            <span className="hover:underline cursor-pointer">Cookie Policy</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
            <span>© 2025 BlogX Corp.</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
