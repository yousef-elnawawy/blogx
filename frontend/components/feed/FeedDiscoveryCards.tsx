"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Flame,
  UserPlus,
  Compass,
  ArrowRight,
  Clock,
  Check,
  Hash,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import api from "@/lib/api";
import { getAvatarUrl, cn } from "@/lib/utils";
import { toast } from "sonner";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
}

/* =========================================================================
   1. Horizontal Scrolling Suggested Accounts Carousel
   ========================================================================= */
export function SuggestedUsersFeedCard() {
  const [users, setUsers] = useState<any[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get("/api/users/suggestions")
      .then((res) => {
        setUsers(res.data.users || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleFollow = async (userId: number) => {
    const prev = followingMap[userId] ?? false;
    setFollowingMap((m) => ({ ...m, [userId]: !prev }));

    try {
      const res = await api.post(`/api/users/${userId}/follow`);
      setFollowingMap((m) => ({ ...m, [userId]: res.data.is_following }));
      toast.success(res.data.is_following ? "User followed" : "User unfollowed");
    } catch {
      setFollowingMap((m) => ({ ...m, [userId]: prev }));
      toast.error("Failed to update follow status");
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -280 : 280;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="py-4 border-b border-border bg-muted/10">
        <div className="flex items-center justify-between px-4 sm:px-5 mb-3">
          <div className="h-4 w-28 rounded-full bg-muted/80 animate-pulse" />
          <div className="h-4 w-12 rounded-full bg-muted/50 animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-hidden px-4 sm:px-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-44 sm:w-48 shrink-0 p-4 rounded-xl border border-border bg-background flex flex-col items-center space-y-2.5"
            >
              <div className="size-16 rounded-full bg-muted/80 animate-pulse" />
              <div className="h-3.5 w-24 rounded-full bg-muted/80 animate-pulse" />
              <div className="h-3 w-16 rounded-full bg-muted/60 animate-pulse" />
              <div className="h-7 w-full rounded-full bg-muted/70 animate-pulse mt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) return null;

  return (
    <div className="py-4 border-b border-border bg-muted/10 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 mb-3">
        <div className="flex items-center gap-2">
          <UserPlus className="size-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground font-[family-name:var(--font-fraunces)]">
            Who to follow
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-4 sm:px-5 no-scrollbar scroll-smooth py-1"
      >
        {users.map((person) => {
          const isFollowing = followingMap[person.id] ?? person.is_following;

          return (
            <div
              key={person.id}
              className="w-44 sm:w-48 shrink-0 p-4 rounded-xl border border-border/70 bg-background hover:border-primary/40 transition-all flex flex-col items-center text-center justify-between shadow-2xs"
            >
              <Link href={`/@${person.username}`} className="flex flex-col items-center w-full group">
                <Avatar className="size-16 ring-2 ring-border/50 mb-2.5">
                  <AvatarImage src={getAvatarUrl(person.avatar)} alt={person.name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                    {getInitials(person.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex items-center gap-1 max-w-full justify-center">
                  <span className="text-sm font-bold text-foreground group-hover:underline truncate">
                    {person.name}
                  </span>
                  {person.verified && <VerifiedBadge size="sm" />}
                </div>
                <p className="text-xs text-muted-foreground truncate w-full">
                  @{person.username}
                </p>

                <p className="text-[11px] text-foreground/75 mt-1.5 line-clamp-2 h-7 w-full leading-tight">
                  {person.bio || "BlogX creator & author"}
                </p>
              </Link>

              <Button
                size="sm"
                variant={isFollowing ? "outline" : "default"}
                onClick={() => handleFollow(person.id)}
                className={cn(
                  "w-full h-8 text-xs font-bold rounded-full mt-3 transition-all",
                  isFollowing
                    ? "border-border text-foreground hover:bg-destructive/10 hover:text-destructive"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {isFollowing ? (
                  <>
                    <Check className="size-3 mr-1 text-emerald-500" />
                    Following
                  </>
                ) : (
                  "Follow"
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   2. Seamless In-Feed Featured Article Card
   ========================================================================= */
export function FeaturedArticleFeedCard() {
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/blogs/featured")
      .then((res) => {
        const item = res.data.blog || res.data.article;
        if (item) {
          setArticle(item);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="border-b border-border p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 rounded-full bg-muted/80 animate-pulse" />
          <div className="h-3 w-16 rounded-full bg-muted/50 animate-pulse" />
        </div>
        <div className="h-48 sm:h-64 w-full rounded-xl bg-muted/70 animate-pulse" />
        <div className="h-5 w-3/4 rounded-full bg-muted/80 animate-pulse" />
        <div className="h-3.5 w-full rounded-full bg-muted/60 animate-pulse" />
      </div>
    );
  }

  if (!article) return null;

  return (
    <article className="border-b border-border p-4 sm:p-5 hover:bg-muted/15 transition-colors group animate-in fade-in-50 duration-300">
      {/* Top Badge */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-500">
          <Sparkles className="size-3.5" />
          <span>FEATURED STORY</span>
        </div>

        <Link
          href="/blogs"
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
        >
          <span>All posts</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Large Cover Image (if available) */}
      {article.cover_image && (
        <Link
          href={`/blog/${encodeURIComponent(article.slug)}`}
          className="block relative w-full h-48 sm:h-64 rounded-lg overflow-hidden bg-muted mb-3 border border-border/60"
        >
          <img
            src={getAvatarUrl(article.cover_image)}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
          />
        </Link>
      )}

      {/* Title */}
      <Link href={`/blog/${encodeURIComponent(article.slug)}`} className="block mb-1.5">
        <h2 className="text-lg sm:text-2xl font-bold text-foreground group-hover:text-primary transition-colors leading-snug font-[family-name:var(--font-fraunces)]">
          {article.title}
        </h2>
      </Link>

      {/* Excerpt */}
      {article.excerpt && (
        <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed line-clamp-2 mb-3">
          {article.excerpt}
        </p>
      )}

      {/* Author Bar */}
      <div className="flex items-center justify-between pt-2.5 border-t border-border/40 gap-3 flex-wrap text-xs">
        <Link
          href={`/@${article.author?.username}`}
          className="flex items-center gap-2.5 group/author"
        >
          <Avatar className="size-7 ring-1 ring-border/50">
            <AvatarImage src={getAvatarUrl(article.author?.avatar)} alt={article.author?.name} />
            <AvatarFallback className="text-[10px] font-bold">
              {getInitials(article.author?.name || "A")}
            </AvatarFallback>
          </Avatar>
          <span className="font-bold text-foreground group-hover/author:underline">
            {article.author?.name}
          </span>
          {article.author?.verified && <VerifiedBadge size="sm" />}
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground inline-flex items-center gap-1">
            <Clock className="size-3" />
            {article.read_time || 1} min read
          </span>
        </Link>

        <Link
          href={`/blog/${encodeURIComponent(article.slug)}`}
          className="font-bold text-primary hover:underline inline-flex items-center gap-1"
        >
          <span>Read story</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}

/* =========================================================================
   3. Horizontal Scrolling Communities Carousel (Real Communities from API)
   ========================================================================= */
export function SuggestedCommunitiesFeedCard() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get("/api/communities?tab=popular")
      .then((res) => {
        setCommunities(res.data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggleJoin = async (c: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setJoiningId(c.id);
    try {
      if (c.is_member || c.member_status === "admin") {
        await api.post(`/api/communities/${c.id}/leave`);
        setCommunities((prev) =>
          prev.map((item) =>
            item.id === c.id
              ? { ...item, is_member: false, member_status: "none", members_count: Math.max(0, item.members_count - 1) }
              : item
          )
        );
        toast.success(`Left ${c.name}`);
      } else {
        const res = await api.post(`/api/communities/${c.id}/join`);
        setCommunities((prev) =>
          prev.map((item) =>
            item.id === c.id
              ? {
                  ...item,
                  is_member: res.data.status === "approved",
                  member_status: res.data.status,
                  members_count: res.data.status === "approved" ? item.members_count + 1 : item.members_count,
                }
              : item
          )
        );
        toast.success(res.data.message || `Joined ${c.name}!`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update membership");
    } finally {
      setJoiningId(null);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  if (loading || communities.length === 0) {
    return null;
  }

  return (
    <div className="py-4 border-b border-border bg-muted/10 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 mb-3">
        <div className="flex items-center gap-2">
          <Compass className="size-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground font-[family-name:var(--font-fraunces)]">
            Communities to explore
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel with Real Communities */}
      <div
        ref={scrollRef}
        className="flex gap-3.5 overflow-x-auto px-4 sm:px-5 no-scrollbar scroll-smooth py-1"
      >
        {communities.map((c) => {
          const isJoined = c.is_member || c.member_status === "admin";
          const isPending = c.member_status === "pending";
          const coverSrc = getAvatarUrl(c.cover);
          const avatarSrc = getAvatarUrl(c.avatar);

          return (
            <Link
              key={c.id}
              href={`/c/${c.slug}`}
              className="w-56 sm:w-60 shrink-0 rounded-2xl border border-border/70 bg-card overflow-hidden hover:border-primary/50 transition-all flex flex-col justify-between shadow-2xs group"
            >
              {/* Cover Photo */}
              <div className="relative h-22 w-full overflow-hidden bg-muted">
                {coverSrc ? (
                  <img
                    src={coverSrc}
                    alt={c.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-linear-to-r from-primary/20 via-amber-500/10 to-orange-500/20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <span className="absolute bottom-2 left-2.5 text-[11px] font-bold text-white drop-shadow-sm flex items-center gap-1">
                  <Users className="size-3" />
                  {c.members_count} members
                </span>
              </div>

              {/* Card Body */}
              <div className="p-3.5 flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Avatar className="size-6 rounded-lg ring-1 ring-border/50">
                      <AvatarImage src={avatarSrc} alt={c.name} className="rounded-lg object-cover" />
                      <AvatarFallback className="text-[10px] font-bold rounded-lg bg-primary/10 text-primary">
                        {getInitials(c.name)}
                      </AvatarFallback>
                    </Avatar>
                    <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {c.name}
                    </h4>
                  </div>

                  {c.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                      {c.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-2 border-t border-border/50">
                  <Button
                    size="sm"
                    variant={isJoined ? "outline" : isPending ? "secondary" : "default"}
                    onClick={(e) => handleToggleJoin(c, e)}
                    disabled={joiningId === c.id}
                    className={`w-full rounded-full text-xs font-bold h-7.5 transition-all cursor-pointer ${
                      isJoined
                        ? "border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                        : isPending
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
                    }`}
                  >
                    {joiningId === c.id ? (
                      <Clock className="size-3.5 animate-spin" />
                    ) : isJoined ? (
                      <div className="flex items-center gap-1">
                        <Check className="size-3 text-emerald-600" />
                        <span>Joined</span>
                      </div>
                    ) : isPending ? (
                      <span>Pending</span>
                    ) : (
                      <span>Join</span>
                    )}
                  </Button>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   4. Horizontal Trending Topics Bar
   ========================================================================= */
export function TrendingTopicsFeedCard() {
  const [trending, setTrending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/hashtags/trending?limit=6")
      .then((res) => {
        setTrending(res.data.hashtags || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-3 px-4 sm:px-5 border-b border-border bg-muted/5 flex items-center gap-2 overflow-hidden">
        <div className="h-4 w-24 rounded-full bg-muted/80 animate-pulse shrink-0 mr-2" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-7 w-20 rounded-full bg-muted/60 animate-pulse shrink-0" />
        ))}
      </div>
    );
  }

  if (trending.length === 0) return null;

  return (
    <div className="py-3.5 px-4 sm:px-5 border-b border-border bg-muted/5 animate-in fade-in-50 duration-300">
      <div className="flex items-center gap-2 mb-2.5">
        <Flame className="size-4 text-brand-hashtag" />
        <h3 className="text-sm font-bold text-foreground font-[family-name:var(--font-fraunces)]">
          Trending Topics
        </h3>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {trending.map((item) => (
          <Link
            key={item.tag}
            href={`/hashtag/${encodeURIComponent(item.tag)}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/70 bg-background hover:border-brand-hashtag/40 hover:bg-brand-hashtag-subtle/50 transition-all text-xs font-semibold text-foreground shrink-0 shadow-2xs group"
          >
            <Hash className="size-3.5 text-brand-hashtag group-hover:scale-110 transition-transform" />
            <span className="truncate">#{item.tag}</span>
            {item.usage_count > 0 && (
              <span className="text-[10px] text-muted-foreground font-normal">
                ({formatCount(item.usage_count)})
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
