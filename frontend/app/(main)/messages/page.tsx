"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, MessageCircle, Edit } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import NotesBar from "@/components/messages/NotesBar";
import { getAvatarUrl, getInitials } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/* ─────────────── shared mock data (exported for /messages/[id]) ─────────────── */

export interface MockMessage {
  id: string | number;
  sender_id: string | number;
  text: string;
  image?: string;
  created_at: string;
  is_seen?: boolean;
}

export interface MockConversation {
  id: string | number;
  user: {
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

export const INITIAL_CONVERSATIONS: MockConversation[] = [
  {
    id: 1,
    user: {
      id: 101,
      name: "Sara Ahmed",
      username: "sara_tech",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
      cover: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
      bio: "Software engineer & tech writer. Passionate about AI and systems design 🚀",
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
      text: "Just read your latest article on AI, absolutely brilliant! 🚀",
      created_at: "5m ago",
      is_seen: false,
      sender_id: 101,
    },
    unread_count: 2,
    messages: [
      {
        id: 1,
        sender_id: 101,
        text: "Hey! How are you doing today?",
        created_at: "10:30 AM",
        is_seen: true,
      },
      {
        id: 2,
        sender_id: 0,
        text: "Hey Sara! All good, how are your new projects going?",
        created_at: "10:32 AM",
        is_seen: true,
      },
      {
        id: 3,
        sender_id: 101,
        text: "Just read your latest article on AI, absolutely brilliant! 🚀",
        created_at: "10:35 AM",
        is_seen: false,
      },
    ],
  },
  {
    id: 2,
    user: {
      id: 102,
      name: "Omar Khalid",
      username: "omarkhaled",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200",
      cover: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800",
      bio: "UI/UX Designer & React Enthusiast | Building delightful interfaces",
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
      text: "Sure, I'll review the code and get back to you soon.",
      created_at: "2h ago",
      is_seen: true,
      sender_id: 102,
    },
    unread_count: 0,
    messages: [
      {
        id: 1,
        sender_id: 0,
        text: "Hey Omar, did you check out the new article page design?",
        created_at: "8:00 AM",
        is_seen: true,
      },
      {
        id: 2,
        sender_id: 102,
        text: "Sure, I'll review the code and get back to you soon.",
        created_at: "8:15 AM",
        is_seen: true,
      },
    ],
  },
  {
    id: 3,
    user: {
      id: 103,
      name: "Layla Hassan",
      username: "layla_ux",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
      cover: "https://images.unsplash.com/photo-1557683316-973673baf926?w=800",
      bio: "Founder of Arab Design Community & tech blogger 🎨",
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
      text: "Thank you so much for your support of the community!",
      created_at: "1d ago",
      is_seen: true,
      sender_id: 103,
    },
    unread_count: 0,
    messages: [
      {
        id: 1,
        sender_id: 103,
        text: "Thank you so much for your support of the community!",
        created_at: "Yesterday",
        is_seen: true,
      },
    ],
  },
  {
    id: 4,
    user: {
      id: 104,
      name: "Ahmed Mostafa",
      username: "ahmed_dev",
      avatar: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200",
      cover: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      bio: "Full-stack developer | Open source contributor | Coffee addict ☕",
      location: "Beirut, Lebanon",
      website: "https://ahmeddev.io",
      verified: false,
      is_online: false,
      last_seen: "Last seen 3d ago",
      followers_count: 540,
      following_count: 210,
      posts_count: 28,
      created_at: "2025-03-01T09:00:00Z",
    },
    last_message: {
      text: "Loved your post on microservices! Can we collab on something?",
      created_at: "3d ago",
      is_seen: true,
      sender_id: 104,
    },
    unread_count: 1,
    messages: [
      {
        id: 1,
        sender_id: 104,
        text: "Loved your post on microservices! Can we collab on something?",
        created_at: "3 days ago",
        is_seen: false,
      },
    ],
  },
];

/* ─────────────── component ─────────────── */

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "Messages / BlogX";
  }, []);

  const filteredConversations = INITIAL_CONVERSATIONS.filter(
    (c) =>
      c.user.name.toLowerCase().includes(search.toLowerCase()) ||
      c.user.username.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = INITIAL_CONVERSATIONS.reduce(
    (sum, c) => sum + c.unread_count,
    0
  );

  return (
    <div className="w-full">
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <MessageCircle className="size-5 text-foreground" strokeWidth={2.2} />
              {totalUnread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 size-3.5 rounded-full bg-primary border-2 border-background" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-foreground tracking-tight leading-none font-[family-name:var(--font-fraunces)]">
                  Messages
                </h1>
                {totalUnread > 0 && (
                  <span className="inline-flex items-center justify-center px-2 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold leading-none">
                    {totalUnread > 9 ? "9+" : totalUnread} new
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-none">
                Your direct conversations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              toast.info("Visit someone's profile to start a new chat!")
            }
            className="size-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all cursor-pointer shadow-xs"
            title="New message"
          >
            <Edit className="size-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="pl-9 rounded-xl border-border bg-muted/30 text-xs h-9"
            />
          </div>
        </div>
      </div>

      {/* ── Daily Notes (24h Expiration - Instagram Style) ── */}
      <NotesBar />

      {/* ── Conversation List ── */}
      <div className="divide-y divide-border/40">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 px-6 text-center">
            <div className="size-20 rounded-full bg-muted/70 flex items-center justify-center mb-4">
              <MessageCircle className="size-9 text-muted-foreground/30" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1.5">
              No conversations found
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {search ? `No results for "${search}"` : "Start a conversation by visiting someone's profile."}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const avatarSrc = getAvatarUrl(conv.user.avatar);
            const isUnread = conv.unread_count > 0;

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => router.push(`/messages/${conv.id}`)}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors text-left cursor-pointer group"
              >
                {/* Avatar with online dot */}
                <div className="relative shrink-0">
                  <Avatar className="size-14 ring-2 ring-border/40 shadow-xs">
                    <AvatarImage src={avatarSrc} alt={conv.user.name} />
                    <AvatarFallback className="text-sm font-bold bg-muted">
                      {getInitials(conv.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  {conv.user.is_online && (
                    <span className="absolute bottom-0.5 right-0.5 size-3.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1 min-w-0">
                      <span
                        className={`text-sm truncate ${
                          isUnread ? "font-bold text-foreground" : "font-semibold text-foreground/90"
                        }`}
                      >
                        {conv.user.name}
                      </span>
                      {conv.user.verified && <VerifiedBadge size="xs" />}
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {conv.last_message.created_at}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-xs truncate ${
                        isUnread
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {conv.last_message.sender_id === 0 ? "You: " : ""}
                      {conv.last_message.text}
                    </p>
                    {isUnread && (
                      <span className="size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Bottom padding */}
      <div className="h-8" />
    </div>
  );
}
