"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  Plus,
  Send,
  Image as ImageIcon,
  Smile,
  Phone,
  Video,
  Info,
  ArrowLeft,
  CheckCheck,
  MessageCircle,
  X,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import AccountInfoDialog, { AccountInfoUser } from "@/components/profile/AccountInfoDialog";
import { getAvatarUrl, getInitials, cn } from "@/lib/utils";
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
  user: AccountInfoUser & {
    id: number;
    name: string;
    username: string;
    avatar: string | null;
    cover?: string | null;
    bio?: string | null;
    location?: string | null;
    website?: string | null;
    verified: boolean;
    is_online: boolean;
    last_seen: string;
    followers_count?: number;
    following_count?: number;
    posts_count?: number;
    created_at?: string;
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

const EMOJIS = ["😀", "😂", "🔥", "🚀", "❤️", "✨", "👍", "🎉", "💡", "🧠", "💻", "⚡", "🙌", "💯", "👏", "😍", "🤔", "🎯", "⭐", "📌", "📢", "💬", "👀", "🏆"];

const INITIAL_CONVERSATIONS: MockConversation[] = [
  {
    id: 1,
    user: {
      id: 101,
      name: "سارة أحمد",
      username: "sara_tech",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
      cover: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
      bio: "مهندسة برمجيات وكاتبة تقنية شغوفة بالذكاء الاصطناعي وهندسة النظم 🚀",
      location: "Cairo, Egypt",
      website: "https://saratech.dev",
      verified: true,
      is_online: true,
      last_seen: "Active now",
      followers_count: 1240,
      following_count: 320,
      posts_count: 85,
      created_at: "2025-01-15T10:00:00Z",
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
        text: "مرحباً! كيف حالك اليوم؟",
        created_at: "10:30 AM",
        is_seen: true,
      },
      {
        id: 2,
        sender_id: 0,
        text: "أهلاً سارة! الحمد لله بخير، كيف تسير مشاريعك ومقالاتك الجديدة؟",
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
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200",
      cover: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800",
      bio: "مطور واجهات ومصمم تجارب مستخدم | UI/UX Designer & React Enthusiast",
      location: "Alexandria, Egypt",
      website: "https://omarkhaled.design",
      verified: true,
      is_online: false,
      last_seen: "Last seen 2h ago",
      followers_count: 890,
      following_count: 140,
      posts_count: 42,
      created_at: "2025-02-10T12:00:00Z",
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
        text: "مرحباً عمر، هل تفحصت التصميم الجديد لصفحة المقالات؟",
        created_at: "8:00 AM",
        is_seen: true,
      },
      {
        id: 2,
        sender_id: 102,
        text: "تمام، هراجع الكود وأرد عليك في أقرب وقت.",
        created_at: "8:15 AM",
        is_seen: true,
      },
    ],
  },
  {
    id: 3,
    user: {
      id: 103,
      name: "ليلى حسن",
      username: "layla_ux",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
      cover: "https://images.unsplash.com/photo-1557683316-973673baf926?w=800",
      bio: "مؤسسة مجتمع التصميم العربي ومدونة تقنية 🎨",
      location: "Dubai, UAE",
      website: "https://layla.me",
      verified: false,
      is_online: true,
      last_seen: "Active now",
      followers_count: 3100,
      following_count: 512,
      posts_count: 190,
      created_at: "2024-11-20T10:00:00Z",
    },
    last_message: {
      text: "شكراً جزيلاً لدعمك للمجتمع!",
      created_at: "1d ago",
      is_seen: true,
      sender_id: 103,
    },
    unread_count: 0,
    messages: [
      {
        id: 1,
        sender_id: 103,
        text: "شكراً جزيلاً لدعمك للمجتمع!",
        created_at: "Yesterday",
        is_seen: true,
      },
    ],
  },
];

