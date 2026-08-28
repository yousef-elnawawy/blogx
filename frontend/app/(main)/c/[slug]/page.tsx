"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Users,
  Globe,
  Lock,
  Settings,
  Plus,
  ArrowLeft,
  Loader2,
  Clock,
  ShieldCheck,
  FileText,
  Share2,
  Calendar,
  UserPlus,
  Check,
  Trash2,
  MoreHorizontal,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import PostCard from "@/components/PostCard";
import CreatePost from "@/components/create-post/CreatePost";
import CommunitySettingsDialog from "@/components/communities/CommunitySettingsDialog";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import AvatarGroup from "@/components/ui/AvatarGroup";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAvatarUrl, getInitials } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";

export default function SingleCommunityPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { user } = useAuth();

  const [community, setCommunity] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [tab, setTab] = useState<"posts" | "about" | "members">("posts");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [isPrivateRestricted, setIsPrivateRestricted] = useState(false);

  const fetchCommunity = async () => {
    try {
      const res = await api.get(`/api/communities/${slug}`);
      setCommunity(res.data);
      if (res.data?.name) {
        document.title = `${res.data.name} (c/${res.data.slug}) — BlogX Communities`;
      }
      if (res.data?.id) {
        fetchMembers(res.data.id);
      }
    } catch {
      toast.error("Community not found");
      router.push("/communities");
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    if (!slug) return;
    setLoadingPosts(true);
    try {
      const res = await api.get(`/api/communities/${slug}/posts`);
      if (res.data?.is_private) {
        setIsPrivateRestricted(true);
        setPosts([]);
      } else {
        setIsPrivateRestricted(false);
        setPosts(res.data.data || []);
      }
    } catch {
      toast.error("Failed to load community posts");
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchMembers = async (commId?: number) => {
    const id = commId || community?.id;
    if (!id) return;
    try {
      const res = await api.get(`/api/communities/${id}/members`);
      setMembers(res.data.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (slug) {
      fetchCommunity();
      fetchPosts();
    }
  }, [slug]);

  const isCreator = Boolean(
    user && community?.creator && (user.id === community.creator.id || user.username === community.creator.username)
  );
  const isJoined = Boolean(community?.is_member || community?.member_status === "admin" || community?.member_status === "approved");
  const isPending = Boolean(community?.member_status === "pending");
  const isAdmin = Boolean(community?.is_admin || community?.member_status === "admin" || isCreator);

  const handleToggleJoin = async () => {
    if (!user) {
      toast.error("Please sign in to join");
      return;
    }

    if (isCreator) {
      toast.info("You are the creator of this community. You can manage or delete it from settings.");
      setSettingsOpen(true);
      return;
    }

    setJoining(true);
    try {
      if (isJoined) {
        const res = await api.post(`/api/communities/${community.id}/leave`);
        toast.success("Left community");
        setCommunity((prev: any) => ({
          ...prev,
          is_member: false,
          member_status: "none",
          members_count: res.data.members_count,
        }));
        setMembers((prev) => prev.filter((m) => m.user_id !== user.id && m.id !== user.id));
        fetchPosts();
      } else {
        const res = await api.post(`/api/communities/${community.id}/join`);
        toast.success(res.data.message);
        setCommunity((prev: any) => ({
          ...prev,
          is_member: res.data.status === "approved",
          member_status: res.data.status,
          members_count: res.data.members_count,
        }));
        if (res.data.status === "approved") {
          fetchMembers(community.id);
          fetchPosts();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update membership");
    } finally {
      setJoining(false);
    }
  };

  const handleDeleteCommunity = async () => {
    if (!community?.id) return;
    setDeleting(true);
    try {
      await api.delete(`/api/communities/${community.id}`);
      toast.success("Community deleted successfully");
      router.push("/communities");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete community");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Community link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!community) return null;

  const avatarSrc = getAvatarUrl(community.avatar);
  const coverSrc = getAvatarUrl(community.cover);

  const createdDateFormatted = community.created_at
    ? (() => {
        try {
          return format(new Date(community.created_at), "MMMM yyyy");
        } catch {
          return "Recently";
        }
      })()
    : "Recently";

  const isRestrictedLocked = community.type === "restricted" && !isJoined && !isAdmin;

  return (
    <div className="min-h-screen pb-20">
      {/* Sticky top back header */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-xl px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/communities")}
            className="size-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-foreground truncate max-w-xs sm:max-w-md">
              {community.name}
            </h1>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              {community.type === "restricted" && (
                <>
                  <span className="font-semibold text-amber-500">Private</span>
                  <span>•</span>
                </>
              )}
              <span>{community.members_count} members</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={handleShare}
            className="rounded-full px-3 h-8 text-xs font-semibold gap-1.5 border-border hover:bg-muted cursor-pointer shadow-2xs"
          >
            <Share2 className="size-3.5" />
            <span className="hidden sm:inline">Share</span>
          </Button>

          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSettingsOpen(true)}
              className="rounded-full px-3 h-8 text-xs font-semibold gap-1.5 border-border hover:bg-muted cursor-pointer shadow-2xs"
            >
              <Settings className="size-3.5 text-amber-500" />
              <span>Manage</span>
            </Button>
          )}

          {isCreator && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-2xl bg-card border-border shadow-xl">
                <DropdownMenuItem
                  onClick={() => setSettingsOpen(true)}
                  className="gap-2 px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  <Settings className="size-3.5" />
                  <span>Group Settings</span>
                </DropdownMenuItem>
                <div className="my-1 border-t border-border/50" />
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  <span>Delete Community</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* ── Community Profile Header ── */}
      <div className="border-b border-border">
        {/* Cover Photo Banner */}
        <div className="h-36 sm:h-52 w-full bg-muted/60 relative overflow-hidden">
          {coverSrc ? (
            <img
              src={coverSrc}
              alt={community.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-linear-to-r from-primary/15 via-amber-500/10 to-orange-500/15 flex items-center justify-center">
              <Users className="size-12 text-primary/30" />
            </div>
          )}
        </div>

        {/* Details & Actions Row */}
        <div className="px-4 sm:px-5 pb-4">
          <div className="flex items-end justify-between gap-3 -mt-10 sm:-mt-12 mb-3">
            {/* Square/Squircle Avatar */}
            <div className="size-20 sm:size-24 rounded-2xl ring-4 ring-background shadow-md bg-card shrink-0 overflow-hidden relative z-10">
              {avatarSrc ? (
                <img src={avatarSrc} alt={community.name} className="size-full object-cover rounded-2xl" />
              ) : (
                <div className="size-full flex items-center justify-center text-xl font-bold bg-primary/10 text-primary rounded-2xl">
                  {getInitials(community.name)}
                </div>
              )}
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-2">
              {/* Invite button - ONLY for members/admins */}
              {(isJoined || isAdmin || isCreator) && user && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleShare}
                  className="rounded-full px-3.5 h-8 text-xs font-semibold gap-1.5 border-border hover:bg-muted cursor-pointer shadow-2xs"
                >
                  <UserPlus className="size-3.5 text-primary" />
                  <span>Invite</span>
                </Button>
              )}

              {/* Join / Leave / Pending Button */}
              <Button
                size="sm"
                variant={isJoined ? "outline" : isPending ? "secondary" : "default"}
                onClick={handleToggleJoin}
                disabled={joining}
                className={`rounded-full px-4.5 h-8 text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  isJoined
                    ? "border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                    : isPending
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {joining ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : isJoined ? (
                  <div className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-emerald-600" />
                    <span>{isCreator ? "Joined (Admin)" : "Joined"}</span>
                  </div>
                ) : isPending ? (
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5 text-amber-500" />
                    <span>Pending</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Plus className="size-3.5" />
                    <span>Join Group</span>
                  </div>
                )}
              </Button>

              {isCreator && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSettingsOpen(true)}
                  className="rounded-full px-3.5 h-8 text-xs font-semibold gap-1.5 border-border hover:bg-muted cursor-pointer shadow-2xs"
                >
                  <Settings className="size-3.5 text-amber-500" />
                  <span>Manage</span>
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                {community.name}
              </h2>
              {community.type === "restricted" && (
                <div className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Lock className="size-3 text-amber-500" />
                  <span>Private</span>
                </div>
              )}
            </div>

            <p className="text-xs font-semibold text-primary">
              c/{community.slug}
            </p>

            {community.description && (
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed pt-1 max-w-2xl">
                {community.description}
              </p>
            )}

            {/* Member Stats & AvatarGroup in single clean line */}
            <div className="flex items-center flex-wrap gap-2.5 text-xs text-muted-foreground pt-2">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-foreground"><strong>{community.members_count}</strong> {community.members_count === 1 ? "member" : "members"}</span>
                <span>•</span>
                <span className="text-foreground"><strong>{community.posts_count}</strong> posts</span>
              </div>

              {members.length > 0 && (
                <div className="inline-flex items-center">
                  <AvatarGroup
                    items={members}
                    total={community.members_count}
                    max={4}
                    size="xs"
                    onMoreClick={() => setTab("members")}
                  />
                </div>
              )}

              {community.creator && (
                <>
                  <span>•</span>
                  <span>Created by <Link href={`/@${community.creator.username}`} className="font-semibold text-foreground hover:underline">@{community.creator.username}</Link></span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-t border-border">
          <div className="flex overflow-x-auto no-scrollbar">
            <button
              onClick={() => setTab("posts")}
              className={`flex-1 py-3 text-sm font-semibold text-center transition-colors relative cursor-pointer ${
                tab === "posts" ? "text-foreground font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <span>Discussion ({posts.length})</span>
              {tab === "posts" && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-primary" />}
            </button>

            <button
              onClick={() => setTab("about")}
              className={`flex-1 py-3 text-sm font-semibold text-center transition-colors relative cursor-pointer ${
                tab === "about" ? "text-foreground font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <span>About</span>
              {tab === "about" && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-primary" />}
            </button>

            <button
              onClick={() => setTab("members")}
              className={`flex-1 py-3 text-sm font-semibold text-center transition-colors relative cursor-pointer ${
                tab === "members" ? "text-foreground font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <span>Members ({community.members_count})</span>
              {tab === "members" && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-primary" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div>
        {tab === "posts" && (
          <>
            {isRestrictedLocked ? (
              /* Private Group Lock Notice */
              <div className="p-12 text-center border-b border-border space-y-3">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                  <Lock className="size-7" />
                </div>
                <h3 className="text-base font-bold text-foreground">This group is private</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Only approved members can view posts and participate in discussions. Request to join this group to get access.
                </p>
                <Button
                  onClick={handleToggleJoin}
                  disabled={joining}
                  className="rounded-full px-6 h-8 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isPending ? "Pending Approval" : "Request to Join"}
                </Button>
              </div>
            ) : (
              <>
                {/* Create Post composer inside community (Joined members only) */}
                {user && isJoined ? (
                  <CreatePost
                    communityId={community.id}
                    placeholder={`Write something in ${community.name}...`}
                    onPostCreated={(newPost) => {
                      setPosts((prev) => [newPost, ...prev]);
                      setCommunity((prev: any) => ({
                        ...prev,
                        posts_count: (prev.posts_count || 0) + 1,
                      }));
                    }}
                  />
                ) : user && !isJoined ? (
                  <div className="p-4 sm:p-5 border-b border-border bg-muted/20 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <Lock className="size-4 text-primary shrink-0" />
                      <span>Join <strong>{community.name}</strong> to write posts and participate.</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleToggleJoin}
                      disabled={joining}
                      className="rounded-full px-4.5 h-8 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 cursor-pointer"
                    >
                      {isPending ? "Pending Approval" : "Join to Post"}
                    </Button>
                  </div>
                ) : null}

                {/* Posts Feed */}
                {loadingPosts ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="size-7 animate-spin text-primary" />
                  </div>
                ) : posts.length === 0 ? (
                  <div className="p-12 text-center border-b border-border">
                    <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-muted">
                      <FileText className="size-7 text-muted-foreground" />
                    </div>
                    <h3 className="mb-1 text-base font-bold text-foreground">No posts yet</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Be the first to share an article, idea, or image in this community!
                    </p>
                  </div>
                ) : (
                  <div>
                    {posts.map((post) => (
                      <PostCard key={post.id} {...post} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── TAB: ABOUT & RULES ── */}
        {tab === "about" && (
          <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
            {/* Description & Privacy */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground">About this group</h3>
              {community.description ? (
                <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed">
                  {community.description}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">No description provided for this group.</p>
              )}

              <div className="pt-3 space-y-3 border-t border-border text-xs">
                <div className="flex items-start gap-3">
                  {community.type === "restricted" ? (
                    <Lock className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <Globe className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-bold text-foreground">
                      {community.type === "restricted" ? "Private group" : "Public community"}
                    </h4>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      {community.type === "restricted"
                        ? "Only approved members can see who is in the group and what they post."
                        : "Anyone can see posts and participate in this group."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-foreground">History</h4>
                    <p className="text-muted-foreground text-[11px]">
                      Group created in {createdDateFormatted}
                      {community.creator && ` by @${community.creator.username}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Guidelines / Rules */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-primary" />
                <span>Group Guidelines & Rules</span>
              </h3>

              <div className="space-y-2">
                {(community.rules && community.rules.length > 0
                  ? community.rules
                  : [
                      "Be respectful and kind to other members.",
                      "No spam, repetitive links, or unsolicited promotions.",
                      "Keep all discussions relevant to this community's theme.",
                    ]
                ).map((rule: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 text-xs">
                    <span className="size-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[10px]">
                      {i + 1}
                    </span>
                    <span className="text-foreground/90 leading-relaxed font-medium">{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: MEMBERS ── */}
        {tab === "members" && (
          <div className="p-4 sm:p-5 max-w-2xl mx-auto space-y-3">
            <h3 className="text-sm font-bold text-foreground">Group Members ({community.members_count})</h3>
            {members.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">Loading members...</p>
            ) : (
              <div className="divide-y divide-border">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-3">
                    <Link href={`/@${m.username}`} className="flex items-center gap-2.5 group">
                      <Avatar className="size-9 ring-1 ring-border/40">
                        <AvatarImage src={getAvatarUrl(m.avatar)} alt={m.name} />
                        <AvatarFallback className="text-xs font-bold">
                          {getInitials(m.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-foreground group-hover:underline">{m.name}</span>
                          {Boolean(m.verified) && <VerifiedBadge size="xs" />}
                          {m.role === "admin" && (
                            <span className="px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">@{m.username}</p>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      <CommunitySettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        community={community}
        onCommunityUpdated={(updated) => setCommunity(updated)}
      />

      {/* Delete Community Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Delete &quot;{community.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this community? All posts in this group will be unlinked and members removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={deleting}
              className="rounded-full text-xs font-semibold"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCommunity}
              disabled={deleting}
              className="rounded-full text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Trash2 className="size-3.5 mr-1.5" />}
              <span>Delete Community</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
