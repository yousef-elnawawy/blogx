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
  const [communities, setCommunities] = useState<any[]>([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(true);
  const [joiningCommId, setJoiningCommId] = useState<number | null>(null);

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

    api
      .get("/api/communities?limit=5")
      .then((r) => setCommunities(r.data.data || []))
      .catch(() => {})
      .finally(() => setCommunitiesLoading(false));
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

  const handleToggleJoinCommunity = async (comm: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setJoiningCommId(comm.id);
    try {
      if (comm.is_member || comm.member_status === "admin") {
        const res = await api.post(`/api/communities/${comm.id}/leave`);
        setCommunities((prev) =>
          prev.map((c) =>
            c.id === comm.id
              ? { ...c, is_member: false, member_status: "none", members_count: res.data.members_count }
              : c
          )
        );
        toast.success(`Left ${comm.name}`);
      } else {
        const res = await api.post(`/api/communities/${comm.id}/join`);
        setCommunities((prev) =>
          prev.map((c) =>
            c.id === comm.id
              ? {
                  ...c,
                  is_member: res.data.status === "approved",
                  member_status: res.data.status,
                  members_count: res.data.members_count,
                }
              : c
          )
        );
        toast.success(res.data.message || `Joined ${comm.name}!`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update membership");
    } finally {
      setJoiningCommId(null);
    }
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
              <h2 className="text-lg font-bold text-foreground font-[family-name:var(--font-fraunces)]">Trending Hashtags</h2>
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
              <h2 className="text-lg font-bold text-foreground font-[family-name:var(--font-fraunces)]">Who to follow</h2>
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
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
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
        {communities.length > 0 && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h2 className="text-sm font-bold text-foreground">Suggested communities</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                Popular
              </span>
            </div>

            <div className="divide-y divide-border/50">
              {communities.map((comm) => {
                const isJoined = comm.is_member || comm.member_status === "admin";
                const isPending = comm.member_status === "pending";
                const isProcessing = joiningCommId === comm.id;
                const avatarSrc = getAvatarUrl(comm.avatar);

                return (
                  <div
                    key={comm.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <Link href={`/c/${comm.slug}`} className="shrink-0">
                      <Avatar className="size-9 rounded-xl border border-border/50 bg-primary/10">
                        <AvatarImage src={avatarSrc} alt={comm.name} />
                        <AvatarFallback className="text-xs font-bold text-primary">
                          {getInitials(comm.name)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link href={`/c/${comm.slug}`} className="block">
                        <p className="text-xs font-bold text-foreground truncate hover:underline hover:text-primary transition-colors">
                          {comm.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {comm.members_count || 1} {comm.members_count === 1 ? "member" : "members"}
                        </p>
                      </Link>
                    </div>

                    <Button
                      size="sm"
                      variant={isJoined ? "outline" : isPending ? "secondary" : "default"}
                      disabled={isProcessing}
                      onClick={(e) => handleToggleJoinCommunity(comm, e)}
                      className={cn(
                        "rounded-full px-3 h-7 text-[11px] font-bold shrink-0 transition-colors cursor-pointer",
                        isJoined
                          ? "border-border text-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                          : isPending
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
                      )}
                    >
                      {isProcessing ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : isJoined ? (
                        "Joined"
                      ) : isPending ? (
                        "Pending"
                      ) : (
                        "Join"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>

            <Link
              href="/communities"
              className="block px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <span className="text-xs font-semibold text-primary">Explore all communities →</span>
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="px-1 pb-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} BlogX</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
