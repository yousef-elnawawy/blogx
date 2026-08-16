"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MilestoneCertificateDialog, {
  MilestoneData,
} from "@/components/notifications/MilestoneCertificateDialog";
import { getAvatarUrl } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Heart,
  Repeat2,
  UserPlus,
  MessageSquare,
  Sparkles,
  AtSign,
  Eye,
  CheckCheck,
  Trash2,
  MoreHorizontal,
  Award,
  Trophy,
  FileText,
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ─────────────── helpers ─────────────── */

function getInitials(name: string) {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type BadgeInfo = {
  icon: React.ReactNode;
  bg: string;
  ring: string;
};

function getTypeBadge(type: string): BadgeInfo {
  switch (type) {
    case "like_post":
    case "like_comment":
      return {
        icon: <Heart className="size-3 fill-white text-white" />,
        bg: "bg-brand-like",
        ring: "ring-brand-like-subtle",
      };
    case "share_post":
      return {
        icon: <Repeat2 className="size-3 text-white" />,
        bg: "bg-cyan-500",
        ring: "ring-cyan-200 dark:ring-cyan-900",
      };
    case "follow":
      return {
        icon: <UserPlus className="size-3 text-white" />,
        bg: "bg-brand-following",
        ring: "ring-brand-following-subtle",
      };
    case "comment":
    case "comment_reply":
      return {
        icon: <MessageSquare className="size-3 text-white" />,
        bg: "bg-teal-500",
        ring: "ring-teal-200 dark:ring-teal-900",
      };
    case "mention":
      return {
        icon: <AtSign className="size-3 text-white" />,
        bg: "bg-brand-mention",
        ring: "ring-brand-mention-subtle",
      };
    case "view_milestone":
    case "milestone_post":
    case "milestone_likes":
    case "milestone_followers":
      return {
        icon: <Sparkles className="size-3 text-white" />,
        bg: "bg-amber-500",
        ring: "ring-amber-200 dark:ring-amber-900",
      };
    default:
      return {
        icon: <Bell className="size-3 text-white" />,
        bg: "bg-primary",
        ring: "ring-primary/20",
      };
  }
}

function isMilestoneType(type: string) {
  return (
    type === "milestone_followers" ||
    type === "milestone_post" ||
    type === "milestone_likes" ||
    type === "view_milestone"
  );
}

/* ─────────────── tab config ─────────────── */

const FILTER_TABS = [
  { key: "all", label: "All", icon: <Bell className="size-3.5" /> },
  {
    key: "likes",
    label: "Likes",
    icon: <Heart className="size-3.5 fill-current" />,
    color: "text-brand-like",
    activeColor: "bg-brand-like text-white",
    hoverColor: "hover:bg-brand-like-subtle hover:text-brand-like",
  },
  {
    key: "comments",
    label: "Comments",
    icon: <MessageSquare className="size-3.5" />,
    color: "text-teal-500",
    activeColor: "bg-teal-500 text-white",
    hoverColor: "hover:bg-teal-500/10 hover:text-teal-500",
  },
  {
    key: "follows",
    label: "Follows",
    icon: <UserPlus className="size-3.5" />,
    color: "text-brand-following",
    activeColor: "bg-brand-following text-white",
    hoverColor: "hover:bg-brand-following-subtle hover:text-brand-following",
  },
  {
    key: "mentions",
    label: "Mentions",
    icon: <AtSign className="size-3.5" />,
    color: "text-brand-mention",
    activeColor: "bg-brand-mention text-white",
    hoverColor: "hover:bg-brand-mention-subtle hover:text-brand-mention",
  },
  {
    key: "shares",
    label: "Shares",
    icon: <Repeat2 className="size-3.5" />,
    color: "text-cyan-500",
    activeColor: "bg-cyan-500 text-white",
    hoverColor: "hover:bg-cyan-500/10 hover:text-cyan-500",
  },
  {
    key: "milestone",
    label: "Milestones",
    icon: <Trophy className="size-3.5" />,
    color: "text-amber-500",
    activeColor: "bg-amber-500 text-white",
    hoverColor: "hover:bg-amber-500/10 hover:text-amber-500",
  },
];

const BATCH_SIZE = 12;

/* ─────────────── main component ─────────────── */

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    filter,
    setFilter,
    fetchNotifications,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  const [milestoneDialog, setMilestoneDialog] = useState<{
    open: boolean;
    data: MilestoneData;
  }>({ open: false, data: {} });

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  /* load on mount & filter change */
  useEffect(() => {
    if (user) {
      fetchNotifications(filter, 1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

  /* Infinite scroll intersection observer */
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "300px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  /* click handler */
  const handleNotificationClick = async (
    notif: (typeof notifications)[0]
  ) => {
    if (!notif.is_read) await markAsRead(notif.id);

    if (isMilestoneType(notif.type)) {
      setMilestoneDialog({
        open: true,
        data: {
          milestone_type:
            notif.type === "milestone_followers"
              ? "followers"
              : notif.type === "milestone_post"
              ? "posts"
              : notif.type === "milestone_likes"
              ? "likes"
              : "views",
          milestone_count:
            notif.data?.milestone_count ||
            notif.data?.milestone ||
            notif.data?.follower_count ||
            notif.data?.post_count ||
            1,
          user_name: user?.name,
          username: user?.username,
          avatar: user?.avatar,
          issued_at: notif.created_at,
          post_content: notif.data?.post_content,
        },
      });
      return;
    }

    if (notif.data?.post_id) router.push(`/post/${notif.data.post_id}`);
    else if (notif.data?.follower_username)
      router.push(`/@${notif.data.follower_username}`);
    else if (notif.actor?.username) router.push(`/@${notif.actor.username}`);
  };

  const openCertificate = (
    e: React.MouseEvent,
    notif: (typeof notifications)[0]
  ) => {
    e.stopPropagation();
    if (!notif.is_read) markAsRead(notif.id);
    setMilestoneDialog({
      open: true,
      data: {
        milestone_type:
          notif.type === "milestone_followers"
            ? "followers"
            : notif.type === "milestone_post"
            ? "posts"
            : notif.type === "milestone_likes"
            ? "likes"
            : "views",
        milestone_count:
          notif.data?.milestone_count ||
          notif.data?.milestone ||
          notif.data?.follower_count ||
          notif.data?.post_count ||
          1,
        user_name: user?.name,
        username: user?.username,
        avatar: user?.avatar,
        issued_at: notif.created_at,
        post_content: notif.data?.post_content,
      },
    });
  };



  /* ── unauthenticated ── */
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
        <div className="size-20 rounded-full bg-muted flex items-center justify-center mb-5">
          <Bell className="size-9 text-muted-foreground/40" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Sign in to see notifications
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          Stay up to date with likes, comments, follows and milestones on BlogX.
        </p>
        <Button
          onClick={() => router.push("/login")}
          className="rounded-full px-8 font-bold"
        >
          Sign In
        </Button>
      </div>
    );
  }

  /* ── main UI ── */
  return (
    <div className="w-full">
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/60">
        {/* Title row */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Bell className="size-5 text-foreground" strokeWidth={2.2} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 size-3.5 rounded-full bg-primary border-2 border-background" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-foreground tracking-tight leading-none">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-none">
                Stay updated with interactions, mentions, and milestones
              </p>
            </div>
          </div>

          {/* Action buttons: Settings & Actions dropdown */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => router.push("/settings?tab=notifications")}
              className="size-7 sm:size-7.5 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted/80 active:scale-95 transition-all cursor-pointer"
              title="Notification Settings"
            >
              <Settings className="size-4" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger
                className="size-7 sm:size-7.5 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted/80 active:scale-95 transition-all cursor-pointer"
                title="More options"
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 sm:w-48 p-1">
                <DropdownMenuItem
                  onClick={() => router.push("/settings?tab=notifications")}
                  className="gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer"
                >
                  <Settings className="size-3.5 text-muted-foreground" />
                  <span>Notification settings</span>
                </DropdownMenuItem>
                {unreadCount > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={markAllAsRead}
                      className="gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer text-primary focus:text-primary focus:bg-primary/10"
                    >
                      <CheckCheck className="size-3.5" />
                      <span>Mark all as read</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={clearAll}
                  className="gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  <span>Clear all notifications</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 px-3 pb-3 overflow-x-auto no-scrollbar">
          {FILTER_TABS.map((tab) => {
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? tab.activeColor || "bg-foreground text-background"
                    : `text-muted-foreground ${tab.hoverColor || "hover:bg-muted hover:text-foreground"}`
                }`}
              >
                <span
                  className={
                    isActive ? "" : tab.color || "text-muted-foreground"
                  }
                >
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Notifications list ── */}
      <div>
        {loading && notifications.length === 0 ? (
          /* Skeleton */
          <div className="divide-y divide-border/40">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3.5 px-4 py-4">
                <Skeleton className="size-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2.5 pt-1">
                  <Skeleton className="h-3.5 w-2/3 rounded-full" />
                  <Skeleton className="h-3 w-full rounded-full" />
                  <Skeleton className="h-3 w-1/4 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-28 px-6 text-center">
            <div className="size-20 rounded-full bg-muted/70 flex items-center justify-center mb-4">
              <Bell className="size-9 text-muted-foreground/30" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1.5">
              No notifications yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              When someone interacts with you, you&apos;ll see it here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {notifications.map((notif) => {
              const isMilestone = isMilestoneType(notif.type);
              const actorAvatarUrl = getAvatarUrl(notif.actor?.avatar);
              const actorName = notif.actor?.name || "BlogX";
              const badge = getTypeBadge(notif.type);

              /* ── Milestone card (special layout) ── */
              if (isMilestone) {
                return (
                  <div
                    key={notif.id}
                    className={`group relative px-4 py-4 transition-colors cursor-pointer ${
                      !notif.is_read
                        ? "bg-amber-50/60 dark:bg-amber-950/10 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                        : "hover:bg-muted/40"
                    }`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    {/* Unread left border */}
                    {!notif.is_read && (
                      <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-r-full bg-amber-500" />
                    )}

                    <div className="flex gap-3.5">
                      {/* Milestone icon avatar */}
                      <div className="relative shrink-0">
                        <div className="size-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
                          <Award className="size-6 text-white" />
                        </div>
                        <div
                          className={`absolute -bottom-1 -right-1 size-5 rounded-full ${badge.bg} flex items-center justify-center shadow-sm ring-2 ring-background`}
                        >
                          {badge.icon}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground leading-snug flex items-center gap-1.5 flex-wrap">
                              <Trophy className="size-3.5 text-amber-500 shrink-0" />
                              {notif.title}
                            </p>
                            <p className="text-sm text-muted-foreground leading-snug mt-0.5">
                              {notif.message}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!notif.is_read && (
                              <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notif.id);
                              }}
                              className="p-1 rounded-full opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Certificate button */}
                        <button
                          type="button"
                          onClick={(e) => openCertificate(e, notif)}
                          className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-amber-400/60 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                        >
                          <FileText className="size-3.5" />
                          View Certificate &amp; Report
                        </button>

                        <p className="text-[11px] text-muted-foreground/60 mt-2 leading-none">
                          {formatDistanceToNow(new Date(notif.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              /* ── Regular notification card ── */
              return (
                <div
                  key={notif.id}
                  className={`group relative flex gap-3.5 px-4 py-3.5 cursor-pointer transition-colors ${
                    !notif.is_read
                      ? "bg-primary/[0.035] hover:bg-primary/[0.06]"
                      : "hover:bg-muted/40"
                  }`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  {/* Unread indicator */}
                  {!notif.is_read && (
                    <div className="absolute left-0 top-3.5 bottom-3.5 w-0.5 rounded-r-full bg-primary" />
                  )}

                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <Avatar className="size-12 ring-2 ring-border/50">
                      <AvatarImage
                        src={actorAvatarUrl}
                        alt={actorName}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-muted text-sm font-bold text-foreground">
                        {getInitials(actorName)}
                      </AvatarFallback>
                    </Avatar>
                    {/* Type badge */}
                    <div
                      className={`absolute -bottom-1 -right-1 size-5 rounded-full ${badge.bg} flex items-center justify-center shadow-sm ring-2 ring-background`}
                    >
                      {badge.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-snug">
                          <span className="font-bold">{actorName}</span>{" "}
                          <span className="text-muted-foreground font-normal">
                            {notif.message?.replace(actorName, "").trim() ||
                              notif.title}
                          </span>
                        </p>

                        {/* Post preview snippet */}
                        {notif.data?.post_content && (
                          <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-1 italic border-l-2 border-border/60 pl-2">
                            {notif.data.post_content}
                          </p>
                        )}

                        <p className="text-[11px] text-muted-foreground/60 mt-1.5 leading-none">
                          {formatDistanceToNow(new Date(notif.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>

                      {/* Right side: dot + delete */}
                      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        {!notif.is_read && (
                          <span className="size-2 rounded-full bg-primary shrink-0" />
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          className="p-1 rounded-full opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Lazy load sentinel */}
            <div ref={sentinelRef} className="h-2" />

            {/* Loading more skeleton */}
            {loading && notifications.length > 0 && (
              <div className="flex gap-3.5 px-4 py-4">
                <Skeleton className="size-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2.5 pt-1">
                  <Skeleton className="h-3.5 w-2/3 rounded-full" />
                  <Skeleton className="h-3 w-full rounded-full" />
                </div>
              </div>
            )}

            {/* End of list */}
            {!hasMore && notifications.length > 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground/50 font-medium">
                You&apos;re all caught up ✓
              </div>
            )}
          </div>
        )}
      </div>

      {/* Milestone Certificate Dialog */}
      <MilestoneCertificateDialog
        open={milestoneDialog.open}
        onOpenChange={(open) =>
          setMilestoneDialog((prev) => ({ ...prev, open }))
        }
        data={milestoneDialog.data}
        currentUser={user}
      />
    </div>
  );
}