export default function MessagesPage() {
  const { user: currentUser } = useAuth();
  const [conversations, setConversations] = useState<MockConversation[]>(INITIAL_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<string | number | null>(1);
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [accountInfoOpen, setAccountInfoOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId);

  useEffect(() => {
    document.title = activeConv
      ? `Chat with ${activeConv.user.name} / BlogX Messages`
      : "Direct Messages / BlogX";
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages, isTyping, attachedImage]);

  // Click outside emoji picker
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    }
    if (emojiOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [emojiOpen]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const previewUrl = URL.createObjectURL(file);
      setAttachedImage(previewUrl);
    }
    e.target.value = "";
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() && !attachedImage) return;

    const newMessage: MockMessage = {
      id: Date.now(),
      sender_id: 0,
      text: messageText.trim(),
      image: attachedImage || undefined,
      created_at: "Just now",
      is_seen: false,
    };

    const sentText = messageText.trim() || (attachedImage ? "📷 Photo" : "");

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConvId) {
          return {
            ...c,
            last_message: {
              text: sentText,
              created_at: "Just now",
              is_seen: false,
              sender_id: 0,
            },
            messages: [...c.messages, newMessage],
          };
        }
        return c;
      })
    );

    setMessageText("");
    setAttachedImage(null);
    setEmojiOpen(false);

    // Mock realistic reply after 1.5s
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const replyMessage: MockMessage = {
          id: Date.now() + 1,
          sender_id: activeConv?.user.id ?? 101,
          text: "أهلاً بك! شكراً على رسالتك وتواصلك المميز 😊",
          created_at: "Just now",
          is_seen: true,
        };

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeConvId) {
              return {
                ...c,
                last_message: {
                  text: replyMessage.text,
                  created_at: "Just now",
                  is_seen: true,
                  sender_id: activeConv?.user.id ?? 101,
                },
                messages: [...c.messages, replyMessage],
              };
            }
            return c;
          })
        );
      }, 1500);
    }, 800);
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.user.name.toLowerCase().includes(search.toLowerCase()) ||
      c.user.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-60px)] sm:h-[calc(100vh-64px)] flex overflow-hidden border-x border-border bg-card/30">
      {/* ── Left Column: Conversations List (Spacious & Clean) ── */}
      <div
        className={cn(
          "w-full sm:w-80 md:w-96 lg:w-[400px] border-r border-border bg-card flex flex-col shrink-0",
          activeConvId ? "hidden sm:flex" : "flex"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <MessageCircle className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-none">Messages</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Encrypted Direct Chats</p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => toast.info("Select any creator from their profile to start a new chat!")}
            className="rounded-full size-8 p-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
            title="New chat"
          >
            <Plus className="size-4" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-border/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people & messages..."
              className="pl-9 rounded-xl border-border bg-background text-xs h-9"
            />
          </div>
        </div>

        {/* Conversation Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {filteredConversations.map((conv) => {
            const isSelected = activeConvId === conv.id;
            const avatarSrc = getAvatarUrl(conv.user.avatar);

            return (
              <div
                key={conv.id}
                onClick={() => {
                  setActiveConvId(conv.id);
                  setConversations((prev) =>
                    prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
                  );
                }}
                className={cn(
                  "p-3.5 sm:p-4 flex items-center gap-3 transition-colors cursor-pointer",
                  isSelected
                    ? "bg-primary/10 border-l-4 border-l-primary"
                    : "hover:bg-muted/40"
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="size-12 ring-1 ring-border/60 shadow-2xs">
                    <AvatarImage src={avatarSrc} alt={conv.user.name} />
                    <AvatarFallback className="text-xs font-bold bg-muted">
                      {getInitials(conv.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  {conv.user.is_online && (
                    <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-card" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {conv.user.name}
                      </span>
                      {conv.user.verified && <VerifiedBadge size="xs" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                      {conv.last_message.created_at}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "text-xs truncate",
                        conv.unread_count > 0
                          ? "font-bold text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {conv.last_message.text}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs">
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

      {/* ── Right Column: Modern Active Chat Canvas ── */}
      {activeConv ? (
        <div
          className={cn(
            "flex-1 flex flex-col bg-background/95",
            activeConvId ? "flex" : "hidden sm:flex"
          )}
        >
          {/* Top Chat Header */}
          <div className="p-3.5 sm:px-6 border-b border-border bg-card/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setActiveConvId(null)}
                className="sm:hidden size-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
              >
                <ArrowLeft className="size-4" />
              </button>

              <div
                onClick={() => setAccountInfoOpen(true)}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="relative shrink-0">
                  <Avatar className="size-10 sm:size-11 ring-2 ring-border/60 group-hover:ring-primary/50 transition-all">
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
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {activeConv.user.name}
                    </h2>
                    {activeConv.user.verified && <VerifiedBadge size="xs" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <span className="truncate">@{activeConv.user.username}</span>
                    <span>•</span>
                    <span className={activeConv.user.is_online ? "text-emerald-500 font-medium" : ""}>
                      {activeConv.user.is_online ? "Active now" : activeConv.user.last_seen}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast.info("Voice call feature coming soon!")}
                className="size-8.5 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                title="Voice Call"
              >
                <Phone className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast.info("Video call feature coming soon!")}
                className="size-8.5 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                title="Video Call"
              >
                <Video className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAccountInfoOpen(true)}
                className="size-8.5 p-0 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
                title={`Viewing @${activeConv.user.username} info`}
              >
                <Info className="size-4.5" />
              </Button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4">
            {/* User Intro Banner */}
            <div
              onClick={() => setAccountInfoOpen(true)}
              className="py-6 px-4 rounded-3xl bg-muted/30 border border-border/60 hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center text-center space-y-2.5 max-w-md mx-auto mb-6 group"
            >
              <Avatar className="size-18 ring-4 ring-card shadow-md">
                <AvatarImage src={getAvatarUrl(activeConv.user.avatar)} alt={activeConv.user.name} />
                <AvatarFallback className="text-lg font-bold">
                  {getInitials(activeConv.user.name)}
                </AvatarFallback>
              </Avatar>

              <div>
                <h3 className="text-base font-bold text-foreground flex items-center justify-center gap-1.5 group-hover:text-primary transition-colors">
                  <span>{activeConv.user.name}</span>
                  {activeConv.user.verified && <VerifiedBadge size="sm" />}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">@{activeConv.user.username}</p>
              </div>

              {activeConv.user.bio && (
                <p className="text-xs text-muted-foreground/90 max-w-xs leading-relaxed line-clamp-2">
                  {activeConv.user.bio}
                </p>
              )}

              <div className="flex items-center gap-1 text-[11px] text-primary font-semibold pt-1">
                <span>View Full Account Info</span>
                <Info className="size-3" />
              </div>
            </div>

            {/* Messages List */}
            {activeConv.messages.map((msg) => {
              const isMine = msg.sender_id === 0;

              return (
                <div
                  key={msg.id}
                  className={cn("flex flex-col", isMine ? "items-end" : "items-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] sm:max-w-[70%] rounded-2xl text-xs sm:text-sm leading-relaxed overflow-hidden",
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-xs shadow-xs"
                        : "bg-card text-foreground border border-border/80 rounded-bl-xs shadow-2xs"
                    )}
                  >
                    {/* Attached Image if any */}
                    {msg.image && (
                      <div className="overflow-hidden max-h-72">
                        <img
                          src={msg.image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {msg.text && (
                      <p className="p-3 sm:px-4 sm:py-2.5 whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mt-1 px-1.5 text-[10px] text-muted-foreground">
                    <span>{msg.created_at}</span>
                    {isMine && <CheckCheck className="size-3 text-primary" />}
                  </div>
                </div>
              );
            })}

            {/* Live Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 px-3.5 py-2 rounded-2xl w-fit animate-pulse border border-border/40">
                <span className="size-2 rounded-full bg-primary animate-ping" />
                <span>@{activeConv.user.username} is typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Composer Form */}
          <div className="p-3 sm:p-4 border-t border-border bg-card relative">
            {/* Attached Image Preview */}
            {attachedImage && (
              <div className="mb-2.5 relative inline-block">
                <div className="relative size-16 sm:size-20 rounded-2xl overflow-hidden border border-border shadow-md">
                  <img src={attachedImage} alt="Attachment" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setAttachedImage(null)}
                    className="absolute top-1 right-1 size-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Emoji Picker Popover */}
            {emojiOpen && (
              <div
                ref={emojiPickerRef}
                className="absolute bottom-full left-4 mb-2 z-50 w-72 p-3 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
                  <span className="text-xs font-bold text-muted-foreground">Emojis</span>
                  <button
                    type="button"
                    onClick={() => setEmojiOpen(false)}
                    className="p-1 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {EMOJIS.map((emoji, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setMessageText((prev) => prev + emoji);
                        setEmojiOpen(false);
                      }}
                      className="size-9 flex items-center justify-center text-xl rounded-xl hover:bg-muted active:scale-125 transition-transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageSelect}
            />

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="size-9 p-0 rounded-full text-primary hover:bg-primary/10 transition-colors cursor-pointer shrink-0"
                title="Attach photo"
              >
                <ImageIcon className="size-5" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEmojiOpen(!emojiOpen)}
                className="size-9 p-0 rounded-full text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer shrink-0"
                title="Insert emoji"
              >
                <Smile className="size-5" />
              </Button>

              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a direct message..."
                className="rounded-2xl border-border bg-background text-xs sm:text-sm h-10 px-4 flex-1 focus-visible:ring-1 focus-visible:ring-primary"
              />

              <Button
                type="submit"
                disabled={!messageText.trim() && !attachedImage}
                className="rounded-2xl size-10 p-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer disabled:opacity-40 transition-all shrink-0"
              >
                <Send className="size-4" />
              </Button>
            </form>
          </div>

          {/* Account Info Modal */}
          {activeConv && (
            <AccountInfoDialog
              open={accountInfoOpen}
              onOpenChange={setAccountInfoOpen}
              user={activeConv.user}
            />
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="hidden sm:flex flex-1 flex-col items-center justify-center p-8 text-center bg-background">
          <div className="size-18 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-4 shadow-xs">
            <MessageCircle className="size-9" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Direct Messages</h2>
          <p className="text-xs text-muted-foreground max-w-sm mt-1.5 mb-5 leading-relaxed">
            Select an existing conversation on the left, or connect with creators across BlogX.
          </p>
          <Button
            size="sm"
            onClick={() => setActiveConvId(1)}
            className="rounded-xl px-5 h-9 text-xs font-bold bg-primary text-primary-foreground cursor-pointer shadow-xs"
          >
            Open Sara's Chat
          </Button>
        </div>
      )}
    </div>
  );
}
