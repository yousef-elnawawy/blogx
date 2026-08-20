"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import UserBadges from "@/components/ui/UserBadges";
import {
  MapPin,
  Link as LinkIcon,
  Calendar,
  MessageCircle,
  Share2,
  ExternalLink,
  ShieldCheck,
  Award,
  Sparkles,
} from "lucide-react";
import { getAvatarUrl, getAvatarGradient, getDefaultBannerGradient, getInitials, cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";

export interface AccountInfoUser {
  id?: number;
  name: string;
  username: string;
  avatar?: string | null;
  cover?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  verified?: boolean;
  equipped_badges?: string[] | null;
  created_at?: string | null;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  blogs_count?: number;
  is_following?: boolean;
}

interface AccountInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AccountInfoUser | null;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function AccountInfoDialog({
  open,
  onOpenChange,
  user: initialUser,
  onFollowChange,
}: AccountInfoDialogProps) {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<AccountInfoUser | null>(initialUser);
  const [following, setFollowing] = useState(Boolean(initialUser?.is_following));
  const [followLoading, setFollowLoading] = useState(false);

  // Sync state when props change
  if (initialUser && (!user || user.username !== initialUser.username)) {
    setUser(initialUser);
    setFollowing(Boolean(initialUser.is_following));
  }

  if (!user) return null;

  const isSelf = currentUser && (currentUser.username === user.username || currentUser.id === user.id);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      toast.error("Please sign in to follow creators");
      return;
    }
    if (!user.id) return;

    setFollowLoading(true);
    try {
      const res = await api.post(`/api/users/${user.id}/follow`);
      const nextState = res.data.is_following;
      setFollowing(nextState);
      onFollowChange?.(nextState);
      toast.success(nextState ? `Following @${user.username}` : `Unfollowed @${user.username}`);
    } catch {
      toast.error("Failed to update follow status");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/@${user.username}`;
    navigator.clipboard.writeText(url);
    toast.success("Profile link copied to clipboard!");
  };

  const handleOpenFullProfile = () => {
    onOpenChange(false);
    router.push(`/@${user.username}`);
  };

  const handleDirectMessage = () => {
    onOpenChange(false);
    router.push("/messages");
  };

  const joinDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Member of BlogX";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border border-border/80 bg-card shadow-2xl">
        {/* Cover banner */}
        <div
          className={cn(
            "h-28 sm:h-32 w-full relative overflow-hidden",
            user.cover ? "bg-muted" : getDefaultBannerGradient(user.username || user.name)
          )}
        >
          {user.cover && (
            <img
              src={getAvatarUrl(user.cover)}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* User Card Header */}
        <div className="px-5 pt-0 pb-5 -mt-12 space-y-4">
          <div className="flex items-end justify-between">
            <Avatar className="size-20 sm:size-22 rounded-full ring-4 ring-card shadow-lg bg-background">
              <AvatarImage src={getAvatarUrl(user.avatar)} alt={user.name} />
              <AvatarFallback className={`text-xl font-bold ${getAvatarGradient(user.username || user.name)}`}>
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex items-center gap-1.5 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="rounded-full size-8.5 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                title="Copy profile link"
              >
                <Share2 className="size-4" />
              </Button>

              {!isSelf && (
                <Button
                  size="sm"
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={cn(
                    "rounded-full text-xs font-bold px-4 h-8.5 transition-all cursor-pointer",
                    following
                      ? "bg-muted text-foreground hover:bg-destructive/10 hover:text-destructive border border-border"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                  )}
                >
                  {following ? "Following" : "Follow"}
                </Button>
              )}
            </div>
          </div>

          {/* User Names & Badges */}
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-lg font-bold text-foreground leading-snug">
                {user.name}
              </h3>
              {Boolean(user.verified) && <VerifiedBadge size="sm" />}
              <UserBadges equippedBadges={user.equipped_badges} size="xs" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">@{user.username}</p>
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {user.bio}
            </p>
          )}

          {/* Meta items */}
          <div className="grid grid-cols-1 gap-1.5 text-xs text-muted-foreground pt-1">
            {user.location && (
              <div className="flex items-center gap-2">
                <MapPin className="size-3.5 text-muted-foreground/70 shrink-0" />
                <span className="truncate">{user.location}</span>
              </div>
            )}
            {user.website && (
              <div className="flex items-center gap-2">
                <LinkIcon className="size-3.5 text-primary shrink-0" />
                <a
                  href={user.website.startsWith("http") ? user.website : `https://${user.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate"
                >
                  {user.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="size-3.5 text-muted-foreground/70 shrink-0" />
              <span>Joined {joinDate}</span>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-2xl bg-muted/40 border border-border/70 text-center">
            <div>
              <p className="text-sm font-bold text-foreground font-mono">
                {user.followers_count ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                Followers
              </p>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground font-mono">
                {user.following_count ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                Following
              </p>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground font-mono">
                {user.posts_count ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                Posts
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            {!isSelf && (
              <Button
                variant="outline"
                onClick={handleDirectMessage}
                className="flex-1 rounded-xl text-xs font-semibold h-9 gap-1.5 cursor-pointer"
              >
                <MessageCircle className="size-4" />
                <span>Message</span>
              </Button>
            )}

            <Button
              onClick={handleOpenFullProfile}
              className="flex-1 rounded-xl text-xs font-bold h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
            >
              <span>View Full Profile</span>
              <ExternalLink className="size-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
