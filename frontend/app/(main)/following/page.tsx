"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import PostCard, { PostCardProps } from "@/components/PostCard";
import { Loader2, UserCheck, ArrowLeft, UserPlus, Check, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import Link from "next/link";
import { toast } from "sonner";
import { getAvatarUrl, cn } from "@/lib/utils";

interface FollowedUser {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  bio?: string | null;
  verified?: boolean;
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

function getInitials(name: string) {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function FollowingPage() {
  const [posts, setPosts] = useState<PostCardProps[]>([]);
  const [followingUsers, setFollowingUsers] = useState<FollowedUser[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  const fetchFollowingUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get("/api/user/following");
      setFollowingUsers(res.data.users ?? []);
    } catch {
      // Fallback to profile following
      if (user?.username) {
        try {
          const res = await api.get(`/api/profile/${user.username}/following`);
          setFollowingUsers(res.data.users ?? []);
        } catch {
          setFollowingUsers([]);
        }
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchFollowingPosts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/following/posts");
      setPosts(res.data.data ?? []);
    } catch (err) {
      console.error(err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await api.get("/api/users/suggestions");
      setSuggestions(res.data.users ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFollowingUsers();
    fetchFollowingPosts();
    fetchSuggestions();

    const handlePostDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string | number }>;
      if (customEvent.detail && customEvent.detail.id) {
        setPosts((prev) => prev.filter((p) => String(p.id) !== String(customEvent.detail.id)));
      }
    };

    window.addEventListener("post-deleted", handlePostDeleted);
    return () => window.removeEventListener("post-deleted", handlePostDeleted);
  }, [user]);

  const handleFollowToggle = async (targetId: number, currentStatus: boolean, name: string) => {
    try {
      const res = await api.post(`/api/users/${targetId}/follow`);
      const newStatus = res.data.is_following;

      setSuggestions((prev) =>
        prev.map((u) => (u.id === targetId ? { ...u, is_following: newStatus } : u))
      );

      toast.success(newStatus ? `Following ${name}` : `Unfollowed ${name}`);
      fetchFollowingUsers();
      fetchFollowingPosts();
    } catch {
      toast.error("Failed to update follow status");
    }
  };

  return (
    <div className="min-h-screen pb-16">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 -ml-1 rounded-full hover:bg-muted transition-colors text-foreground cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight flex items-center gap-2">
                <UserCheck className="size-4 text-primary" strokeWidth={2.5} />
                <span>Following</span>
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Stories and posts from creators you follow
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOP CIRCLES: FOLLOWED ACCOUNTS ROW ── */}
      <div className="border-b border-border/60 bg-card/30">
        <div className="px-4 py-3.5 sm:px-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Followed Creators
            </span>
            {followingUsers.length > 0 && (
              <span className="text-xs text-muted-foreground font-medium">
                {followingUsers.length} following
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto no-scrollbar py-1">
            {loadingUsers ? (
              // Loading Circles Skeleton
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 animate-pulse">
                  <div className="size-15 sm:size-16 rounded-full bg-muted/80" />
                  <div className="h-2.5 w-12 rounded-full bg-muted/60" />
                </div>
              ))
            ) : followingUsers.length === 0 ? (
              // Empty Followed Users Prompt
              <div className="flex items-center gap-3 py-2 text-xs text-muted-foreground">
                <div className="size-12 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground shrink-0">
                  <UserPlus className="size-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">You are not following anyone yet</p>
                  <p className="text-[11px] text-muted-foreground">Follow creators below to see their circular avatars here!</p>
                </div>
              </div>
            ) : (
              // Followed Users Circles
              followingUsers.map((fUser) => {
                const avatarSrc = getAvatarUrl(fUser.avatar);

                return (
                  <Link
                    key={fUser.id}
                    href={`/@${fUser.username}`}
                    className="group flex flex-col items-center gap-1.5 shrink-0 transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    {/* Glowing Circular Avatar */}
                    <div className="relative">
                      <div className="size-15 sm:size-16 rounded-full p-0.5 ring-2 ring-primary/40 group-hover:ring-primary shadow-sm transition-all duration-200">
                        <Avatar className="size-full">
                          <AvatarImage src={avatarSrc} alt={fUser.name} className="object-cover" />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                            {getInitials(fUser.name)}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Verified Mini Badge on Circle */}
                      {Boolean(fUser.verified) && (
                        <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5 shadow-xs">
                          <VerifiedBadge size="sm" />
                        </div>
                      )}
                    </div>

                    {/* Small Name Underneath */}
                    <span className="text-[11px] sm:text-xs font-semibold text-foreground text-center truncate w-16 sm:w-18 group-hover:text-primary transition-colors">
                      {fUser.name}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── POSTS FEED FROM FOLLOWED CREATORS ── */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="size-8 animate-spin mx-auto text-primary" />
          <p className="mt-3 text-xs text-muted-foreground">Loading posts from people you follow...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="p-6 space-y-6 max-w-xl mx-auto">
          <div className="text-center pt-8 space-y-2">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserCheck className="size-7" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              No recent posts from people you follow
            </h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Follow more writers and creators to keep your timeline fresh and active.
            </p>
          </div>

          {/* Suggested Creators Section */}
          {suggestions.length > 0 && (
            <div className="border border-border/70 rounded-2xl p-4 sm:p-5 bg-card/50 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-3">
                <UserPlus className="size-4 text-primary" />
                <span>Suggested Creators to Follow</span>
              </h3>

              <div className="divide-y divide-border/40">
                {suggestions.map((sugUser) => {
                  const avatarSrc = getAvatarUrl(sugUser.avatar);

                  return (
                    <div key={sugUser.id} className="py-3 flex items-center justify-between gap-3">
                      <Link href={`/@${sugUser.username}`} className="flex items-center gap-3 min-w-0 group">
                        <Avatar className="size-11 shrink-0 ring-1 ring-border">
                          <AvatarImage src={avatarSrc} alt={sugUser.name} />
                          <AvatarFallback className="text-xs bg-muted font-bold">
                            {getInitials(sugUser.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:underline">
                              {sugUser.name}
                            </p>
                            {Boolean(sugUser.verified) && <VerifiedBadge size="sm" />}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            @{sugUser.username}
                          </p>
                        </div>
                      </Link>

                      <Button
                        size="sm"
                        onClick={() => handleFollowToggle(sugUser.id, sugUser.is_following, sugUser.name)}
                        className={cn(
                          "rounded-full h-8 text-xs font-bold px-4 transition-all cursor-pointer shadow-xs",
                          sugUser.is_following
                            ? "bg-muted text-foreground hover:bg-destructive/10 hover:text-destructive border border-border"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                      >
                        {sugUser.is_following ? (
                          <span className="flex items-center gap-1">
                            <Check className="size-3" />
                            Following
                          </span>
                        ) : (
                          "Follow"
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {posts.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}
        </div>
      )}
    </div>
  );
}
