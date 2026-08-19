"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  Plus,
  Send,
  Image as ImageIcon,
  Smile,
  Mic,
  Phone,
  Video,
  Info,
  MoreVertical,
  ArrowLeft,
  Check,
  CheckCheck,
  Paperclip,
  Sparkles,
  User,
  MessageCircle,
  Clock,
  Circle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { getAvatarUrl, getInitials } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface MockMessage {
  id: string | number;
  sender_id: string | number;
  text: string;
  image?: string;
  created_at: string;
  is_seen?: boolean;
}

interface MockConversation {
  id: string | number;
  user: {
    id: number;
    name: string;
    username: string;
    avatar: string | null;
    verified: boolean;
    is_online: boolean;
    last_seen: string;
  };
  last_message: {
    text: string;
    created_at: string;
    is_seen: boolean;
    sender_id: number;
  };
  unread_count: number;
  messages: MockMessage[];
}

const INITIAL_CONVERSATIONS: MockConversation[] = [
  {
    id: 1,
    user: {
      id: 101,
      name: "سارة أحمد",
      username: "sara_tech",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      verified: true,
      is_online: true,
      last_seen: "Active now",
    },
    last_message: {
      text: "قرأت مقالك الأخير عن الذكاء الاصطناعي، رائع جداً ومبسط! 🚀",
      created_at: "5m ago",
      is_seen: false,
      sender_id: 101,
    },
    unread_count: 2,
    messages: [
      {
        id: 1,
        sender_id: 101,
        text: "مرحباً! كيف حالك؟",
        created_at: "10:30 AM",
        is_seen: true,
      },
      {
        id: 2,
        sender_id: 0, // current user
        text: "أهلاً سارة! الحمد لله بخير، كيف تسير مشاريعك؟",
        created_at: "10:32 AM",
        is_seen: true,
      },
      {
        id: 3,
        sender_id: 101,
        text: "قرأت مقالك الأخير عن الذكاء الاصطناعي، رائع جداً ومبسط! 🚀",
        created_at: "10:35 AM",
        is_seen: false,
      },
    ],
  },
  {
    id: 2,
    user: {
      id: 102,
      name: "عمر خالد",
      username: "omarkhaled",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      verified: true,
      is_online: false,
      last_seen: "Last seen 2h ago",
    },
    last_message: {
      text: "تمام، هراجع الكود وأرد عليك في أقرب وقت.",
      created_at: "2h ago",
      is_seen: true,
      sender_id: 102,
    },
    unread_count: 0,
    messages: [
      {
        id: 1,
        sender_id: 0,
        text: "السلام عليكم يا عمر، هل اطلعت على تصميم المنتديات الجديد؟",
        created_at: "Yesterday",
        is_seen: true,
      },
      {
        id: 2,
        sender_id: 102,
        text: "تمام، هراجع الكود وأرد عليك في أقرب وقت.",
        created_at: "Yesterday",
        is_seen: true,
      },
    ],
  },
  {
    id: 3,
    user: {
      id: 103,
      name: "ليلى حسن",
      username: "layla_design",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      verified: false,
      is_online: true,
      last_seen: "Active now",
    },
    last_message: {
      text: "شكراً جزيلاً على الدعم والنصائح الجميلة!",
      created_at: "1d ago",
      is_seen: true,
      sender_id: 0,
    },
    unread_count: 0,
    messages: [
      {
        id: 1,
        sender_id: 103,
        text: "أعجبني جداً الخط والتنسيق الجديد في الموقع.",
        created_at: "2 days ago",
        is_seen: true,
      },
      {
        id: 2,
        sender_id: 0,
        text: "شكراً جزيلاً على الدعم والنصائح الجميلة!",
        created_at: "1 day ago",
        is_seen: true,
      },
    ],
  },
];

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<MockConversation[]>(INITIAL_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<number | string | null>(1);
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConv) return;

    const newMsg: MockMessage = {
      id: Date.now(),
      sender_id: 0, // current user
      text: messageText.trim(),
      created_at: "Just now",
      is_seen: false,
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConv.id) {
          return {
            ...c,
            last_message: {
              text: newMsg.text,
              created_at: "Just now",
              is_seen: true,
              sender_id: 0,
            },
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );

    setMessageText("");

    // Simulated interactive reply after 1.5s
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const replyMsg: MockMessage = {
          id: Date.now() + 1,
          sender_id: activeConv.user.id,
          text: "أهلاً بك! تم استلام رسالتك، شكراً لتواصلك الرائع ✨",
          created_at: "Just now",
          is_seen: true,
        };
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeConv.id) {
              return {
                ...c,
                last_message: {
                  text: replyMsg.text,
                  created_at: "Just now",
                  is_seen: false,
                  sender_id: activeConv.user.id,
                },
                messages: [...c.messages, replyMsg],
              };
            }
            return c;
          })
        );
      }, 2000);
    }, 1000);
  };

  const filteredConversations = conversations.filter((c) =>
    c.user.name.toLowerCase().includes(search.toLowerCase()) ||
    c.user.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-60px)] sm:h-[calc(100vh-64px)] flex overflow-hidden border-x border-border/80 bg-card/40">
      
      {/* ── Left Column: Inbox / Conversation List ── */}
      <div
        className={`w-full sm:w-80 md:w-96 border-r border-border/80 bg-card flex flex-col shrink-0 ${
          activeConvId ? "hidden sm:flex" : "flex"
        }`}
      >
        {/* Inbox Header */}
        <div className="p-4 border-b border-border/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <MessageCircle className="size-4.5" />
            </div>
            <h1 className="text-base font-bold text-foreground">Messages</h1>
          </div>

          <Button
            size="sm"
            onClick={() => toast.info("Start a new chat by selecting any user from their profile!")}
            className="rounded-full size-8 p-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
          >
            <Plus className="size-4" />
          </Button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-border/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Direct Messages..."
              className="pl-9 rounded-2xl border-border bg-background text-xs h-8.5"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {filteredConversations.map((conv) => {
            const isSelected = activeConvId === conv.id;
            const avatarSrc = getAvatarUrl(conv.user.avatar);

            return (
              <div
                key={conv.id}
                onClick={() => {
                  setActiveConvId(conv.id);
                  // Mark as read locally
                  setConversations((prev) =>
                    prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
                  );
                }}
                className={`p-3.5 flex items-center gap-3 transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-primary/10 border-l-3 border-l-primary"
                    : "hover:bg-muted/40"
                }`}
              >
                {/* Avatar with Online Indicator */}
                <div className="relative shrink-0">
                  <Avatar className="size-11 ring-1 ring-border/60">
                    <AvatarImage src={avatarSrc} alt={conv.user.name} />
                    <AvatarFallback className="text-xs font-bold bg-muted">
                      {getInitials(conv.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  {conv.user.is_online && (
                    <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-card" />
                  )}
                </div>

                {/* Info & Last message */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-xs font-bold text-foreground truncate">
                        {conv.user.name}
                      </span>
                      {conv.user.verified && <VerifiedBadge size="xs" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {conv.last_message.created_at}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate ${conv.unread_count > 0 ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                      {conv.last_message.text}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="size-4.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right Column: Active Chat Window ── */}
      {activeConv ? (
        <div
          className={`flex-1 flex flex-col bg-background ${
            activeConvId ? "flex" : "hidden sm:flex"
          }`}
        >
          {/* Active Chat Header */}
          <div className="p-3.5 sm:px-5 border-b border-border/70 bg-card/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setActiveConvId(null)}
                className="sm:hidden size-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
              >
                <ArrowLeft className="size-4" />
              </button>

              <div className="relative shrink-0">
                <Avatar className="size-10 ring-1 ring-border/60">
                  <AvatarImage src={getAvatarUrl(activeConv.user.avatar)} alt={activeConv.user.name} />
                  <AvatarFallback className="text-xs font-bold">
                    {getInitials(activeConv.user.name)}
                  </AvatarFallback>
                </Avatar>
                {activeConv.user.is_online && (
                  <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <h2 className="text-xs sm:text-sm font-bold text-foreground truncate">
                    {activeConv.user.name}
                  </h2>
                  {activeConv.user.verified && <VerifiedBadge size="xs" />}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {activeConv.user.is_online ? "Active now" : activeConv.user.last_seen}
                </p>
              </div>
            </div>

            {/* Header Action Mock Buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast.info("Voice call feature coming soon with WebRTC!")}
                className="size-8 p-0 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Phone className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast.info("Video call feature coming soon with WebRTC!")}
                className="size-8 p-0 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Video className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast.info(`Viewing @${activeConv.user.username} info`)}
                className="size-8 p-0 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Info className="size-4" />
              </Button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Top User Greeting Card */}
            <div className="py-6 flex flex-col items-center text-center space-y-2 border-b border-border/50 max-w-sm mx-auto mb-4">
              <Avatar className="size-16 ring-2 ring-border/80 shadow-md">
                <AvatarImage src={getAvatarUrl(activeConv.user.avatar)} alt={activeConv.user.name} />
                <AvatarFallback className="text-base font-bold">
                  {getInitials(activeConv.user.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center justify-center gap-1">
                  <span>{activeConv.user.name}</span>
                  {activeConv.user.verified && <VerifiedBadge size="xs" />}
                </h3>
                <p className="text-xs text-muted-foreground">@{activeConv.user.username}</p>
              </div>
              <p className="text-[11px] text-muted-foreground/80">
                Direct messages are private and encrypted on BlogX.
              </p>
            </div>

            {/* Messages */}
            {activeConv.messages.map((msg) => {
              const isMine = msg.sender_id === 0;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-xs shadow-xs"
                        : "bg-muted/70 text-foreground border border-border/60 rounded-bl-xs shadow-2xs"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>

                  {/* Timestamp & Read receipts */}
                  <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-muted-foreground">
                    <span>{msg.created_at}</span>
                    {isMine && (
                      <CheckCheck className="size-3 text-primary" />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 w-fit px-3 py-1.5 rounded-full animate-pulse">
                <span>@{activeConv.user.username} is typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Form */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 sm:p-4 border-t border-border/70 bg-card flex items-center gap-2"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => toast.info("Image attachment mock")}
              className="size-8.5 p-0 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ImageIcon className="size-4.5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => toast.info("Emoji picker")}
              className="size-8.5 p-0 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Smile className="size-4.5" />
            </Button>

            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              className="rounded-full border-border bg-background text-xs sm:text-sm h-10 px-4 flex-1 focus-visible:ring-1 focus-visible:ring-primary"
            />

            <Button
              type="submit"
              disabled={!messageText.trim()}
              className="rounded-full size-10 p-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      ) : (
        /* Empty State on Large screens when no chat selected */
        <div className="hidden sm:flex flex-1 flex-col items-center justify-center p-8 text-center bg-background">
          <div className="size-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-3">
            <MessageCircle className="size-8" />
          </div>
          <h2 className="text-base font-bold text-foreground">Select a Conversation</h2>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
            Choose from your existing conversations on the left, or start a new direct chat with any creator.
          </p>
          <Button
            size="sm"
            onClick={() => setActiveConvId(1)}
            className="rounded-full px-5 text-xs font-bold bg-primary text-primary-foreground"
          >
            Open First Conversation
          </Button>
        </div>
      )}
    </div>
  );
}
