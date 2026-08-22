"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Send,
  Image as ImageIcon,
  Smile,
  Phone,
  Video,
  Info,
  ArrowLeft,
  CheckCheck,
  X,
  MessageCircle,
  Images,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import AccountInfoDialog from "@/components/profile/AccountInfoDialog";
import { getAvatarUrl, getInitials } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  INITIAL_CONVERSATIONS,
  MockConversation,
  MockMessage,
} from "../page";

const EMOJIS = [
  "😀","😂","🔥","🚀","❤️","✨","👍","🎉","💡","🧠",
  "💻","⚡","🙌","💯","👏","😍","🤔","🎯","⭐","📌",
  "📢","💬","👀","🏆",
];

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const convId = params?.id;

  const [conversation, setConversation] = useState<MockConversation | null>(
    () => {
      const found = INITIAL_CONVERSATIONS.find(
        (c) => String(c.id) === String(convId)
      );
      return found ? { ...found, unread_count: 0 } : null;
    }
  );

  const [messageText, setMessageText] = useState("");
  // Multiple images support
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [accountInfoOpen, setAccountInfoOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  /* ── page title ── */
  useEffect(() => {
    document.title = conversation
      ? `Chat with ${conversation.user.name} / BlogX`
      : "Conversation / BlogX";
  }, [conversation]);

  /* ── auto-scroll ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages, isTyping, attachedImages]);

  /* ── close emoji on outside click ── */
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

  /* ── image attach (multiple) ── */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const urls = Array.from(files).map((f) => URL.createObjectURL(f));
      setAttachedImages((prev) => [...prev, ...urls]);
    }
    e.target.value = "";
  };

  const removeAttachedImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  };

  /* ── send message ── */
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() && attachedImages.length === 0) return;
    if (!conversation) return;

    const now = "Just now";
    const newMessages: MockMessage[] = [];

    // If there are images, create one message per image (like Instagram)
    if (attachedImages.length > 0) {
      attachedImages.forEach((imgUrl, i) => {
        newMessages.push({
          id: Date.now() + i,
          sender_id: 0,
          text: i === 0 && messageText.trim() ? messageText.trim() : "",
          image: imgUrl,
          created_at: now,
          is_seen: false,
        });
      });
    } else {
      newMessages.push({
        id: Date.now(),
        sender_id: 0,
        text: messageText.trim(),
        created_at: now,
        is_seen: false,
      });
    }

    const sentText =
      messageText.trim() ||
      (attachedImages.length > 1
        ? `📷 ${attachedImages.length} Photos`
        : attachedImages.length === 1
        ? "📷 Photo"
        : "");

    setConversation((prev) =>
      prev
        ? {
            ...prev,
            last_message: {
              text: sentText,
              created_at: now,
              is_seen: false,
              sender_id: 0,
            },
            messages: [...prev.messages, ...newMessages],
          }
        : prev
    );

    setMessageText("");
    setAttachedImages([]);
    setEmojiOpen(false);

    // Mock reply
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const reply: MockMessage = {
          id: Date.now() + 999,
          sender_id: conversation.user.id,
          text: "Thanks for reaching out! Great to connect with you 😊",
          created_at: now,
          is_seen: true,
        };
        setConversation((prev) =>
          prev
            ? {
                ...prev,
                last_message: {
                  text: reply.text,
                  created_at: now,
                  is_seen: true,
                  sender_id: conversation.user.id,
                },
                messages: [...prev.messages, reply],
              }
            : prev
        );
      }, 1500);
    }, 800);
  };

  /* ── 404 state ── */
  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
        <div className="size-20 rounded-full bg-muted flex items-center justify-center mb-5">
          <MessageCircle className="size-9 text-muted-foreground/40" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Conversation not found
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          This conversation doesn&apos;t exist or has been removed.
        </p>
        <Button
          onClick={() => router.push("/messages")}
          className="rounded-full px-8 font-bold"
        >
          Back to Messages
        </Button>
      </div>
    );
  }

  /* ── main UI ── */
  return (
    // Full height on desktop, handles mobile bars on small screens
    <div className="flex flex-col h-[calc(100dvh-7rem)] lg:h-screen lg:max-h-screen bg-background -mb-16 lg:mb-0">
      {/* ── Top Header ── */}
      <div className="shrink-0 flex items-center justify-between px-3 sm:px-5 py-3 border-b border-border bg-card/90 backdrop-blur-md">
        {/* Left: back + user info */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => router.push("/messages")}
            className="size-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer shrink-0"
            title="Back to Messages"
          >
            <ArrowLeft className="size-4.5" />
          </button>

          <button
            type="button"
            onClick={() => setAccountInfoOpen(true)}
            className="flex items-center gap-2.5 cursor-pointer group min-w-0"
          >
            <div className="relative shrink-0">
              <Avatar className="size-10 sm:size-11 ring-2 ring-border/50 group-hover:ring-primary/50 transition-all">
                <AvatarImage
                  src={getAvatarUrl(conversation.user.avatar)}
                  alt={conversation.user.name}
                />
                <AvatarFallback className="text-xs font-bold">
                  {getInitials(conversation.user.name)}
                </AvatarFallback>
              </Avatar>
              {conversation.user.is_online && (
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              )}
            </div>

            <div className="min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                  {conversation.user.name}
                </h2>
                {conversation.user.verified && <VerifiedBadge size="xs" />}
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <span className="truncate">@{conversation.user.username}</span>
                <span>•</span>
                <span
                  className={
                    conversation.user.is_online
                      ? "text-emerald-500 font-medium"
                      : ""
                  }
                >
                  {conversation.user.is_online
                    ? "Active now"
                    : conversation.user.last_seen}
                </span>
              </p>
            </div>
          </button>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toast.info("Voice call coming soon!")}
            className="size-9 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
            title="Voice Call"
          >
            <Phone className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toast.info("Video call coming soon!")}
            className="size-9 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
            title="Video Call"
          >
            <Video className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAccountInfoOpen(true)}
            className="size-9 p-0 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
            title="Account Info"
          >
            <Info className="size-4.5" />
          </Button>
        </div>
      </div>

      {/* ── Messages Body ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* User intro banner */}
        <button
          type="button"
          onClick={() => setAccountInfoOpen(true)}
          className="w-full py-6 px-4 rounded-3xl bg-muted/30 border border-border/60 hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center text-center space-y-2.5 max-w-md mx-auto mb-4 group"
        >
          <Avatar className="size-18 ring-4 ring-card shadow-md">
            <AvatarImage
              src={getAvatarUrl(conversation.user.avatar)}
              alt={conversation.user.name}
            />
            <AvatarFallback className="text-lg font-bold">
              {getInitials(conversation.user.name)}
            </AvatarFallback>
          </Avatar>

          <div>
            <h3 className="text-base font-bold text-foreground flex items-center justify-center gap-1.5 group-hover:text-primary transition-colors">
              <span>{conversation.user.name}</span>
              {conversation.user.verified && <VerifiedBadge size="sm" />}
            </h3>
            <p className="text-xs text-muted-foreground font-mono">
              @{conversation.user.username}
            </p>
          </div>

          {conversation.user.bio && (
            <p className="text-xs text-muted-foreground/90 max-w-xs leading-relaxed line-clamp-2">
              {conversation.user.bio}
            </p>
          )}

          <div className="flex items-center gap-1 text-[11px] text-primary font-semibold pt-1">
            <span>View Profile</span>
            <Info className="size-3" />
          </div>
        </button>

        {/* Messages */}
        {conversation.messages.map((msg) => {
          const isMine = msg.sender_id === 0;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[68%] rounded-2xl text-xs sm:text-sm leading-relaxed overflow-hidden ${
                  isMine
                    ? "bg-primary text-primary-foreground rounded-br-sm shadow-xs"
                    : "bg-card text-foreground border border-border/80 rounded-bl-sm shadow-2xs"
                }`}
              >
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
                  <p className="p-3 sm:px-4 sm:py-2.5 whitespace-pre-wrap">
                    {msg.text}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-1 px-1.5 text-[10px] text-muted-foreground">
                <span>{msg.created_at}</span>
                {isMine && <CheckCheck className="size-3 text-primary" />}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 px-3.5 py-2 rounded-2xl w-fit animate-pulse border border-border/40">
            <span className="size-2 rounded-full bg-primary animate-ping" />
            <span>@{conversation.user.username} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Composer ── */}
      <div className="shrink-0 border-t border-border bg-card">
        {/* Attached images preview strip */}
        {attachedImages.length > 0 && (
          <div className="px-3 sm:px-4 pt-3 flex gap-2 flex-wrap">
            {attachedImages.map((src, i) => (
              <div key={i} className="relative group/img shrink-0">
                <div className="size-16 sm:size-20 rounded-xl overflow-hidden border border-border shadow-sm">
                  <img
                    src={src}
                    alt={`Attachment ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachedImage(i)}
                  className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-foreground text-background flex items-center justify-center hover:bg-destructive transition-colors cursor-pointer shadow-sm"
                >
                  <X className="size-2.5" />
                </button>
              </div>
            ))}

            {/* Count badge */}
            {attachedImages.length > 1 && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground self-end pb-1">
                <Images className="size-3.5" />
                <span>{attachedImages.length} photos</span>
              </div>
            )}
          </div>
        )}

        {/* Emoji picker */}
        <div className="relative">
          {emojiOpen && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-full left-4 mb-2 z-50 w-72 p-3 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
                <span className="text-xs font-bold text-muted-foreground">
                  Emojis
                </span>
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
        </div>

        {/* Input row */}
        <div className="p-3 sm:p-4">
          {/* Hidden file input — multiple allowed */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
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
              title="Attach photos"
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
              placeholder="Message..."
              className="rounded-2xl border-border bg-background text-xs sm:text-sm h-10 px-4 flex-1 focus-visible:ring-1 focus-visible:ring-primary"
            />

            <Button
              type="submit"
              disabled={!messageText.trim() && attachedImages.length === 0}
              className="rounded-2xl size-10 p-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer disabled:opacity-40 transition-all shrink-0"
            >
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Account Info Modal */}
      <AccountInfoDialog
        open={accountInfoOpen}
        onOpenChange={setAccountInfoOpen}
        user={conversation.user}
      />
    </div>
  );
}
