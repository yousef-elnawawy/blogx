"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  MessageCircle,
  Edit,
  Loader2,
  Users,
  ShieldCheck,
  Trash2,
  Check,
  CheckCheck,
  Pin,
  PinOff,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import UserBadges from "@/components/ui/UserBadges";
import { getAvatarUrl, getInitials } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  messagesService,
  ConversationItem,
  DirectMessage,
} from "@/services/messages";
import { getEcho } from "@/lib/echo";
import api from "@/lib/api";
import { toast } from "sonner";

export default function MessagesPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // New Conversation Modal State
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [followingSearch, setFollowingSearch] = useState("");
  const [startingChatUserId, setStartingChatUserId] = useState<number | null>(null);

  // Set page title
  useEffect(() => {
    document.title = "Messages / BlogX";
  }, []);

  // Fetch real conversations
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await messagesService.getConversations();
      setConversations(data.conversations || []);
    } catch (err: any) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchConversations();
    }
  }, [currentUser, fetchConversations]);

  // Real-time listener for incoming messages & seen status via Reverb
  useEffect(() => {
    if (!currentUser) return;

    const echo = getEcho();
    if (!echo) return;

    const userChannel = echo.private(`user.${currentUser.id}`);

    userChannel.listen(".NewMessage", (data: any) => {
      setConversations((prev) => {
        const convId = Number(data.conversation_id);
        const existingIdx = prev.findIndex((c) => Number(c.id) === convId);

        const updatedConv: ConversationItem = data.conversation || {
          id: convId,
          user: data.message?.sender || null,
          last_message: {
            text: data.message?.text || (data.message?.images?.length ? "📷 Image" : ""),
            created_at: "Just now",
            is_seen: false,
            sender_id: data.message?.sender_id,
          },
          unread_count: 1,
          updated_at: new Date().toISOString(),
        };

        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            ...updatedConv,
            unread_count: (updated[existingIdx].unread_count || 0) + 1,
            last_message: {
              text: data.message?.text || (data.message?.images?.length ? "📷 Image" : ""),
              created_at: "Just now",
              is_seen: false,
              sender_id: data.message?.sender_id,
            },
          };
          // Move to top
          const [moved] = updated.splice(existingIdx, 1);
          return [moved, ...updated];
        } else {
          return [updatedConv, ...prev];
        }
      });
    });

    userChannel.listen(".MessageSeen", (data: any) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (Number(c.id) === Number(data.conversation_id)) {
            return {
              ...c,
              last_message: c.last_message ? { ...c.last_message, is_seen: true } : null,
            };
          }
          return c;
        })
      );
    });

    return () => {
      userChannel.stopListening(".NewMessage");
      userChannel.stopListening(".MessageSeen");
    };
  }, [currentUser]);

  // Fetch followed users when opening "New Message" dialog
  const handleOpenNewChat = async () => {
    setNewChatModalOpen(true);
    if (!currentUser) return;

    try {
      setLoadingFollowing(true);
      const res = await api.get("/api/user/following");
      const list = res.data.users || res.data.data || res.data || [];
      setFollowingList(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load following list:", err);
      toast.error("Could not load your following list.");
    } finally {
      setLoadingFollowing(false);
    }
  };

  // Start chat with a selected user
  const handleStartChatWith = async (targetUser: any) => {
    try {
      setStartingChatUserId(targetUser.id);
      const res = await messagesService.startConversation({ recipient_id: targetUser.id });
      setNewChatModalOpen(false);
      router.push(`/messages/${res.conversation.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to start conversation.";
      toast.error(msg);
    } finally {
      setStartingChatUserId(null);
    }
  };

  // Toggle Pin / Unpin Conversation
  const handleTogglePin = async (e: React.MouseEvent, convId: number) => {
    e.stopPropagation();
    try {
      const res = await messagesService.togglePin(convId);
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === convId ? { ...c, is_pinned: res.is_pinned } : c
        );
        return [...updated].sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return 0;
        });
      });
      toast.success(res.is_pinned ? "Conversation pinned to top" : "Conversation unpinned");
    } catch {
      toast.error("Failed to update pin status");
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.user?.name?.toLowerCase().includes(q) ||
      c.user?.username?.toLowerCase().includes(q) ||
      c.last_message?.text?.toLowerCase().includes(q)
    );
  });

  // Filter following list in modal
  const filteredFollowing = followingList.filter((u) => {
    if (!followingSearch.trim()) return true;
    const q = followingSearch.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen pb-16">
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/60">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground font-[family-name:var(--font-fraunces)]">
              Messages
            </h1>
          </div>
          <Button
            size="sm"
            onClick={handleOpenNewChat}
            className="h-9 px-3.5 gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-xs"
          >
            <Edit className="size-4" />
            <span>New Message</span>
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-xl text-xs bg-muted/50 border-border/70 focus:bg-background"
            />
          </div>
        </div>
      </div>

      {/* ── Conversation List ── */}
      <div className="divide-y divide-border/40">
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="size-7 animate-spin mx-auto text-primary" />
            <p className="mt-3 text-xs text-muted-foreground">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="py-20 px-4 text-center">
            <div className="size-16 rounded-3xl bg-muted/60 flex items-center justify-center mx-auto mb-4 border border-border/60">
              <MessageCircle className="size-8 text-muted-foreground/60" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">
              {searchQuery ? "No matching conversations" : "No messages yet"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-5 leading-relaxed">
              {searchQuery
                ? "Try searching for a different name or keyword."
                : "Connect with creators and friends you follow. Start a private conversation now!"}
            </p>
            {!searchQuery && (
              <Button
                onClick={handleOpenNewChat}
                className="rounded-xl text-xs font-semibold h-9 px-4 gap-2"
              >
                <Plus className="size-4" />
                <span>Start a conversation</span>
              </Button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const otherUser = conv.user;
            const avatarSrc = getAvatarUrl(otherUser?.avatar);
            const isUnread = conv.unread_count > 0;

            return (
              <div
                key={conv.id}
                onClick={() => router.push(`/messages/${conv.id}`)}
                className={`flex items-center gap-3.5 px-4 py-3.5 cursor-pointer hover:bg-muted/40 transition-colors relative ${
                  isUnread ? "bg-primary/[0.03]" : ""
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <Avatar className="size-12 ring-1 ring-border/50">
                    <AvatarImage src={avatarSrc} alt={otherUser?.name || "User"} />
                    <AvatarFallback className="text-xs font-bold bg-muted">
                      {getInitials(otherUser?.name || "U")}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {conv.is_pinned && (
                        <span title="Pinned conversation" className="text-primary shrink-0">
                          <Pin className="size-3.5 fill-primary/20 rotate-45" />
                        </span>
                      )}
                      <span
                        className={`text-sm truncate ${
                          isUnread ? "font-bold text-foreground" : "font-semibold text-foreground/90"
                        }`}
                      >
                        {otherUser?.display_name || otherUser?.custom_nickname || otherUser?.name || "User"}
                      </span>
                      {otherUser?.verified && <VerifiedBadge size="xs" />}
                      <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                        @{otherUser?.username}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[11px] text-muted-foreground">
                        {conv.last_message?.created_at || ""}
                      </span>

                      {/* Pin / Unpin Action */}
                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(e, conv.id)}
                        className="size-6 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                        title={conv.is_pinned ? "Unpin conversation" : "Pin conversation to top"}
                      >
                        {conv.is_pinned ? (
                          <PinOff className="size-3.5" />
                        ) : (
                          <Pin className="size-3.5 opacity-60 hover:opacity-100" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-xs truncate ${
                        isUnread
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {conv.last_message?.sender_id === currentUser?.id && (
                        <span className="text-muted-foreground/80 mr-1">You:</span>
                      )}
                      {conv.last_message?.text || "No messages yet"}
                    </p>

                    {/* Unread Badge */}
                    {conv.unread_count > 0 && (
                      <span className="size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                        {conv.unread_count > 9 ? "9+" : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Dialog: New Message (Following Only) ── */}
      <Dialog open={newChatModalOpen} onOpenChange={setNewChatModalOpen}>
        <DialogContent className="sm:max-w-md p-6 rounded-3xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <MessageCircle className="size-5 text-primary" />
              <span>New Message</span>
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            You can send direct messages to anyone you <strong>follow</strong>. Select a user to start chatting.
          </p>

          {/* Search Following */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search people you follow..."
              value={followingSearch}
              onChange={(e) => setFollowingSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl text-xs bg-muted/50 border-border/70"
            />
          </div>

          {/* Following List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-border/40 -mx-2 px-2">
            {loadingFollowing ? (
              <div className="py-8 text-center">
                <Loader2 className="size-6 animate-spin mx-auto text-primary" />
                <p className="mt-2 text-xs text-muted-foreground">Loading your following list...</p>
              </div>
            ) : filteredFollowing.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="size-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground mb-1">
                  {followingSearch ? "No users found" : "You aren't following anyone yet"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Follow users on BlogX to unlock direct messaging with them.
                </p>
              </div>
            ) : (
              filteredFollowing.map((targetUser) => {
                const avatarSrc = getAvatarUrl(targetUser.avatar);
                const isStarting = startingChatUserId === targetUser.id;

                return (
                  <div
                    key={targetUser.id}
                    className="flex items-center justify-between py-2.5 px-2 hover:bg-muted/40 rounded-xl transition-colors cursor-pointer"
                    onClick={() => !isStarting && handleStartChatWith(targetUser)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="size-10 ring-1 ring-border/50 shrink-0">
                        <AvatarImage src={avatarSrc} alt={targetUser.name} />
                        <AvatarFallback className="text-xs font-bold bg-muted">
                          {getInitials(targetUser.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-foreground truncate">
                            {targetUser.name}
                          </span>
                          {targetUser.verified && <VerifiedBadge size="xs" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          @{targetUser.username}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isStarting}
                      className="rounded-xl text-xs h-8 px-3 font-semibold shrink-0"
                    >
                      {isStarting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        "Chat"
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
