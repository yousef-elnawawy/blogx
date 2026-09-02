"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
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
  Clock,
  X,
  MessageCircle,
  Loader2,
  Trash2,
  ExternalLink,
  Reply,
  Copy,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Search,
  Pin,
  Star,
  Pencil,
  FileText,
  Video,
  Paperclip,
  Tag,
  FolderOpen,
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
import PinnedMessageBanner from "@/components/messages/PinnedMessageBanner";
import ContactNicknameDialog from "@/components/messages/ContactNicknameDialog";
import SharedMediaDrawer from "@/components/messages/SharedMediaDrawer";
import ChatFileCard from "@/components/messages/ChatFileCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { motion, AnimatePresence } from "motion/react";

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

function formatMessageTime(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

function renderMessageContent(text: string, router: any, isMe: boolean) {
  if (!text) return null;

  const tokenRegex = /(https?:\/\/[^\s<>"'{}|\\^`]+)|(@[a-zA-Z0-9_]+)|(#[^\s#]+)|(\b\d{1,2}:\d{2}(?::\d{2})?\b)/gu;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(token)) {
      const seconds = parseTimeToSeconds(token);
      parts.push(
        <button
          key={match.index}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("blogx-video-seek", { detail: { time: seconds } }));
          }}
          className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded font-mono text-[11px] font-bold cursor-pointer transition-colors ${
            isMe
              ? "bg-black/20 hover:bg-black/30 text-primary-foreground"
              : "bg-primary/15 hover:bg-primary/25 text-primary"
          }`}
          title={`Jump to ${token}`}
        >
          <span className="text-[9px]">▶</span>
          <span>{token}</span>
        </button>
      );
    } else if (token.startsWith("http://") || token.startsWith("https://")) {
      const isInternal = typeof window !== "undefined" && token.startsWith(window.location.origin);
      parts.push(
        <a
          key={match.index}
          href={token}
          target={isInternal ? undefined : "_blank"}
          rel={isInternal ? undefined : "noopener noreferrer"}
          onClick={(e) => {
            e.stopPropagation();
            if (isInternal) {
              e.preventDefault();
              const urlObj = new URL(token);
              router.push(urlObj.pathname + urlObj.search);
            }
          }}
          className={`underline font-bold break-all hover:opacity-85 ${
            isMe ? "text-primary-foreground underline decoration-primary-foreground/60" : "text-primary underline decoration-primary/60"
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
          className={`font-bold cursor-pointer hover:underline ${
            isMe ? "text-primary-foreground" : "text-primary"
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
          className={`font-bold cursor-pointer hover:underline ${
            isMe ? "text-primary-foreground" : "text-primary"
          }`}
        >
          {token}
        </span>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

export default function ConversationDetailPage() {
  const params = useParams();
  const convId = params.id as string;
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const [conversation, setConversation] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<File | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true);
  const [followingLoading, setFollowingLoading] = useState(false);

  // Message reply target
  const [replyingTo, setReplyingTo] = useState<DirectMessage | null>(null);

  // Message inline editing
  const [editingMessage, setEditingMessage] = useState<DirectMessage | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingLoading, setEditingLoading] = useState(false);

  // In-conversation search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Typing state
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const otherTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const myTypingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMyTypingRef = useRef(false);

  // Scroll to bottom floating button
  const [showScrollBottomButton, setShowScrollBottomButton] = useState(false);
  const [newMessagesWhileScrolled, setNewMessagesWhileScrolled] = useState(0);

  // Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Highlight message on scroll / search jump
  const [highlightedMsgId, setHighlightedMsgId] = useState<number | null>(null);

  // Dialogs
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [accountInfoOpen, setAccountInfoOpen] = useState(false);
  const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false);
  const [sharedMediaOpen, setSharedMediaOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<DirectMessage | null>(null);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<number | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLInputElement>(null);
  const isInitialLoadedRef = useRef(false);
  const [isScrollReady, setIsScrollReady] = useState(false);

  const otherUser = conversation?.user;
  const otherDisplayName = otherUser?.display_name || otherUser?.custom_nickname || otherUser?.name || "User";

  // Dynamic document title
  useEffect(() => {
    if (otherDisplayName) {
      document.title = `Chat with ${otherDisplayName} / BlogX`;
    } else {
      document.title = "Conversation / BlogX";
    }
  }, [otherDisplayName]);

  // Scroll helper
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "instant") => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (behavior === "smooth") {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // Fetch Conversation Data
  const loadConversation = useCallback(async () => {
    if (!convId) return;
    try {
      setLoading(true);
      isInitialLoadedRef.current = false;
      setIsScrollReady(false);
      const data = await messagesService.getConversation(convId, { limit: 30 });
      setConversation(data.conversation);
      setMessages(data.messages || []);
      setHasMore(Boolean(data.has_more));
      setIsFollowing(data.is_following);
    } catch (err: any) {
      console.error("Failed to load conversation:", err);
      toast.error(err.response?.data?.message || "Failed to load conversation.");
    } finally {
      setLoading(false);
    }
  }, [convId]);

  const isPaginatingRef = useRef(false);
  const scrollOffsetRef = useRef<{ oldScrollHeight: number; oldScrollTop: number }>({
    oldScrollHeight: 0,
    oldScrollTop: 0,
  });

  // ── Master layout effect: runs synchronously before every paint ──
  // Handles BOTH initial scroll-to-bottom AND pagination scroll-restoration.
  // This prevents any flash of content at the wrong scroll position.
  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || messages.length === 0) return;

    if (isPaginatingRef.current) {
      // Restore scroll after prepending older messages
      const { oldScrollHeight, oldScrollTop } = scrollOffsetRef.current;
      container.scrollTop = container.scrollHeight - oldScrollHeight + oldScrollTop;
      isPaginatingRef.current = false;
    } else if (!isInitialLoadedRef.current && !loading) {
      // Initial load: jump to bottom before paint so user never sees top
      container.scrollTop = container.scrollHeight;
      isInitialLoadedRef.current = true;
      setIsScrollReady(true);
    }
  }, [messages, loading]);

  // Load older messages on scroll up
  const loadOlderMessages = useCallback(async () => {
    if (!hasMore || loadingMore || messages.length === 0 || !convId || !isInitialLoadedRef.current) return;
    const container = messagesContainerRef.current;
    if (!container) return;

    const oldestMsgId = messages[0]?.id;

    try {
      setLoadingMore(true);
      const data = await messagesService.getConversation(convId, {
        before_id: oldestMsgId,
        limit: 25,
      });

      if (data.messages && data.messages.length > 0) {
        scrollOffsetRef.current = {
          oldScrollHeight: container.scrollHeight,
          oldScrollTop: container.scrollTop,
        };
        isPaginatingRef.current = true;

        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const filteredOld = data.messages.filter((m) => !existingIds.has(m.id));
          return [...filteredOld, ...prev];
        });
        setHasMore(Boolean(data.has_more));
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, messages, convId]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container || !isInitialLoadedRef.current) return;

    if (container.scrollTop <= 60 && hasMore && !loadingMore) {
      loadOlderMessages();
    }

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

  // Real-time Echo listeners
  useEffect(() => {
    if (!currentUser || !convId) return;

    const echo = getEcho();
    if (!echo) return;

    const convChannel = echo.private(`conversation.${convId}`);

    convChannel.listen(".NewMessage", (data: any) => {
      if (data.message) {
        const newMsg: DirectMessage = data.message;
        setMessages((prev) => {
          if (prev.some((m) => Number(m.id) === Number(newMsg.id))) {
            return prev.map((m) =>
              Number(m.id) === Number(newMsg.id) ? { ...newMsg, is_pending: false } : m
            );
          }

          if (Number(newMsg.sender_id) === Number(currentUser.id)) {
            const pendingIndex = prev.findIndex((m) => m.is_pending || Number(m.id) < 0);
            if (pendingIndex !== -1) {
              const updated = [...prev];
              updated[pendingIndex] = { ...newMsg, is_pending: false };
              return updated;
            }
          }

          return [...prev, newMsg];
        });

        setIsOtherTyping(false);

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

        if (Number(newMsg.sender_id) !== Number(currentUser.id)) {
          messagesService.markAsRead(convId).catch(() => {});
        }
      }
    });

    convChannel.listen(".MessageUpdated", (data: any) => {
      if (data.message) {
        setMessages((prev) =>
          prev.map((m) =>
            Number(m.id) === Number(data.message.id)
              ? { ...m, ...data.message }
              : m
          )
        );
      }
    });

    convChannel.listen(".ConversationPinnedUpdated", (data: any) => {
      setConversation((prev) =>
        prev
          ? {
              ...prev,
              pinned_message: data.pinned_message || null,
            }
          : null
      );
    });

    convChannel.listen(".MessageDeleted", (data: any) => {
      if (data.message_id) {
        setMessages((prev) =>
          prev.filter((m) => Number(m.id) !== Number(data.message_id))
        );
      }
    });

    convChannel.listen(".MessageSeen", () => {
      setMessages((prev) =>
        prev.map((m) => ({
          ...m,
          is_seen: true,
        }))
      );
    });

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
      convChannel.stopListening(".MessageUpdated");
      convChannel.stopListening(".ConversationPinnedUpdated");
      convChannel.stopListening(".MessageDeleted");
      convChannel.stopListening(".MessageSeen");
      convChannel.stopListening(".UserTyping");
      convChannel.stopListening(".MessageReactionUpdated");
      if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
    };
  }, [currentUser, convId, scrollToBottom]);

  // Typing trigger helper
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);

    if (!isMyTypingRef.current) {
      isMyTypingRef.current = true;
      messagesService.sendTyping(convId, true).catch(() => {});
    }

    if (myTypingTimerRef.current) {
      clearTimeout(myTypingTimerRef.current);
    }

    myTypingTimerRef.current = setTimeout(() => {
      isMyTypingRef.current = false;
      messagesService.sendTyping(convId, false).catch(() => {});
    }, 2500);
  };

  // Attachments Handlers
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newFiles = [...selectedFiles, ...files].slice(0, 5);
    setSelectedFiles(newFiles);
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setFilePreviews(newPreviews);
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedVideo(file);
    }
  };

  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedDoc(file);
    }
  };

  const removeImage = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    const updatedPreviews = filePreviews.filter((_, i) => i !== index);
    setFilePreviews(updatedPreviews);
  };

  // Follow User
  const handleFollowUser = async () => {
    if (!otherUser?.id) return;
    try {
      setFollowingLoading(true);
      await api.post(`/api/users/${otherUser.id}/follow`);
      setIsFollowing(true);
      toast.success(`You are now following ${otherDisplayName}`);
    } catch {
      toast.error("Failed to follow user.");
    } finally {
      setFollowingLoading(false);
    }
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const textToSend = messageText.trim();
    if (!textToSend && selectedFiles.length === 0 && !selectedVideo && !selectedDoc) return;
    if (!currentUser || !convId) return;

    if (myTypingTimerRef.current) clearTimeout(myTypingTimerRef.current);
    if (isMyTypingRef.current) {
      isMyTypingRef.current = false;
      messagesService.sendTyping(convId, false).catch(() => {});
    }

    const tempId = -Date.now();
    const optimisticMessage: DirectMessage = {
      id: tempId,
      conversation_id: Number(convId),
      sender_id: currentUser.id,
      recipient_id: otherUser?.id || 0,
      reply_to_id: replyingTo?.id || null,
      reply_to: replyingTo
        ? {
            id: replyingTo.id,
            sender_id: replyingTo.sender_id,
            sender_name: replyingTo.sender?.display_name || replyingTo.sender?.name || "User",
            text: replyingTo.text || "",
          }
        : null,
      text: textToSend,
      images: filePreviews.length > 0 ? [...filePreviews] : undefined,
      video_url: selectedVideo ? URL.createObjectURL(selectedVideo) : null,
      file_url: selectedDoc ? URL.createObjectURL(selectedDoc) : null,
      file_name: selectedDoc?.name || null,
      file_size: selectedDoc?.size || null,
      file_type: selectedDoc?.name?.split(".").pop() || null,
      reactions: [],
      is_seen: false,
      created_at: new Date().toISOString(),
      created_at_human: "Just now",
      is_pending: true,
      can_edit: true,
      sender: {
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.username,
        avatar: currentUser.avatar,
        verified: currentUser.verified || false,
      },
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setMessageText("");
    const filesToSend = [...selectedFiles];
    const videoToSend = selectedVideo;
    const docToSend = selectedDoc;
    const replyTarget = replyingTo;

    setSelectedFiles([]);
    setFilePreviews([]);
    setSelectedVideo(null);
    setSelectedDoc(null);
    setReplyingTo(null);
    setEmojiOpen(false);

    requestAnimationFrame(() => scrollToBottom("smooth"));

    try {
      setSending(true);
      const res = await messagesService.sendMessage(convId, {
        text: textToSend || undefined,
        images: filesToSend.length > 0 ? filesToSend : undefined,
        video: videoToSend || undefined,
        file: docToSend || undefined,
        reply_to_id: replyTarget?.id || undefined,
      });

      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...res.message, is_pending: false } : m))
      );

      if (res.conversation) {
        setConversation(res.conversation);
      }
    } catch (err: any) {
      console.error("Send message error:", err);
      toast.error(err.response?.data?.message || "Failed to send message.");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setMessageText(textToSend);
      setSelectedFiles(filesToSend);
      setSelectedVideo(videoToSend);
      setSelectedDoc(docToSend);
      setReplyingTo(replyTarget);
    } finally {
      setSending(false);
    }
  };

  // Send Voice Note
  const handleSendVoiceNote = async (audioBlob: Blob, duration: number) => {
    if (!currentUser || !convId) return;
    const tempId = -Date.now();
    const optimisticMessage: DirectMessage = {
      id: tempId,
      conversation_id: Number(convId),
      sender_id: currentUser.id,
      recipient_id: otherUser?.id || 0,
      text: "",
      audio_url: URL.createObjectURL(audioBlob),
      audio_duration: duration,
      reactions: [],
      is_seen: false,
      created_at: new Date().toISOString(),
      created_at_human: "Just now",
      is_pending: true,
      can_edit: false,
      sender: {
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.username,
        avatar: currentUser.avatar,
        verified: currentUser.verified || false,
      },
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    requestAnimationFrame(() => scrollToBottom("smooth"));

    try {
      setSending(true);
      const res = await messagesService.sendMessage(convId, {
        audio: audioBlob,
        audio_duration: duration,
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...res.message, is_pending: false } : m))
      );
      if (res.conversation) {
        setConversation(res.conversation);
      }
    } catch {
      toast.error("Failed to send voice note.");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // Edit Message
  const handleStartEdit = (msg: DirectMessage) => {
    setEditingMessage(msg);
    setEditingText(msg.text || "");
    setActiveMessageMenuId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingMessage) return;
    const trimmed = editingText.trim();
    if (!trimmed) {
      toast.error("Message text cannot be empty.");
      return;
    }

    try {
      setEditingLoading(true);
      const res = await messagesService.editMessage(editingMessage.id, trimmed);
      setMessages((prev) =>
        prev.map((m) => (m.id === editingMessage.id ? { ...m, ...res.message } : m))
      );
      toast.success("Message updated");
      setEditingMessage(null);
      setEditingText("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to edit message");
    } finally {
      setEditingLoading(false);
    }
  };

  // Toggle Star
  const handleToggleStar = async (msgId: number) => {
    try {
      const res = await messagesService.toggleStar(msgId);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, is_starred: res.is_starred } : m))
      );
      toast.success(res.is_starred ? "Message starred ⭐" : "Star removed");
    } catch {
      toast.error("Failed to star message");
    }
  };

  // Toggle Pin Message
  const handleTogglePinMessage = async (msgId: number) => {
    try {
      const res = await messagesService.togglePinMessage(convId, msgId);
      setConversation(res.conversation);
      toast.success(
        res.conversation.pinned_message?.id === msgId
          ? "Message pinned to top 📌"
          : "Message unpinned"
      );
    } catch {
      toast.error("Failed to pin message");
    }
  };

  // Reaction
  const handleToggleReaction = async (messageId: number, emoji: string) => {
    try {
      const res = await messagesService.toggleReaction(convId, messageId, emoji);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions: res.message.reactions } : m))
      );
    } catch {
      toast.error("Failed to update reaction.");
    }
  };

  // Delete message
  const handleDeleteMessage = async (msg: DirectMessage) => {
    try {
      await messagesService.deleteMessage(convId, msg.id);
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      toast.success("Message deleted");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete message");
    } finally {
      setMessageToDelete(null);
    }
  };

  // Scroll to Message
  const scrollToMessage = (messageId: number) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMsgId(messageId);
      setTimeout(() => setHighlightedMsgId(null), 2500);
    } else {
      toast.info("Message is further up in history.");
    }
  };

  // In-Chat Search Matches
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return messages
      .filter((m) => (m.text && m.text.toLowerCase().includes(q)) || (m.file_name && m.file_name.toLowerCase().includes(q)))
      .map((m) => m.id);
  }, [messages, searchQuery]);

  const handleSearchNavigate = (direction: "next" | "prev") => {
    if (searchMatches.length === 0) return;
    let nextIdx = direction === "next" ? currentMatchIndex + 1 : currentMatchIndex - 1;
    if (nextIdx >= searchMatches.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = searchMatches.length - 1;
    setCurrentMatchIndex(nextIdx);
    scrollToMessage(searchMatches[nextIdx]);
  };

  const avatarSrc = getAvatarUrl(otherUser?.avatar);

  return (
    <div className="flex flex-col h-screen max-h-[100dvh] bg-background relative overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-border/70 bg-card/80 backdrop-blur-md shrink-0 z-30 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/messages")}
            className="p-1.5 size-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowLeft className="size-5" />
          </Button>

          {/* User Profile Trigger */}
          <div
            onClick={() => setAccountInfoOpen(true)}
            className="flex items-center gap-2.5 cursor-pointer min-w-0 group"
          >
            <div className="relative shrink-0">
              <Avatar className="size-9 ring-1 ring-border group-hover:ring-primary transition-all">
                <AvatarImage src={avatarSrc} alt={otherDisplayName} />
                <AvatarFallback className="text-xs font-bold">
                  {getInitials(otherDisplayName)}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                  {otherDisplayName}
                </span>
                {otherUser?.verified && <VerifiedBadge size="sm" />}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                {otherUser?.custom_nickname && (
                  <span className="truncate">@{otherUser.username} •</span>
                )}
                <span>
                  {isOtherTyping ? (
                    <span className="text-primary font-bold animate-pulse">Typing...</span>
                  ) : otherUser?.last_seen ? (
                    `Active ${otherUser.last_seen}`
                  ) : (
                    `@${otherUser?.username || "user"}`
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Search Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchOpen(!searchOpen);
              if (!searchOpen) setCurrentMatchIndex(0);
            }}
            className={`size-8 p-0 rounded-full cursor-pointer transition-colors ${
              searchOpen ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Search in conversation"
          >
            <Search className="size-4" />
          </Button>

          {/* Shared Media & Files Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSharedMediaOpen(true)}
            className="size-8 p-0 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            title="Shared Media & Files"
          >
            <FolderOpen className="size-4" />
          </Button>

          {/* More Options Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <MoreVertical className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              <DropdownMenuItem
                onClick={() => setNicknameDialogOpen(true)}
                className="gap-2 text-xs font-semibold cursor-pointer"
              >
                <Tag className="size-3.5 text-primary" />
                <span>{otherUser?.custom_nickname ? "Edit Nickname" : "Set Nickname"}</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setSharedMediaOpen(true)}
                className="gap-2 text-xs font-semibold cursor-pointer"
              >
                <FolderOpen className="size-3.5" />
                <span>Shared Media & Links</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setAccountInfoOpen(true)}
                className="gap-2 text-xs font-semibold cursor-pointer"
              >
                <Info className="size-3.5" />
                <span>View Profile Info</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="gap-2 text-xs font-semibold text-destructive focus:text-destructive cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>Delete Conversation</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Search Bar Overlay ── */}
      {searchOpen && (
        <div className="bg-card/95 backdrop-blur-md border-b border-border px-4 py-2 flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2 duration-150 z-25 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search in chat..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentMatchIndex(0);
              }}
              autoFocus
              className="h-8 pl-8 pr-3 text-xs rounded-xl bg-muted/60"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {searchMatches.length > 0 ? (
              <span className="text-[11px] font-medium text-muted-foreground mr-1">
                {currentMatchIndex + 1} of {searchMatches.length}
              </span>
            ) : searchQuery.trim() ? (
              <span className="text-[11px] text-muted-foreground mr-1">No matches</span>
            ) : null}

            <Button
              variant="ghost"
              size="sm"
              disabled={searchMatches.length === 0}
              onClick={() => handleSearchNavigate("prev")}
              className="size-7 p-0 rounded-lg cursor-pointer"
              title="Previous match"
            >
              <ChevronUp className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={searchMatches.length === 0}
              onClick={() => handleSearchNavigate("next")}
              className="size-7 p-0 rounded-lg cursor-pointer"
              title="Next match"
            >
              <ChevronDown className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
              }}
              className="size-7 p-0 rounded-lg cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Pinned Message Banner ── */}
      {conversation?.pinned_message && (
        <PinnedMessageBanner
          pinnedMessage={conversation.pinned_message}
          onJumpToMessage={scrollToMessage}
          onUnpin={() => handleTogglePinMessage(conversation.pinned_message!.id)}
        />
      )}

      {/* ── Messages Area ── */}
      <div className="flex-1 min-h-0 relative overflow-hidden">

        {/* Loading overlay – shown until scroll is anchored at bottom */}
        {(!isScrollReady) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2 z-10 bg-background">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs">Loading conversation...</p>
          </div>
        )}

        {/* ── Messages Container ── always in DOM so ref + useLayoutEffect can scroll it */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          style={{ overflowAnchor: "none", visibility: isScrollReady ? "visible" : "hidden" }}
          className="absolute inset-0 overflow-y-auto p-3 sm:p-5 space-y-4 select-text"
        >
          {/* Loading More Spinner (pagination) */}
          {loadingMore && (
            <div className="flex justify-center py-2">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          )}

          {/* Empty chat state */}
          {!loading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12 text-muted-foreground">
            <Avatar className="size-16 mb-3 ring-2 ring-border/80 shadow-md">
              <AvatarImage src={avatarSrc} alt={otherDisplayName} />
              <AvatarFallback className="text-xl font-bold">
                {getInitials(otherDisplayName)}
              </AvatarFallback>
            </Avatar>
            <h3 className="font-bold text-base text-foreground mb-1">
              {otherDisplayName}
            </h3>
            <p className="text-xs max-w-xs mb-4">
              Send a direct message, voice note, or photo to start chatting with @{otherUser?.username}.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = Number(msg.sender_id) === Number(currentUser?.id);
            const isHighlighted = highlightedMsgId === msg.id;

            // Date separator check
            const currentDateKey = getMessageDateKey(msg.created_at);
            const prevDateKey =
              index > 0 ? getMessageDateKey(messages[index - 1]?.created_at) : "";
            const showDateHeader = currentDateKey !== prevDateKey;

            return (
              <motion.div
                key={`msg-${msg.id}-${index}`}
                id={`msg-${msg.id}`}
                initial={{ opacity: 0, x: isMe ? 20 : -20, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.8 }}
                className={`space-y-2 ${
                  isHighlighted ? "bg-primary/10 rounded-2xl p-2 ring-2 ring-primary/40" : ""
                }`}
              >
                {/* ── Date Divider ── */}
                {showDateHeader && (
                  <motion.div
                    className="flex justify-center my-4"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <span className="px-3 py-1 rounded-full bg-muted/80 backdrop-blur-sm border border-border/60 text-[11px] font-semibold text-muted-foreground shadow-2xs">
                      {formatMessageDateHeader(msg.created_at)}
                    </span>
                  </motion.div>
                )}

                {/* ── Message Bubble & Actions Wrapper ── */}
                <div
                  className={`flex flex-col ${
                    isMe ? "items-end" : "items-start"
                  } group relative`}
                  onMouseEnter={() => setActiveMessageMenuId(msg.id)}
                  onMouseLeave={() => setActiveMessageMenuId(null)}
                >
                  <div
                    className={`flex items-end gap-2 max-w-[88%] sm:max-w-[75%] md:max-w-[65%] ${
                      isMe ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* Other User Avatar */}
                    {!isMe && (
                      <Avatar className="size-7 ring-1 ring-border/50 shrink-0 mb-1">
                        <AvatarImage src={avatarSrc} alt={otherDisplayName} />
                        <AvatarFallback className="text-[10px] font-bold">
                          {getInitials(otherDisplayName)}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    {/* Message Bubble Container */}
                    <div
                      className={`relative rounded-2xl px-3.5 py-2.5 shadow-2xs text-sm break-words transition-all ${
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-xs"
                          : "bg-muted/90 text-foreground border border-border/60 rounded-bl-xs"
                      } ${msg.is_pending ? "opacity-70" : "opacity-100"}`}
                    >
                      {/* Replied Snippet */}
                      {msg.reply_to && (
                        <div
                          onClick={() => scrollToMessage(msg.reply_to!.id)}
                          className={`mb-2 p-2 rounded-xl text-xs cursor-pointer border-l-2 transition-opacity hover:opacity-85 ${
                            isMe
                              ? "bg-black/15 border-primary-foreground/80 text-primary-foreground/90"
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

                      {/* Attached Images */}
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
                                if (!msg.is_pending) {
                                  setLightboxImages(msg.images || [imgUrl]);
                                  setLightboxIndex(idx);
                                  setLightboxOpen(true);
                                }
                              }}
                              className="block rounded-lg overflow-hidden bg-black/10 hover:opacity-90 transition-opacity max-h-64 max-w-full cursor-zoom-in"
                            >
                              <img
                                src={imgUrl}
                                alt="Attachment"
                                loading="lazy"
                                className="size-full max-h-64 object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Attached Video */}
                      {msg.video_url && (
                        <div className="my-1.5 rounded-xl overflow-hidden max-w-xs sm:max-w-sm">
                          <video
                            src={msg.video_url}
                            controls
                            className="w-full rounded-xl max-h-64 bg-black"
                          />
                        </div>
                      )}

                      {/* Attached Document / File */}
                      {msg.file_url && (
                        <ChatFileCard
                          fileUrl={msg.file_url}
                          fileName={msg.file_name}
                          fileSize={msg.file_size}
                          fileType={msg.file_type}
                          isMe={isMe}
                        />
                      )}

                      {/* Voice Note Player */}
                      {msg.audio_url && (
                        <div className="my-1">
                          <AudioWaveformPlayer
                            src={msg.audio_url}
                            duration={msg.audio_duration}
                            isMe={isMe}
                          />
                        </div>
                      )}

                      {/* Shared Content Card */}
                      {msg.shared_data && (
                        <div className="my-1">
                          <SharedContentCard data={msg.shared_data} isMe={isMe} />
                        </div>
                      )}

                      {/* Message Text / Inline Edit Mode */}
                      {editingMessage?.id === msg.id ? (
                        <div className="space-y-2 py-1 min-w-[200px]">
                          <Input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveEdit();
                              } else if (e.key === "Escape") {
                                setEditingMessage(null);
                              }
                            }}
                            autoFocus
                            className="text-xs bg-background/90 text-foreground rounded-lg h-8"
                          />
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingMessage(null)}
                              className="h-6 px-2 text-[11px] rounded-md text-muted-foreground"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              disabled={editingLoading}
                              onClick={handleSaveEdit}
                              className="h-6 px-2 text-[11px] rounded-md font-bold"
                            >
                              {editingLoading ? <Loader2 className="size-3 animate-spin" /> : "Save"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        msg.text && (
                          <div className="whitespace-pre-wrap break-words leading-relaxed">
                            {renderMessageContent(msg.text, router, isMe)}
                          </div>
                        )
                      )}

                      {/* Video Embed */}
                      {msg.text && (
                        <div className="mt-1.5">
                          <VideoEmbed content={msg.text} />
                        </div>
                      )}

                      {/* Link Preview */}
                      {msg.text && (
                        <div className="mt-1.5">
                          <LinkPreviewCard content={msg.text} />
                        </div>
                      )}

                      {/* Bubble Footer: Time, Edited, Starred, Delivery Ticks */}
                      <div
                        className={`flex items-center gap-1 mt-0.5 text-[10px] select-none ${
                          isMe ? "justify-end text-primary-foreground/80 font-medium" : "justify-start text-muted-foreground"
                        }`}
                      >
                        {msg.is_starred && (
                          <Star className="size-2.5 fill-amber-400 text-amber-400 shrink-0" />
                        )}
                        {msg.is_edited && (
                          <span className="italic" title={`Edited ${msg.edited_at || ""}`}>
                            (edited)
                          </span>
                        )}
                        <span>{msg.is_pending ? "Sending..." : formatMessageTime(msg.created_at)}</span>
                        {isMe && (
                          <span title={msg.is_pending ? "Sending..." : msg.is_seen ? "Seen" : "Delivered"}>
                            {msg.is_pending ? (
                              <Clock className="size-2.5 animate-pulse text-primary-foreground/70" />
                            ) : msg.is_seen ? (
                              <CheckCheck className="size-3 text-sky-400 dark:text-sky-800" />
                            ) : (
                              <Check className="size-3 text-primary-foreground/75" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Hover Message Action Bar */}
                    <div
                      className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-card/90 backdrop-blur-md rounded-full px-1.5 py-0.5 border border-border shadow-xs shrink-0"
                    >
                      {/* Emoji React */}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <button
                              type="button"
                              className="size-6 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
                              title="React"
                            >
                              <Smile className="size-3.5" />
                            </button>
                          }
                        />
                        <DropdownMenuContent className="flex items-center gap-1 p-1 rounded-2xl min-w-0">
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className="size-7 hover:bg-muted rounded-xl flex items-center justify-center text-sm transition-transform hover:scale-125 active:scale-95"
                            >
                              {emoji}
                            </button>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Star Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleStar(msg.id)}
                        className={`size-6 rounded-full hover:bg-muted flex items-center justify-center cursor-pointer transition-colors ${
                          msg.is_starred ? "text-amber-500" : "text-muted-foreground hover:text-foreground"
                        }`}
                        title={msg.is_starred ? "Unstar" : "Star message"}
                      >
                        <Star className={`size-3.5 ${msg.is_starred ? "fill-amber-500" : ""}`} />
                      </button>

                      {/* Reply Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(msg);
                          textareaRef.current?.focus();
                        }}
                        className="size-6 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
                        title="Reply"
                      >
                        <Reply className="size-3.5" />
                      </button>

                      {/* Message Options Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <button
                              type="button"
                              className="size-6 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
                            >
                              <MoreVertical className="size-3.5" />
                            </button>
                          }
                        />
                        <DropdownMenuContent align={isMe ? "end" : "start"} className="w-44 rounded-xl">
                          {/* Copy Text */}
                          {msg.text && (
                            <DropdownMenuItem
                              onClick={() => {
                                navigator.clipboard.writeText(msg.text);
                                toast.success("Copied to clipboard");
                              }}
                              className="gap-2 text-xs cursor-pointer"
                            >
                              <Copy className="size-3.5" />
                              <span>Copy Text</span>
                            </DropdownMenuItem>
                          )}

                          {/* Pin Message */}
                          <DropdownMenuItem
                            onClick={() => handleTogglePinMessage(msg.id)}
                            className="gap-2 text-xs cursor-pointer"
                          >
                            <Pin className="size-3.5" />
                            <span>{conversation?.pinned_message?.id === msg.id ? "Unpin Message" : "Pin to Top"}</span>
                          </DropdownMenuItem>

                          {/* Edit Message (Sender + Within 15m) */}
                          {isMe && msg.can_edit && (
                            <DropdownMenuItem
                              onClick={() => handleStartEdit(msg)}
                              className="gap-2 text-xs cursor-pointer"
                            >
                              <Pencil className="size-3.5 text-primary" />
                              <span>Edit Message</span>
                            </DropdownMenuItem>
                          )}

                          {/* Delete Message (Sender only) */}
                          {isMe && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setMessageToDelete(msg)}
                                className="gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
                              >
                                <Trash2 className="size-3.5" />
                                <span>Delete Message</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
                        >
                          <span>{reaction.emoji}</span>
                          <span className="text-[10px] font-bold">
                            {reaction.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}

        {/* Typing indicator bubble */}
        <AnimatePresence>
          {isOtherTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="flex items-center gap-2 py-1"
            >
              <Avatar className="size-6 ring-1 ring-border/40">
                <AvatarImage src={avatarSrc} alt={otherDisplayName} />
                <AvatarFallback className="text-[9px] font-bold">
                  {getInitials(otherDisplayName)}
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted/80 border border-border/60 rounded-2xl rounded-bl-xs px-3 py-2 flex items-center gap-1.5 shadow-2xs">
                <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                <span className="size-1.5 rounded-full bg-primary animate-bounce" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>{/* end messages container */}
      </div>{/* end messages area wrapper */}

      {/* ── Scroll to Bottom Floating Button ── */}
      <AnimatePresence>
        {showScrollBottomButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 450, damping: 28 }}
            type="button"
            onClick={() => {
              scrollToBottom("smooth");
              setShowScrollBottomButton(false);
              setNewMessagesWhileScrolled(0);
            }}
            className="absolute bottom-20 right-4 sm:right-6 z-30 size-10 rounded-full bg-card/95 backdrop-blur-md border border-border/80 shadow-xl flex items-center justify-center text-foreground hover:bg-muted cursor-pointer ring-1 ring-primary/20"
            title="Scroll to latest messages"
          >
            <ChevronDown className="size-5" />
            {newMessagesWhileScrolled > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-xs"
              >
                {newMessagesWhileScrolled}
              </motion.span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Follow Warning Banner ── */}
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

      {/* ── Attachment Previews Bar ── */}
      {(filePreviews.length > 0 || selectedVideo || selectedDoc) && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border-t border-border/50 overflow-x-auto">
          {filePreviews.map((url, i) => (
            <div key={i} className="relative size-16 rounded-xl overflow-hidden ring-1 ring-border shrink-0">
              <img src={url} alt="preview" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 size-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}

          {selectedVideo && (
            <div className="relative px-3 py-2 bg-card rounded-xl border border-border flex items-center gap-2 shrink-0 text-xs">
              <Video className="size-4 text-primary" />
              <span className="truncate max-w-[120px] font-semibold">{selectedVideo.name}</span>
              <button
                type="button"
                onClick={() => setSelectedVideo(null)}
                className="size-4 rounded-full bg-muted flex items-center justify-center hover:bg-destructive hover:text-white"
              >
                <X className="size-3" />
              </button>
            </div>
          )}

          {selectedDoc && (
            <div className="relative px-3 py-2 bg-card rounded-xl border border-border flex items-center gap-2 shrink-0 text-xs">
              <FileText className="size-4 text-primary" />
              <span className="truncate max-w-[120px] font-semibold">{selectedDoc.name}</span>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="size-4 rounded-full bg-muted flex items-center justify-center hover:bg-destructive hover:text-white"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
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
                    : replyingTo.sender?.display_name || replyingTo.sender?.name || "User"}
                  :
                </span>{" "}
                <span className="text-muted-foreground truncate">
                  {replyingTo.text || (replyingTo.images?.length ? "📷 Photo" : replyingTo.file_name ? "📎 File" : "")}
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
          {/* Hidden File Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoSelect}
          />
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
            className="hidden"
            onChange={handleDocSelect}
          />

          {/* Attachments Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!isFollowing || sending}
                  className="size-9 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 cursor-pointer"
                  title="Attach Media or Documents"
                >
                  <Paperclip className="size-5" />
                </Button>
              }
            />
            <DropdownMenuContent align="start" className="w-48 rounded-xl">
              <DropdownMenuItem
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 text-xs font-semibold cursor-pointer"
              >
                <ImageIcon className="size-4 text-emerald-500" />
                <span>Photos / Images</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => videoInputRef.current?.click()}
                className="gap-2 text-xs font-semibold cursor-pointer"
              >
                <Video className="size-4 text-blue-500" />
                <span>Video File</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => docInputRef.current?.click()}
                className="gap-2 text-xs font-semibold cursor-pointer"
              >
                <FileText className="size-4 text-amber-500" />
                <span>Document / PDF</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Emoji Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEmojiOpen((prev) => !prev)}
            disabled={!isFollowing || sending}
            className="size-9 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 cursor-pointer"
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
                ? "Follow this user to send a message..."
                : "Type a message..."
            }
            disabled={!isFollowing || sending}
            className="flex-1 rounded-2xl h-10 text-sm bg-muted/60 border-border/80 focus-visible:ring-primary focus-visible:bg-background transition-colors"
          />

          {/* Voice Recorder button (if empty text) or Send button */}
          {!messageText.trim() && selectedFiles.length === 0 && !selectedVideo && !selectedDoc ? (
            <VoiceRecorder
              onSend={handleSendVoiceNote}
              disabled={!isFollowing || sending}
            />
          ) : (
            <Button
              type="submit"
              size="sm"
              disabled={
                (!messageText.trim() && selectedFiles.length === 0 && !selectedVideo && !selectedDoc) ||
                !isFollowing ||
                sending
              }
              className="size-10 rounded-full p-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shrink-0 active:scale-95 transition-transform cursor-pointer"
              title="Send Message"
            >
              {sending ? (
                <Loader2 className="size-4.5 animate-spin" />
              ) : (
                <Send className="size-4.5" />
              )}
            </Button>
          )}
        </form>
      </div>

      {/* ── Dialogs ── */}
      {otherUser && (
        <>
          <AccountInfoDialog
            open={accountInfoOpen}
            onOpenChange={setAccountInfoOpen}
            user={{
              id: otherUser.id,
              name: otherDisplayName,
              username: otherUser.username,
              avatar: otherUser.avatar,
              cover: otherUser.cover,
              bio: otherUser.bio,
              location: otherUser.location,
              website: otherUser.website,
              verified: otherUser.verified,
              created_at: otherUser.created_at,
              followers_count: otherUser.followers_count,
              following_count: otherUser.following_count,
              posts_count: otherUser.posts_count,
            }}
          />

          <ContactNicknameDialog
            open={nicknameDialogOpen}
            onOpenChange={setNicknameDialogOpen}
            userId={otherUser.id}
            userName={otherUser.name}
            userUsername={otherUser.username}
            initialNickname={otherUser.custom_nickname}
            onNicknameUpdated={(nickname, displayName) => {
              setConversation((prev) =>
                prev && prev.user
                  ? {
                      ...prev,
                      user: {
                        ...prev.user,
                        custom_nickname: nickname,
                        display_name: displayName,
                      },
                    }
                  : prev
              );
            }}
          />

          <SharedMediaDrawer
            open={sharedMediaOpen}
            onOpenChange={setSharedMediaOpen}
            conversationId={convId}
            userName={otherDisplayName}
          />
        </>
      )}

      {/* Lightbox for message images */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Delete Single Message Confirmation */}
      <AlertDialog
        open={Boolean(messageToDelete)}
        onOpenChange={(open) => !open && setMessageToDelete(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">
              Delete message?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will permanently delete this message for everyone in the chat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => messageToDelete && handleDeleteMessage(messageToDelete)}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Conversation Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">
              Delete entire conversation?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will delete the conversation and all messages for you. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await messagesService.deleteConversation(convId);
                  toast.success("Conversation deleted");
                  router.push("/messages");
                } catch {
                  toast.error("Failed to delete conversation");
                }
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs rounded-xl"
            >
              Delete Conversation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
