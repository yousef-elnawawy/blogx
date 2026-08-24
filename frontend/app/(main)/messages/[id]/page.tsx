"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Send,
  Image as ImageIcon,
  Smile,
  Info,
  ArrowLeft,
  Check,
  CheckCheck,
  X,
  MessageCircle,
  Loader2,
  Trash2,
  ExternalLink,
  Reply,
  Copy,
  ChevronDown,
  MoreVertical,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import AccountInfoDialog from "@/components/profile/AccountInfoDialog";
import ImageLightbox from "@/components/post/ImageLightbox";
import VideoEmbed from "@/components/post/VideoEmbed";
import LinkPreviewCard from "@/components/post/LinkPreviewCard";
import AudioWaveformPlayer from "@/components/messages/AudioWaveformPlayer";
import VoiceRecorder from "@/components/messages/VoiceRecorder";
import SharedContentCard from "@/components/messages/SharedContentCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { getAvatarUrl, getInitials } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  messagesService,
  ConversationItem,
  DirectMessage,
  MessageReaction,
} from "@/services/messages";
import { getEcho } from "@/lib/echo";
import api from "@/lib/api";
import { toast } from "sonner";

const QUICK_EMOJIS = [
  "😀", "😂", "🔥", "🚀", "❤️", "✨", "👍", "🎉", "💡", "🧠",
  "💻", "⚡", "🙌", "💯", "👏", "😍", "🤔", "🎯", "⭐", "📌",
];

const REACTION_EMOJIS = ["❤️", "👍", "🔥", "😂", "😮", "😢"];

