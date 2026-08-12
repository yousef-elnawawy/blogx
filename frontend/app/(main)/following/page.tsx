"use client";

import { useEffect, useState } from "react";
import PostCard, { PostCardProps } from "@/components/PostCard";
import { Loader2, UserCheck, ArrowLeft, UserPlus, Check } from "lucide-react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { getAvatarUrl } from "@/lib/utils";

interface SuggestedUser {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  bio: string | null;
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
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

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
  }, []);

  const handleFollowToggle = async (targetId: number, currentStatus: boolean, name: string) => {
    try {
      const res = await api.post(`/api/users/${targetId}/follow`);
      const newStatus = res.data.is_following;

      setSuggestions((prev) =>
        prev.map((u) => (u.id === targetId ? { ...u, is_following: newStatus } : u))
      );

      toast.success(newStatus ? `Following ${name}` : `Unfollowed ${name}`);
      fetchFollowingPosts();
    } catch {
      toast.error("Failed to update follow status");
    }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Sticky Header */}
     <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/60 px-4 py-2.5 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-muted transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <div className="grid place-items-center size-7 rounded-lg bg-primary/10 text-primary">
                  <UserCheck className="size-4" strokeWidth={2.5} />
                </div>
                <h1 className="text-lg font-bold text-foreground leading-tight">
                  Following
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Posts from people you follow
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-3 text-xs text-muted-foreground">Loading feed...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="p-6 space-y-8 max-w-xl mx-auto">
          <div className="text-center pt-6">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserCheck className="size-7" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">No posts from people you follow</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Follow creators, thinkers, and friends to see their posts in this feed.
            </p>
          </div>

          {/* Suggestions Box */}
          {suggestions.length > 0 && (
            <div className="border border-border/60 rounded-2xl p-4 bg-card/40 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                <UserPlus className="size-4 text-primary" />
                <span>Suggested People to Follow</span>
              </h3>

              <div className="divide-y divide-border/40">
                {suggestions.map((sugUser) => {
                  const avatarSrc = getAvatarUrl(sugUser.avatar);
                  return (
                    <div key={sugUser.id} className="py-3 flex items-center justify-between gap-3">
                      <Link href={`/@${sugUser.username}`} className="flex items-center gap-3 min-w-0">
                        <Avatar className="size-10 shrink-0">
                          <AvatarImage src={avatarSrc} alt={sugUser.name} />
                          <AvatarFallback className="text-xs bg-muted font-bold">
                            {getInitials(sugUser.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate hover:underline">
                            {sugUser.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            @{sugUser.username}
                          </p>
                        </div>
                      </Link>

                      <Button
                        size="sm"
                        onClick={() => handleFollowToggle(sugUser.id, sugUser.is_following, sugUser.name)}
                        className={`rounded-full h-8 text-xs font-bold px-4 transition-all ${
                          sugUser.is_following
                            ? "bg-muted text-foreground hover:bg-destructive/10 hover:text-destructive border border-border"
                            : "bg-amber-500 text-white hover:bg-amber-600"
                        }`}
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
        <div>
          {posts.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}
        </div>
      )}
    </div>
  );
}
