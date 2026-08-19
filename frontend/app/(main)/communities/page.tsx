"use client";

import { useEffect, useState } from "react";
import { Users, Search, Plus, Globe, Lock, Loader2, Sparkles, Check, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AvatarGroup from "@/components/ui/AvatarGroup";
import Link from "next/link";
import { getAvatarUrl, getInitials } from "@/lib/utils";
import CreateCommunityDialog from "@/components/communities/CreateCommunityDialog";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";

export default function CommunitiesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"popular" | "newest" | "joined">("popular");
  const [search, setSearch] = useState("");
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joiningId, setJoiningId] = useState<number | null>(null);

  const fetchCommunities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab === "joined") {
        params.append("joined", "true");
      } else {
        params.append("tab", tab);
      }
      if (search.trim()) {
        params.append("q", search.trim());
      }

      const res = await api.get(`/api/communities?${params.toString()}`);
      setCommunities(res.data.data || []);
    } catch {
      toast.error("Failed to load communities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCommunities();
    }, 200);
    return () => clearTimeout(timer);
  }, [tab, search]);

  const handleToggleJoin = async (community: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Please sign in to join communities");
      return;
    }

    setJoiningId(community.id);
    try {
      if (community.is_member || community.member_status === "admin") {
        const res = await api.post(`/api/communities/${community.id}/leave`);
        toast.success("Left community");
        setCommunities((prev) =>
          prev.map((c) =>
            c.id === community.id
              ? { ...c, is_member: false, member_status: "none", members_count: res.data.members_count }
              : c
          )
        );
      } else {
        const res = await api.post(`/api/communities/${community.id}/join`);
        toast.success(res.data.message);
        setCommunities((prev) =>
          prev.map((c) =>
            c.id === community.id
              ? {
                  ...c,
                  is_member: res.data.status === "approved",
                  member_status: res.data.status,
                  members_count: res.data.members_count,
                }
              : c
          )
        );
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update membership");
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border/80 bg-background/80 backdrop-blur-xl px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="size-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                Communities & Spaces
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Discover forums, discuss niche topics, and connect with people.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => {
              if (!user) {
                toast.error("Please sign in to create a community");
                return;
              }
              setCreateDialogOpen(true);
            }}
            className="rounded-full px-4 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">New Community</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>

        {/* Search & Tabs */}
        <div className="mt-3.5 space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search communities by name or topic..."
              className="pl-10 rounded-2xl border-border bg-card text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-1 border-b border-border/60">
            <button
              onClick={() => setTab("popular")}
              className={`px-4 py-2 text-xs font-bold transition-colors relative cursor-pointer ${
                tab === "popular" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Trending & Popular
              {tab === "popular" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>

            <button
              onClick={() => setTab("newest")}
              className={`px-4 py-2 text-xs font-bold transition-colors relative cursor-pointer ${
                tab === "newest" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Newest
              {tab === "newest" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>

            {user && (
              <button
                onClick={() => setTab("joined")}
                className={`px-4 py-2 text-xs font-bold transition-colors relative cursor-pointer ${
                  tab === "joined" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Joined by Me
                {tab === "joined" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Community Grid / List */}
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : communities.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="size-16 rounded-3xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
              <Users className="size-8" />
            </div>
            <h3 className="text-base font-bold text-foreground">No communities found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {search
                ? `No results matched "${search}". Try another keyword or create this community!`
                : "Be the first to start a discussion space for your favorite topic!"}
            </p>
            <Button
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
              className="rounded-full px-5 text-xs font-bold bg-primary text-primary-foreground"
            >
              Create Community
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {communities.map((community) => {
              const avatarSrc = getAvatarUrl(community.avatar);
              const coverSrc = getAvatarUrl(community.cover);
              const isJoined = community.is_member || community.member_status === "admin";
              const isPending = community.member_status === "pending";

              return (
                <Link
                  key={community.id}
                  href={`/c/${community.slug}`}
                  className="group relative rounded-3xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                >
                  {/* Cover Photo */}
                  <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-muted">
                    {coverSrc ? (
                      <img src={coverSrc} alt={community.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-linear-to-r from-primary/15 via-amber-500/10 to-orange-500/15" />
                    )}

                    {/* Privacy Pill */}
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1">
                      {community.type === "restricted" ? (
                        <>
                          <Lock className="size-3" />
                          <span>Private</span>
                        </>
                      ) : (
                        <>
                          <Globe className="size-3" />
                          <span>Public</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="px-4 pb-4 pt-0 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Avatar & Join Button Row (overlapping cover cleanly) */}
                      <div className="flex items-end justify-between -mt-7 mb-3">
                        <div className="size-14 rounded-2xl ring-4 ring-card shadow-md bg-card shrink-0 overflow-hidden relative z-10">
                          {avatarSrc ? (
                            <img src={avatarSrc} alt={community.name} className="size-full object-cover rounded-2xl" />
                          ) : (
                            <div className="size-full flex items-center justify-center text-sm font-bold bg-primary/10 text-primary rounded-2xl">
                              {getInitials(community.name)}
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant={isJoined ? "outline" : isPending ? "secondary" : "default"}
                          onClick={(e) => handleToggleJoin(community, e)}
                          disabled={joiningId === community.id}
                          className={`rounded-full px-4 text-xs font-semibold h-7.5 transition-all cursor-pointer ${
                            isJoined
                              ? "border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                              : isPending
                              ? "bg-muted text-muted-foreground"
                              : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
                          }`}
                        >
                          {joiningId === community.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : isJoined ? (
                            <span>Joined</span>
                          ) : isPending ? (
                            <div className="flex items-center gap-1">
                              <Clock className="size-3" />
                              <span>Pending</span>
                            </div>
                          ) : (
                            <span>Join</span>
                          )}
                        </Button>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                          <span>{community.name}</span>
                        </h3>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          c/{community.slug}
                        </p>
                      </div>

                      {community.description && (
                        <p className="text-xs text-foreground/80 mt-2 line-clamp-2 leading-relaxed">
                          {community.description}
                        </p>
                      )}
                    </div>

                    {/* Stats Footer with AvatarGroup */}
                    <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {community.top_members && community.top_members.length > 0 ? (
                          <AvatarGroup
                            items={community.top_members}
                            total={community.members_count}
                            max={3}
                            size="xs"
                          />
                        ) : null}
                        <span><strong>{community.members_count}</strong> {community.members_count === 1 ? "member" : "members"}</span>
                      </div>
                      <span className="text-[10px]"><strong>{community.posts_count}</strong> posts</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <CreateCommunityDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCommunityCreated={(newComm) => {
          setCommunities((prev) => [newComm, ...prev]);
        }}
      />
    </div>
  );
}