function getMessageDateKey(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

function formatMessageDateHeader(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";

  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function renderMessageContent(text: string, router: any, isMe: boolean) {
  if (!text) return null;

  const tokenRegex = /(https?:\/\/[^\s<>"'{}|\\^`]+)|(@[a-zA-Z0-9_]+)|(#[^\s#]+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("http://") || token.startsWith("https://")) {
      parts.push(
        <a
          key={match.index}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`underline font-medium break-all hover:opacity-85 ${
            isMe ? "text-white" : "text-primary"
          }`}
        >
          {token}
        </a>
      );
    } else if (token.startsWith("@")) {
      const username = token.slice(1);
      parts.push(
        <span
          key={match.index}
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/@${username}`);
          }}
          className={`font-semibold cursor-pointer hover:underline ${
            isMe ? "text-white/95" : "text-primary"
          }`}
        >
          {token}
        </span>
      );
    } else if (token.startsWith("#")) {
      const tag = token.slice(1);
      parts.push(
        <span
          key={match.index}
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/search?q=%23${encodeURIComponent(tag)}`);
          }}
          className={`font-semibold cursor-pointer hover:underline ${
            isMe ? "text-white/95" : "text-primary"
          }`}
        >
          {token}
        </span>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const convId = params?.id as string;

  const [conversation, setConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [isFollowing, setIsFollowing] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  const [messageText, setMessageText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);

  // Reply State
  const [replyingTo, setReplyingTo] = useState<DirectMessage | null>(null);

  // Typing state
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const otherTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const myTypingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMyTypingRef = useRef(false);

  // Scroll to bottom floating button
  const [showScrollBottomButton, setShowScrollBottomButton] = useState(false);
  const [newMessagesWhileScrolled, setNewMessagesWhileScrolled] = useState(0);

  // Image Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Highlight message on scroll
  const [highlightedMsgId, setHighlightedMsgId] = useState<number | null>(null);

  // Emoji popover & dialog states
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [accountInfoOpen, setAccountInfoOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Single Message Delete Confirmation Dialog
  const [messageToDelete, setMessageToDelete] = useState<DirectMessage | null>(null);

  // Hovered message for actions
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<number | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLInputElement>(null);
  const isInitialLoadedRef = useRef(false);

  // Dynamic document title
  useEffect(() => {
    if (conversation?.user) {
      document.title = `Chat with ${conversation.user.name} / BlogX`;
    } else {
      document.title = "Conversation / BlogX";
    }
  }, [conversation]);

  // Reliable scroll helper
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "instant") => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Fetch Conversation Data
  const loadConversation = useCallback(async () => {
    if (!convId) return;
    try {
      setLoading(true);
      const data = await messagesService.getConversation(convId, { limit: 30 });
      setConversation(data.conversation);
      setMessages(data.messages || []);
      setHasMore(Boolean(data.has_more));
      setIsFollowing(data.is_following);
      isInitialLoadedRef.current = true;
    } catch (err: any) {
      console.error("Failed to load conversation:", err);
      toast.error(err.response?.data?.message || "Failed to load conversation.");
    } finally {
      setLoading(false);
    }
  }, [convId]);

  // Load older messages on scroll up
  const loadOlderMessages = useCallback(async () => {
    if (!hasMore || loadingMore || messages.length === 0 || !convId) return;
    const container = messagesContainerRef.current;
    if (!container) return;

    const oldScrollHeight = container.scrollHeight;
    const oldScrollTop = container.scrollTop;
    const oldestMsgId = messages[0]?.id;

    try {
      setLoadingMore(true);
      const data = await messagesService.getConversation(convId, {
        before_id: oldestMsgId,
        limit: 25,
      });

      if (data.messages && data.messages.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const filteredOld = data.messages.filter((m) => !existingIds.has(m.id));
          return [...filteredOld, ...prev];
        });
        setHasMore(Boolean(data.has_more));

        // Restore scroll position cleanly
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - oldScrollHeight + oldScrollTop;
          }
        });
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, messages, convId]);

  // Scroll listener
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container || !isInitialLoadedRef.current) return;

    // Infinite scroll up
    if (container.scrollTop <= 60 && hasMore && !loadingMore) {
      loadOlderMessages();
    }

    // Scroll to bottom button visibility check
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom > 220) {
      setShowScrollBottomButton(true);
    } else {
      setShowScrollBottomButton(false);
      setNewMessagesWhileScrolled(0);
    }
  };

  useEffect(() => {
    if (currentUser && convId) {
      isInitialLoadedRef.current = false;
      loadConversation();
    }
  }, [currentUser, convId, loadConversation]);

  // Initial scroll to bottom when conversation is first loaded
  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom("instant");
      const t1 = setTimeout(() => scrollToBottom("instant"), 50);
      const t2 = setTimeout(() => scrollToBottom("instant"), 150);
      const t3 = setTimeout(() => scrollToBottom("instant"), 400);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [loading, conversation?.id, scrollToBottom]);

  // Real-time listener for this conversation via Reverb
  useEffect(() => {
    if (!convId || !currentUser) return;

    const echo = getEcho();
    if (!echo) return;

    const convChannel = echo.private(`conversation.${convId}`);

    // Listen for new messages
    convChannel.listen(".NewMessage", (data: any) => {
      if (data.message) {
        const newMsg: DirectMessage = data.message;
        setMessages((prev) => {
          if (prev.some((m) => Number(m.id) === Number(newMsg.id))) {
            return prev;
          }
          return [...prev, newMsg];
        });

        // Clear typing indicator
        setIsOtherTyping(false);

        // Check if user is scrolled up
        const container = messagesContainerRef.current;
        if (container) {
          const dist =
            container.scrollHeight - container.scrollTop - container.clientHeight;
          if (dist > 220) {
            setNewMessagesWhileScrolled((c) => c + 1);
          } else {
            requestAnimationFrame(() => scrollToBottom("smooth"));
          }
        }

        // Acknowledge read if received from other user
        if (Number(newMsg.sender_id) !== Number(currentUser.id)) {
          messagesService.markAsRead(convId).catch(() => {});
        }
      }
    });

    // Listen for deleted messages
    convChannel.listen(".MessageDeleted", (data: any) => {
      if (data.message_id) {
        setMessages((prev) =>
          prev.filter((m) => Number(m.id) !== Number(data.message_id))
        );
      }
    });

    // Listen for read receipts
    convChannel.listen(".MessageSeen", (data: any) => {
      setMessages((prev) =>
        prev.map((m) => ({
          ...m,
          is_seen: true,
        }))
      );
    });

    // Listen for typing indicator
    convChannel.listen(".UserTyping", (data: any) => {
      if (Number(data.user_id) !== Number(currentUser.id)) {
        if (data.is_typing) {
          setIsOtherTyping(true);
          if (otherTypingTimeoutRef.current) {
            clearTimeout(otherTypingTimeoutRef.current);
          }
          otherTypingTimeoutRef.current = setTimeout(() => {
            setIsOtherTyping(false);
          }, 3000);
        } else {
          setIsOtherTyping(false);
        }
      }
    });

    // Listen for reaction updates
    convChannel.listen(".MessageReactionUpdated", (data: any) => {
      if (data.message_id) {
        setMessages((prev) =>
          prev.map((m) => {
            if (Number(m.id) === Number(data.message_id)) {
              return {
                ...m,
                reactions: data.reactions || [],
              };
            }
            return m;
          })
        );
      }
    });

    return () => {
      convChannel.stopListening(".NewMessage");
      convChannel.stopListening(".MessageDeleted");
      convChannel.stopListening(".MessageSeen");
      convChannel.stopListening(".UserTyping");
      convChannel.stopListening(".MessageReactionUpdated");
      if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
    };
  }, [convId, currentUser, scrollToBottom]);

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMessageText(val);

    if (!isMyTypingRef.current && val.trim().length > 0) {
      isMyTypingRef.current = true;
      messagesService.sendTyping(convId, true).catch(() => {});
    }

    if (myTypingTimerRef.current) {
      clearTimeout(myTypingTimerRef.current);
    }

    myTypingTimerRef.current = setTimeout(() => {
      if (isMyTypingRef.current) {
        isMyTypingRef.current = false;
        messagesService.sendTyping(convId, false).catch(() => {});
      }
    }, 2000);
  };

  // Close emoji on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setEmojiOpen(false);
      }
    }
    if (emojiOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [emojiOpen]);

  // Handle image files selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);

      const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
      setFilePreviews((prev) => [...prev, ...newPreviews]);
    }
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Send a recorded voice note
  const handleSendVoiceNote = async (audioBlob: Blob, duration: number) => {
    if (!convId || !isFollowing) return;
    try {
      setSending(true);
      const res = await messagesService.sendMessage(convId, {
        audio: audioBlob,
        audio_duration: duration,
        reply_to_id: replyingTo?.id || null,
      });
      setMessages((prev) => [...prev, res.message]);
      setReplyingTo(null);
      scrollToBottom("smooth");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send voice message");
    } finally {
      setSending(false);
    }
  };

  // Follow other user if not following
  const handleFollowUser = async () => {
    if (!conversation?.user) return;
    try {
      setFollowingLoading(true);
      await api.post(`/api/users/${conversation.user.id}/follow`);
      setIsFollowing(true);
      toast.success(`You are now following ${conversation.user.name}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to follow user.");
    } finally {
      setFollowingLoading(false);
    }
  };

  // Scroll to a specific message
  const scrollToMessage = (messageId: number) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMsgId(messageId);
      setTimeout(() => setHighlightedMsgId(null), 2000);
    }
  };

  // Copy message text
  const handleCopyMessageText = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Message copied to clipboard");
  };

  // Delete a single message
  const handleDeleteSingleMessage = async (msg: DirectMessage) => {
    // Optimistically remove from state
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    setMessageToDelete(null);

    try {
      await messagesService.deleteMessage(convId, msg.id);
      toast.success("Message deleted");
    } catch (err: any) {
      toast.error("Failed to delete message");
      loadConversation();
    }
  };

  // Toggle reaction on a message
  const handleToggleReaction = async (messageId: number, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId) {
          const currentReactions = m.reactions || [];
          const existingIdx = currentReactions.findIndex((r) => r.emoji === emoji);

          let updated: MessageReaction[] = [];
          if (existingIdx !== -1) {
            const item = currentReactions[existingIdx];
            if (item.has_reacted) {
              const newCount = item.count - 1;
              if (newCount > 0) {
                updated = currentReactions.map((r, i) =>
                  i === existingIdx
                    ? { ...r, count: newCount, has_reacted: false }
                    : r
                );
              } else {
                updated = currentReactions.filter((_, i) => i !== existingIdx);
              }
            } else {
              updated = currentReactions.map((r, i) =>
                i === existingIdx
                  ? { ...r, count: r.count + 1, has_reacted: true }
                  : r
              );
            }
          } else {
            updated = [
              ...currentReactions,
              {
                emoji,
                count: 1,
                users: currentUser?.id ? [Number(currentUser.id)] : [],
                has_reacted: true,
              },
            ];
          }
          return { ...m, reactions: updated };
        }
        return m;
      })
    );

    setActiveMessageMenuId(null);

    try {
      const res = await messagesService.toggleReaction(convId, messageId, emoji);
      if (res.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? res.message : m))
        );
      }
    } catch (err: any) {
      console.error("Failed to toggle reaction:", err);
    }
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmed = messageText.trim();
    if ((!trimmed && selectedFiles.length === 0) || sending) return;

    if (!isFollowing) {
      toast.error("You must follow this user to send them a message.");
      return;
    }

    try {
      setSending(true);

      if (isMyTypingRef.current) {
        isMyTypingRef.current = false;
        messagesService.sendTyping(convId, false).catch(() => {});
      }

      const res = await messagesService.sendMessage(convId, {
        text: trimmed || undefined,
        images: selectedFiles.length > 0 ? selectedFiles : undefined,
        reply_to_id: replyingTo ? replyingTo.id : null,
      });

      setMessages((prev) => {
        if (prev.some((m) => Number(m.id) === Number(res.message.id))) {
          return prev;
        }
        return [...prev, res.message];
      });

      setMessageText("");
      setReplyingTo(null);
      setSelectedFiles([]);
      filePreviews.forEach((p) => URL.revokeObjectURL(p));
      setFilePreviews([]);
      setEmojiOpen(false);

      requestAnimationFrame(() => scrollToBottom("smooth"));
    } catch (err: any) {
      console.error("Failed to send message:", err);
      const errorMsg = err.response?.data?.message || "Failed to send message.";
      toast.error(errorMsg);
      if (err.response?.data?.requires_follow) {
        setIsFollowing(false);
      }
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  // Delete conversation
  const handleDeleteConversation = async () => {
    try {
      await messagesService.deleteConversation(convId);
      toast.success("Conversation deleted.");
      router.push("/messages");
    } catch (err: any) {
      toast.error("Failed to delete conversation.");
    }
  };

  const otherUser = conversation?.user;
  const avatarSrc = getAvatarUrl(otherUser?.avatar);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-xs text-muted-foreground">Loading conversation...</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="size-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
          <MessageCircle className="size-7 text-muted-foreground" />
        </div>
        <h2 className="text-base font-bold text-foreground mb-1">Conversation Not Found</h2>
        <p className="text-xs text-muted-foreground mb-4">
          This conversation does not exist or you do not have permission to view it.
        </p>
        <Link href="/messages">
          <Button size="sm" className="rounded-xl text-xs font-semibold">
            Back to Messages
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] bg-background select-none relative">
      {/* ── Chat Header ── */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/60 shrink-0">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5">
          {/* Left: Back + User Info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => router.push("/messages")}
              className="p-1.5 -ml-1 rounded-full hover:bg-muted transition-colors active:scale-95 text-foreground"
            >
              <ArrowLeft className="size-5" />
            </button>

            <div
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity min-w-0"
              onClick={() => setAccountInfoOpen(true)}
            >
              <Avatar className="size-9 ring-1 ring-border/50 shrink-0">
                <AvatarImage src={avatarSrc} alt={otherUser?.name || "User"} />
                <AvatarFallback className="text-xs font-bold bg-muted">
                  {getInitials(otherUser?.name || "U")}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-foreground truncate">
                    {otherUser?.name || "User"}
                  </span>
                  {otherUser?.verified && <VerifiedBadge size="xs" />}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {isOtherTyping ? (
                    <span className="text-primary font-semibold animate-pulse">
                      typing...
                    </span>
                  ) : (
                    `@${otherUser?.username}`
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAccountInfoOpen(true)}
              className="size-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
              title="View Profile Details"
            >
              <Info className="size-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-44 p-1 rounded-2xl">
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-2 px-2.5 py-1.5 text-xs font-semibold text-destructive cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  <span>Delete Conversation</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ── Messages Stream ── */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 relative"
      >
        {/* Top Loading Spinner when fetching older history */}
        {loadingMore && (
          <div className="py-2 text-center">
            <Loader2 className="size-5 animate-spin mx-auto text-primary" />
            <span className="text-[11px] text-muted-foreground">Loading older messages...</span>
          </div>
        )}

        {/* Intro banner (shown when user reached the beginning of conversation) */}
        {!hasMore && (
          <div className="flex flex-col items-center justify-center py-6 text-center border-b border-border/40 mb-4">
            <Avatar className="size-16 ring-2 ring-primary/30 shadow-xs mb-2.5">
              <AvatarImage src={avatarSrc} alt={otherUser?.name || "User"} />
              <AvatarFallback className="text-base font-bold bg-muted">
                {getInitials(otherUser?.name || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1.5 justify-center mb-0.5">
              <h3 className="text-base font-bold text-foreground">
                {otherUser?.name}
              </h3>
              {otherUser?.verified && <VerifiedBadge size="sm" />}
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              @{otherUser?.username}
            </p>
            {otherUser?.bio && (
              <p className="text-xs text-foreground/80 max-w-sm mx-auto line-clamp-2 leading-relaxed mb-3">
                {otherUser.bio}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/@${otherUser?.username}`)}
              className="rounded-xl text-xs h-8 px-3 gap-1.5"
            >
              <span>View Profile</span>
              <ExternalLink className="size-3" />
            </Button>
          </div>
        )}

        {/* Message Items & Date Dividers */}
        {messages.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-xs text-muted-foreground">
              No messages yet. Send a greeting to start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = Number(msg.sender_id) === Number(currentUser?.id);
            const isHighlighted = highlightedMsgId === msg.id;

            // Date divider check
            const currentDateKey = getMessageDateKey(msg.created_at);
            const prevDateKey =
              index > 0 ? getMessageDateKey(messages[index - 1].created_at) : null;
            const showDateHeader = currentDateKey && currentDateKey !== prevDateKey;

            return (
              <div key={msg.id} className="space-y-3.5">
                {/* ── Date Divider ── */}
                {showDateHeader && (
                  <div className="flex justify-center my-4">
                    <span className="px-3.5 py-1 rounded-full bg-muted/80 backdrop-blur-sm border border-border/60 text-[11px] font-semibold text-muted-foreground shadow-2xs">
                      {formatMessageDateHeader(msg.created_at)}
                    </span>
                  </div>
                )}

                <div
                  id={`msg-${msg.id}`}
                  className={`group/msg relative flex flex-col ${
                    isMe ? "items-end" : "items-start"
                  } transition-colors duration-500 rounded-2xl ${
                    isHighlighted ? "bg-primary/10 p-1" : ""
                  }`}
                  onMouseEnter={() => setActiveMessageMenuId(msg.id)}
                  onMouseLeave={() => setActiveMessageMenuId(null)}
                >
                  {/* Floating Quick Actions Bar (Hover) */}
                  <div
                    className={`absolute -top-3 ${
                      isMe ? "right-2" : "left-2"
                    } z-20 flex items-center gap-0.5 bg-card/95 backdrop-blur-sm border border-border/80 rounded-full px-1 py-0.5 shadow-md opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150`}
                  >
                    {/* Quick Reactions */}
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleToggleReaction(msg.id, emoji)}
                        className="size-6 rounded-full hover:scale-125 flex items-center justify-center text-xs transition-transform cursor-pointer"
                        title={`React ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}

                    <div className="h-3 w-px bg-border/80 mx-0.5" />

                    {/* Reply Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingTo(msg);
                        textareaRef.current?.focus();
                      }}
                      className="size-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Reply"
                    >
                      <Reply className="size-3.5" />
                    </button>

                    {/* Copy Text Button */}
                    {msg.text && (
                      <button
                        type="button"
                        onClick={() => handleCopyMessageText(msg.text)}
                        className="size-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Copy Text"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    )}

                    {/* Delete Message (Sender Only) */}
                    {isMe && (
                      <button
                        type="button"
                        onClick={() => setMessageToDelete(msg)}
                        className="size-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        title="Delete Message"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Bubble Container */}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 text-sm shadow-xs leading-relaxed transition-all relative ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-xs"
                        : "bg-muted/90 text-foreground border border-border/60 rounded-bl-xs"
                    }`}
                  >
                    {/* Replied Message Preview Header */}
                    {msg.reply_to && (
                      <div
                        onClick={() => scrollToMessage(msg.reply_to!.id)}
                        className={`mb-2 p-2 rounded-xl text-xs cursor-pointer border-l-2 transition-opacity hover:opacity-85 ${
                          isMe
                            ? "bg-black/15 border-white/80 text-white/90"
                            : "bg-background/80 border-primary text-muted-foreground"
                        }`}
                      >
                        <p className="font-bold truncate text-[11px] mb-0.5">
                          {msg.reply_to.sender_name}
                        </p>
                        <p className="truncate text-[11px] opacity-90">
                          {msg.reply_to.text}
                        </p>
                      </div>
                    )}

                    {/* Attached Images (with In-App Lightbox click) */}
                    {msg.images && msg.images.length > 0 && (
                      <div
                        className={`grid gap-1.5 mb-2 rounded-xl overflow-hidden ${
                          msg.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                        }`}
                      >
                        {msg.images.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setLightboxImages(msg.images || [imgUrl]);
                              setLightboxIndex(idx);
                              setLightboxOpen(true);
                            }}
                            className="block rounded-lg overflow-hidden bg-black/10 hover:opacity-90 transition-opacity max-h-64 max-w-full cursor-zoom-in"
                          >
                            <img
                              src={imgUrl}
                              alt="Attachment"
                              onLoad={() => scrollToBottom("instant")}
                              className="size-full max-h-64 object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Voice Note Waveform Audio Player */}
                    {msg.audio_url && (
                      <div className="my-1">
                        <AudioWaveformPlayer
                          src={msg.audio_url}
                          duration={msg.audio_duration}
                          isMe={isMe}
                        />
                      </div>
                    )}

                    {/* Shared Post / Blog / Video Card */}
                    {msg.shared_data && (
                      <div className="my-1">
                        <SharedContentCard data={msg.shared_data} isMe={isMe} />
                      </div>
                    )}

                    {/* Message Text (with rich links / mentions / hashtags) */}
                    {msg.text && (
                      <div className="whitespace-pre-wrap break-words leading-relaxed">
                        {renderMessageContent(msg.text, router, isMe)}
                      </div>
                    )}

                    {/* Embedded Video (YouTube / Instagram / Direct) */}
                    {msg.text && (
                      <div className="mt-1.5">
                        <VideoEmbed content={msg.text} />
                      </div>
                    )}

                    {/* Link Preview Card (Websites / Pinterest) */}
                    {msg.text && (
                      <div className="mt-1.5">
                        <LinkPreviewCard content={msg.text} />
                      </div>
                    )}
                  </div>

                  {/* Reaction Badges Pills */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div
                      className={`flex items-center gap-1 mt-1 flex-wrap ${
                        isMe ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.reactions.map((reaction, rIdx) => (
                        <button
                          key={rIdx}
                          type="button"
                          onClick={() => handleToggleReaction(msg.id, reaction.emoji)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                            reaction.has_reacted
                              ? "bg-primary/15 border-primary/40 text-primary shadow-2xs scale-105"
                              : "bg-card/80 border-border/80 text-foreground hover:bg-muted"
                          }`}
                          title={
                            reaction.has_reacted
                              ? "You reacted (click to remove)"
                              : "Click to react"
                          }
                        >
                          <span>{reaction.emoji}</span>
                          <span className="text-[10px] font-bold">
                            {reaction.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Metadata: Time & Seen Status */}
                  <div
                    className={`flex items-center gap-1 mt-1 text-[10px] text-muted-foreground px-1 ${
                      isMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span>{msg.created_at_human || ""}</span>
                    {isMe && (
                      <span title={msg.is_seen ? "Seen" : "Delivered"}>
                        {msg.is_seen ? (
                          <CheckCheck className="size-3 text-sky-500" />
                        ) : (
                          <Check className="size-3 text-muted-foreground" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator bubble */}
        {isOtherTyping && (
          <div className="flex items-center gap-2 py-1 animate-in fade-in duration-200">
            <Avatar className="size-6 ring-1 ring-border/40">
              <AvatarImage src={avatarSrc} alt={otherUser?.name || "User"} />
              <AvatarFallback className="text-[9px] font-bold">
                {getInitials(otherUser?.name || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted/80 border border-border/60 rounded-2xl rounded-bl-xs px-3 py-2 flex items-center gap-1.5 shadow-2xs">
              <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="size-1.5 rounded-full bg-primary animate-bounce" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Floating Scroll to Bottom Button ── */}
      {showScrollBottomButton && (
        <button
          type="button"
          onClick={() => {
            scrollToBottom("smooth");
            setShowScrollBottomButton(false);
            setNewMessagesWhileScrolled(0);
          }}
          className="absolute bottom-20 right-4 sm:right-6 z-30 size-10 rounded-full bg-card/95 backdrop-blur-md border border-border/80 shadow-xl flex items-center justify-center text-foreground hover:bg-muted hover:scale-105 active:scale-95 transition-all animate-in fade-in zoom-in-90 cursor-pointer ring-1 ring-primary/20"
          title="Scroll to latest messages"
        >
          <ChevronDown className="size-5" />
          {newMessagesWhileScrolled > 0 && (
            <span className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-xs animate-bounce">
              {newMessagesWhileScrolled}
            </span>
          )}
        </button>
      )}

      {/* ── Follow Warning Banner (if user doesn't follow recipient) ── */}
      {!isFollowing && (
        <div className="bg-amber-500/10 border-t border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-600 dark:text-amber-400">
          <div className="flex items-center gap-2">
            <Info className="size-4 shrink-0" />
            <span>
              You must follow <strong>@{otherUser?.username}</strong> to send them messages.
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleFollowUser}
            disabled={followingLoading}
            className="h-7 px-3 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shrink-0"
          >
            {followingLoading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              "Follow"
            )}
          </Button>
        </div>
      )}

      {/* ── Image Previews Bar ── */}
      {filePreviews.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border-t border-border/50 overflow-x-auto">
          {filePreviews.map((url, i) => (
            <div key={i} className="relative size-16 rounded-xl overflow-hidden ring-1 ring-border shrink-0">
              <img src={url} alt="preview" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 size-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Chat Input Footer ── */}
      <div className="p-3 bg-background border-t border-border/60 shrink-0 relative">
        {/* Reply Preview Bar */}
        {replyingTo && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-muted/70 rounded-xl mb-2 border border-border/60 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2 min-w-0">
              <Reply className="size-3.5 text-primary shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-foreground">
                  Replying to{" "}
                  {Number(replyingTo.sender_id) === Number(currentUser?.id)
                    ? "yourself"
                    : replyingTo.sender?.name || otherUser?.name || "User"}
                  :
                </span>{" "}
                <span className="text-muted-foreground truncate">
                  {replyingTo.text || (replyingTo.images?.length ? "📷 Image" : "")}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Quick Emoji Popover */}
        {emojiOpen && (
          <div
            ref={emojiPickerRef}
            className="absolute bottom-16 left-4 z-40 bg-card border border-border rounded-2xl p-2.5 shadow-xl grid grid-cols-5 gap-1.5 w-60 animate-in fade-in zoom-in-95 duration-150"
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setMessageText((prev) => prev + emoji);
                  setEmojiOpen(false);
                  textareaRef.current?.focus();
                }}
                className="size-9 rounded-xl hover:bg-muted flex items-center justify-center text-lg transition-transform hover:scale-110 active:scale-90"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 max-w-4xl mx-auto"
        >
          {/* Attachment Input (Hidden) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Attachment Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isFollowing || sending}
            className="size-9 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
            title="Attach images"
          >
            <ImageIcon className="size-5" />
          </Button>

          {/* Emoji Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEmojiOpen((prev) => !prev)}
            disabled={!isFollowing || sending}
            className="size-9 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
            title="Add emoji"
          >
            <Smile className="size-5" />
          </Button>

          {/* Text Input */}
          <Input
            ref={textareaRef}
            type="text"
            value={messageText}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              !isFollowing
                ? "Follow to send messages..."
                : replyingTo
                ? "Write a reply..."
                : "Type a message..."
            }
            disabled={!isFollowing || sending}
            className="flex-1 h-10 rounded-2xl bg-muted/50 border-border/70 text-sm focus:bg-background"
          />

          {/* Send Button or Voice Recorder */}
          {messageText.trim() || selectedFiles.length > 0 ? (
            <Button
              type="submit"
              disabled={!isFollowing || sending}
              className="size-10 p-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs shrink-0 cursor-pointer"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          ) : (
            <VoiceRecorder
              onSend={handleSendVoiceNote}
              disabled={!isFollowing || sending}
            />
          )}
        </form>
      </div>

      {/* ── Dialog: Account Info ── */}
      {otherUser && (
        <AccountInfoDialog
          open={accountInfoOpen}
          onOpenChange={setAccountInfoOpen}
          user={otherUser as any}
        />
      )}

      {/* ── Dialog: Image Lightbox Preview ── */}
      <ImageLightbox
        open={lightboxOpen}
        images={lightboxImages}
        index={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
      />

      {/* ── Dialog: Confirm Delete Message ── */}
      <AlertDialog
        open={!!messageToDelete}
        onOpenChange={(open) => !open && setMessageToDelete(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be deleted for everyone in this conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => messageToDelete && handleDeleteSingleMessage(messageToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-bold"
            >
              Delete for everyone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialog: Confirm Delete Entire Conversation ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-bold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
