"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Heart,
  Repeat2,
  UserPlus,
  MessageSquare,
  Sparkles,
  AtSign,
  Eye,
  Bell,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "./AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface NotificationActor {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  verified: boolean;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  actor_id: number | null;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  read_at: string | null;
  is_read: boolean;
  created_at: string;
  actor: NotificationActor | null;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  hasMore: boolean;
  filter: string;
  setFilter: (f: string) => void;
  fetchNotifications: (category?: string, pageNum?: number, reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  clearAll: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

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

function getNotificationIcon(type: string) {
  switch (type) {
    case "like_post":
    case "like_comment":
      return <Heart className="size-3.5 fill-current text-rose-500" />;
    case "share_post":
      return <Repeat2 className="size-3.5 text-blue-500" />;
    case "follow":
      return <UserPlus className="size-3.5 text-emerald-500" />;
    case "comment":
    case "comment_reply":
      return <MessageSquare className="size-3.5 text-sky-500" />;
    case "mention":
      return <AtSign className="size-3.5 text-purple-500" />;
    case "view_milestone":
      return <Eye className="size-3.5 text-amber-500" />;
    case "milestone_post":
    case "milestone_likes":
    case "milestone_followers":
      return <Sparkles className="size-3.5 text-amber-500" />;
    default:
      return <Bell className="size-3.5 text-primary" />;
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>("all");
  const lastSeenIdRef = useRef<number>(0);
  const isPollingRef = useRef<boolean>(false);

  // Mark single notification as read
  const markAsRead = async (id: number) => {
    try {
      const res = await api.post(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
      if (res.data?.unread_count !== undefined) {
        setUnreadCount(res.data.unread_count);
      } else {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      // Ignored
    }
  };

  // Toast alert for incoming notifications
  const showNotificationToast = useCallback(
    (item: NotificationItem) => {
      const isMilestone =
        item.type.startsWith("milestone") || item.type === "view_milestone";
      const actorName = item.actor?.name || "BlogX";
      const avatarSrc = item.actor?.avatar || undefined;

      toast.custom(
        (t) => (
          <div
            onClick={() => {
              toast.dismiss(t);
              markAsRead(item.id);
              if (item.data?.post_id) {
                router.push(`/post/${item.data.post_id}`);
              } else if (item.data?.follower_username) {
                router.push(`/@${item.data.follower_username}`);
              } else if (item.actor?.username) {
                router.push(`/@${item.actor.username}`);
              } else {
                router.push("/notifications");
              }
            }}
            className="flex items-center gap-3 p-3.5 bg-card/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl cursor-pointer hover:border-primary/50 transition-all duration-200 group w-full max-w-sm"
          >
            <div className="relative shrink-0">
              <Avatar className="size-10 ring-2 ring-primary/20">
                {isMilestone ? (
                  <AvatarFallback className="bg-amber-500/10 text-amber-500 font-bold">
                    <Sparkles className="size-5" />
                  </AvatarFallback>
                ) : (
                  <>
                    <AvatarImage src={avatarSrc} alt={actorName} />
                    <AvatarFallback className="bg-muted text-xs font-bold">
                      {getInitials(actorName)}
                    </AvatarFallback>
                  </>
                )}
              </Avatar>
              <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-background border border-border flex items-center justify-center shadow-xs">
                {getNotificationIcon(item.type)}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-bold text-foreground truncate">
                  {item.title}
                </p>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  Just now
                </span>
              </div>
              <p className="text-xs text-foreground/80 line-clamp-2 mt-0.5 leading-snug">
                {item.message}
              </p>
            </div>
          </div>
        ),
        { duration: 4500 }
      );
    },
    [router]
  );

  // Fast non-blocking poll
  const pollUpdates = useCallback(async () => {
    if (!user || isPollingRef.current) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

    isPollingRef.current = true;
    try {
      const res = await api.get("/api/notifications/poll", {
        params: { after_id: lastSeenIdRef.current },
      });

      if (res.data) {
        if (res.data.unread_count !== undefined) {
          setUnreadCount(res.data.unread_count);
        }

        const recent: NotificationItem[] = res.data.recent || [];
        if (recent.length > 0) {
          const maxId = Math.max(...recent.map((r) => r.id));
          lastSeenIdRef.current = Math.max(lastSeenIdRef.current, maxId);

          setNotifications((prev) => {
            const existingIds = new Set(prev.map((n) => n.id));
            const fresh = recent.filter((r) => !existingIds.has(r.id));
            return [...fresh, ...prev];
          });

          // Show toast for latest notification
          showNotificationToast(recent[0]);
        }
      }
    } catch {
      // Ignored
    } finally {
      isPollingRef.current = false;
    }
  }, [user, showNotificationToast]);

  const refreshUnreadCount = useCallback(async () => {
    await pollUpdates();
  }, [pollUpdates]);

  // Fetch full notifications list (called by notifications page)
  const fetchNotifications = useCallback(
    async (category = filter, pageNum = 1, reset = false) => {
      if (!user) return;
      setLoading(true);
      try {
        const res = await api.get("/api/notifications", {
          params: { filter: category, page: pageNum },
        });

        const data = res.data;
        const newItems: NotificationItem[] = data.notifications?.data || [];
        const lastPage: number = data.notifications?.last_page || 1;

        if (newItems.length > 0) {
          const maxId = Math.max(...newItems.map((n) => n.id));
          lastSeenIdRef.current = Math.max(lastSeenIdRef.current, maxId);
        }

        if (reset || pageNum === 1) {
          setNotifications(newItems);
        } else {
          setNotifications((prev) => {
            const existingIds = new Set(prev.map((n) => n.id));
            const filteredNew = newItems.filter((n) => !existingIds.has(n.id));
            return [...prev, ...filteredNew];
          });
        }

        setCurrentPage(pageNum);
        setHasMore(pageNum < lastPage);
        if (data.unread_count !== undefined) {
          setUnreadCount(data.unread_count);
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        setLoading(false);
      }
    },
    [user, filter]
  );

  const loadMore = async () => {
    if (loading || !hasMore) return;
    await fetchNotifications(filter, currentPage + 1, false);
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await api.post("/api/notifications/read-all");
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  // Delete notification
  const deleteNotification = async (id: number) => {
    try {
      const res = await api.delete(`/api/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (res.data?.unread_count !== undefined) {
        setUnreadCount(res.data.unread_count);
      }
      toast.success("Notification deleted");
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  // Clear all notifications
  const clearAll = async () => {
    try {
      await api.delete("/api/notifications");
      setNotifications([]);
      setUnreadCount(0);
      toast.success("All notifications cleared");
    } catch {
      toast.error("Failed to clear notifications");
    }
  };

  // Setup smart background polling & window focus listener
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      lastSeenIdRef.current = 0;
      return;
    }

    // Initial check
    pollUpdates();

    // Poll every 12 seconds
    const interval = setInterval(pollUpdates, 12000);

    // Refresh instantly on tab focus
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        pollUpdates();
      }
    };
    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [user, pollUpdates]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        hasMore,
        filter,
        setFilter: (f: string) => {
          setFilter(f);
          fetchNotifications(f, 1, true);
        },
        fetchNotifications,
        loadMore,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        refreshUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
