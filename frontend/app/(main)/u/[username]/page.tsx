"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MapPin,
  Link as LinkIcon,
  Calendar,
  BadgeCheck,
  FileText,
  UserX,
  ArrowLeft,
  UserPlus,
  Check,
  Loader2,
  Users,
  Share2,
  QrCode,
} from "lucide-react";
import PostCard, { PostCardProps } from "@/components/PostCard";
import api from "@/lib/api";
import { getAvatarUrl } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import ProfileShareDialog from "@/components/profile/ProfileShareDialog";

interface ProfileUser {
  id: number;
  name: string;
  username: string;
  bio: string | null;
  avatar: string | null;
  cover: string | null;
  website: string | null;
  location: string | null;
  verified: boolean;
  created_at: string | null;
  posts_count?: number;
  followers_count?: number;
  following_count?: number;
  is_following?: boolean;
}

interface UserListItem {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  verified?: boolean;
  is_following: boolean;
}

const profileTabs = ["Posts", "Replies", "Highlights", "Media", "Likes"];

function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-32 bg-muted sm:h-48" />
      <div className="px-4 sm:px-5 pb-4">
        <div className="-mt-12 mb-4 flex items-end justify-between sm:-mt-16">
          <div className="size-24 sm:size-32 rounded-full bg-muted border-4 border-background" />
          <div className="h-9 w-28 rounded-full bg-muted" />
        </div>
        <div className="mb-4 space-y-2">
          <div className="h-6 w-40 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
        <div className="h-4 w-full rounded bg-muted mb-2" />
        <div className="h-4 w-2/3 rounded bg-muted" />
      </div>
    </div>
  );
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();

  const rawUsername = params.username as string;
  const username = rawUsername ? decodeURIComponent(rawUsername).replace(/^@/, "") : "";

  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [userPosts, setUserPosts] = useState<PostCardProps[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Posts");

  // User list modal state (Followers / Following)
  const [userListModalOpen, setUserListModalOpen] = useState(false);
  const [userListModalTitle, setUserListModalTitle] = useState<"Followers" | "Following">("Followers");
  const [userListUsers, setUserListUsers] = useState<UserListItem[]>([]);
  const [userListLoading, setUserListLoading] = useState(false);
  const [shareProfileOpen, setShareProfileOpen] = useState(false);

  const isOwnProfile =
    !authLoading && currentUser?.username === username;

  useEffect(() => {
    if (!username) return;

    setProfileLoading(true);
    setNotFound(false);

    api
      .get(`/api/profile/${username}`)
      .then((res) => {
        setProfileUser(res.data.user);
        setUserPosts(res.data.posts?.data ?? []);
      })
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
      })
      .finally(() => setProfileLoading(false));

    const handlePostCreated = (e: Event) => {
      const customEvent = e as CustomEvent<PostCardProps>;
      if (customEvent.detail && currentUser?.username === username) {
        setUserPosts((prev) => {
          if (prev.some((p) => String(p.id) === String(customEvent.detail.id))) {
            return prev;
          }
          return [customEvent.detail, ...prev];
        });
      }
    };

    const handlePostDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string | number }>;
      if (customEvent.detail && customEvent.detail.id) {
        setUserPosts((prev) => prev.filter((p) => String(p.id) !== String(customEvent.detail.id)));
      }
    };

    window.addEventListener("post-created", handlePostCreated);
    window.addEventListener("post-deleted", handlePostDeleted);
    return () => {
      window.removeEventListener("post-created", handlePostCreated);
      window.removeEventListener("post-deleted", handlePostDeleted);
    };
  }, [username, currentUser?.username]);

  const handleFollowToggle = async () => {
    if (!profileUser) return;
    try {
      const res = await api.post(`/api/users/${profileUser.id}/follow`);
      setProfileUser((prev) =>
        prev
          ? {
              ...prev,
              is_following: res.data.is_following,
              followers_count: res.data.followers_count,
            }
          : null
      );
      toast.success(res.data.is_following ? `Following @${profileUser.username}` : `Unfollowed @${profileUser.username}`);
    } catch {
      toast.error("Failed to update follow status");
    }
  };

  const handleModalUserFollowToggle = async (targetId: number, name: string) => {
    try {
      const res = await api.post(`/api/users/${targetId}/follow`);
      const newStatus = res.data.is_following;

      setUserListUsers((prev) =>
        prev.map((u) => (u.id === targetId ? { ...u, is_following: newStatus } : u))
      );

      toast.success(newStatus ? `Following ${name}` : `Unfollowed ${name}`);
    } catch {
      toast.error("Failed to update follow status");
    }
  };

  const openUserListModal = async (type: "Followers" | "Following") => {
    setUserListModalTitle(type);
    setUserListModalOpen(true);
    setUserListLoading(true);
    try {
      const endpoint = type === "Followers" ? `/api/profile/${username}/followers` : `/api/profile/${username}/following`;
      const res = await api.get(endpoint);
      setUserListUsers(res.data.users ?? []);
    } catch (err) {
      console.error(err);
      setUserListUsers([]);
    } finally {
      setUserListLoading(false);
    }
  };

  const getInitials = (name: string) =>
    name
      ? name
          .split(" ")
          .filter(Boolean)
          .map((p) => p[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "U";

  if (profileLoading) {
    return (
      <div>
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/60 px-4 py-2.5">
          <div className="h-5 w-32 rounded bg-muted animate-pulse" />
        </div>
        <ProfileSkeleton />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="py-20 text-center px-4">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
          <UserX className="size-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Profile not found
        </h1>
        <p className="text-muted-foreground mb-6">
          @{username} doesn&apos;t exist on BlogX.
        </p>
        <Button onClick={() => router.push("/")} className="rounded-full px-6">Go Home</Button>
      </div>
    );
  }

  if (!profileUser) return null;

  const joinDate = (() => {
    if (!profileUser.created_at) return null;
    try {
      const d = new Date(profileUser.created_at);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } catch {
      return null;
    }
  })();

  const postsCount = profileUser.posts_count ?? 0;

  return (
    <div>
      {/* Sticky Header with back arrow */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/60">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight flex items-center gap-1.5">
                <span>{profileUser.name}</span>
                {Boolean(profileUser.verified) && (
                  <VerifiedBadge size="md" />
                )}
              </h1>
              <p className="text-xs text-muted-foreground">
                {postsCount} {postsCount === 1 ? "Post" : "Posts"}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShareProfileOpen(true)}
            className="rounded-full p-2 h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Share Profile & QR Code"
          >
            <Share2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Cover */}
      <div className="relative h-32 bg-gradient-to-br from-primary/25 via-primary/10 to-accent/25 sm:h-48">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent" />
      </div>

      {/* Profile Info */}
      <div className="px-4 sm:px-5 pb-4">
        {/* Avatar and Action Button */}
        <div className="-mt-12 mb-3 flex items-end justify-between sm:-mt-16">
          <Avatar className="size-24 border-4 border-background sm:size-32">
            <AvatarImage
              src={getAvatarUrl(profileUser.avatar)}
              alt={profileUser.name}
              className="object-cover"
            />
            <AvatarFallback className="bg-muted text-2xl font-semibold text-muted-foreground sm:text-3xl">
              {getInitials(profileUser.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center gap-2">
            {/* Share / QR Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareProfileOpen(true)}
              className="rounded-full size-9 p-0 border-border hover:bg-muted"
              title="Share profile & QR Code"
            >
              <QrCode className="size-4 text-foreground" />
            </Button>

            {isOwnProfile ? (
              <Button
                variant="outline"
                className="rounded-full border-border px-5 h-9 font-bold text-sm hover:bg-muted"
                onClick={() => router.push("/settings")}
              >
                Edit profile
              </Button>
            ) : (
              <Button
                onClick={handleFollowToggle}
                className={`rounded-full px-6 h-9 font-bold text-sm transition-all ${
                  profileUser.is_following
                    ? "bg-muted text-foreground hover:bg-destructive/10 hover:text-destructive border border-border"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {profileUser.is_following ? (
                  <span className="flex items-center gap-1.5">
                    <Check className="size-4" />
                    Following
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <UserPlus className="size-4" />
                    Follow
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Name and Username */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xl font-extrabold text-foreground">
              {profileUser.name}
            </h2>
            {Boolean(profileUser.verified) && (
              <VerifiedBadge size="lg" />
            )}
          </div>
          <p className="text-muted-foreground text-[15px]">@{profileUser.username}</p>
        </div>

        {/* Bio */}
        {profileUser.bio && (
          <p className="mb-3 whitespace-pre-line leading-relaxed text-[15px] text-foreground">
            {profileUser.bio}
          </p>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground mb-3">
          {profileUser.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-4" />
              {profileUser.location}
            </span>
          )}
          {profileUser.website && (
            <a
              href={profileUser.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <LinkIcon className="size-4" />
              {profileUser.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          {joinDate && (
            <span className="flex items-center gap-1">
              <Calendar className="size-4" />
              Joined {joinDate}
            </span>
          )}
        </div>

        {/* Followers / Following Clickable Modal Triggers */}
        <div className="flex gap-5 text-sm">
          <button
            onClick={() => openUserListModal("Following")}
            className="hover:underline cursor-pointer text-left"
          >
            <strong className="text-foreground font-bold">{profileUser.following_count ?? 0}</strong>{" "}
            <span className="text-muted-foreground">Following</span>
          </button>

          <button
            onClick={() => openUserListModal("Followers")}
            className="hover:underline cursor-pointer text-left"
          >
            <strong className="text-foreground font-bold">{profileUser.followers_count ?? 0}</strong>{" "}
            <span className="text-muted-foreground">Followers</span>
          </button>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="border-b border-border/60">
        <div className="flex">
          {profileTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3.5 text-sm font-medium text-center transition-colors relative ${
                activeTab === tab
                  ? "text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* User Posts Feed */}
      {activeTab === "Posts" && (
        <>
          {userPosts.length > 0 ? (
            <div>
              {userPosts.map((post) => (
                <PostCard key={post.id} {...post} />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                <FileText className="size-8 text-muted-foreground" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-foreground">
                No posts yet
              </h3>
              <p className="text-sm text-muted-foreground">
                {isOwnProfile
                  ? "When you create posts, they'll show up here."
                  : `@${profileUser.username} hasn't posted anything yet.`}
              </p>
            </div>
          )}
        </>
      )}

      {/* Empty states for other tabs */}
      {activeTab !== "Posts" && (
        <div className="p-12 text-center">
          <p className="text-sm text-muted-foreground">Nothing to show here yet.</p>
        </div>
      )}

      {/* Followers / Following List Dialog */}
      <Dialog open={userListModalOpen} onOpenChange={setUserListModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-5 gap-4">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="size-5 text-primary" />
              <span>{userListModalTitle}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
            {userListLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="size-6 animate-spin mx-auto text-primary" />
              </div>
            ) : userListUsers.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No {userListModalTitle.toLowerCase()} to display.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {userListUsers.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                    <Link
                      href={`/@${item.username}`}
                      onClick={() => setUserListModalOpen(false)}
                      className="flex items-center gap-3 min-w-0"
                    >
                      <Avatar className="size-10 shrink-0">
                        <AvatarImage src={getAvatarUrl(item.avatar)} alt={item.name} />
                        <AvatarFallback className="text-xs font-bold bg-muted">
                          {getInitials(item.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-semibold text-foreground truncate hover:underline">
                            {item.name}
                          </p>
                          {Boolean(item.verified) && <VerifiedBadge size="sm" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          @{item.username}
                        </p>
                      </div>
                    </Link>

                    {currentUser && currentUser.username !== item.username && (
                      <Button
                        size="sm"
                        onClick={() => handleModalUserFollowToggle(item.id, item.name)}
                        className={`rounded-full h-8 text-xs font-bold px-4 transition-all ${
                          item.is_following
                            ? "bg-muted text-foreground hover:bg-destructive/10 hover:text-destructive border border-border"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}
                      >
                        {item.is_following ? "Following" : "Follow"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Share & QR Code Dialog */}
      {profileUser && (
        <ProfileShareDialog
          open={shareProfileOpen}
          onOpenChange={setShareProfileOpen}
          user={profileUser}
        />
      )}
    </div>
  );
}
