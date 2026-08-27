"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Hash, AtSign, Smile, BookOpen, Code2, BarChart2, Heading } from "lucide-react";
import PostEditorDialog from "./PostEditorDialog";
import { useAuth } from "@/contexts/AuthContext";
import { PostCardProps } from "@/components/PostCard";
import { getAvatarUrl, getAvatarGradient, getInitials } from "@/lib/utils";
import Link from "next/link";

interface CreatePostProps {
  communityId?: number | string | null;
  placeholder?: string;
  onPostCreated?: (post: PostCardProps) => void;
}

export default function CreatePost({ communityId, placeholder, onPostCreated }: CreatePostProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const avatarSrc = getAvatarUrl(user.avatar);
  const avatarGradient = getAvatarGradient(user.username || user.name);

  return (
    <>
      <div className="p-4 sm:p-5 border-b border-border bg-card/40">
        <div className="flex gap-3 items-start">
          <Avatar className="size-10 shrink-0 ring-1 ring-border shadow-xs">
            <AvatarImage src={avatarSrc} alt={user.name} />
            <AvatarFallback className={`text-xs font-bold ${avatarGradient}`}>
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Clickable prompt input area */}
            <div
              onClick={() => setOpen(true)}
              className="text-[15px] sm:text-base text-muted-foreground/80 hover:text-foreground cursor-text py-2 min-h-[44px] transition-colors select-none"
            >
              {placeholder || "What is happening?!"}
            </div>

            {/* Action Toolbar */}
            <div className="flex items-center justify-between pt-2.5 border-t border-border/40 mt-1.5">
              <div className="flex items-center gap-0.5 sm:gap-1">
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="size-8 rounded-md flex items-center justify-center text-primary hover:bg-primary/10 active:scale-95 transition-all cursor-pointer"
                  title="Add Photos / Media"
                >
                  <ImageIcon className="size-[17px]" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="size-8 rounded-md flex items-center justify-center text-primary hover:bg-primary/10 active:scale-95 transition-all cursor-pointer"
                  title="Create Poll"
                >
                  <BarChart2 className="size-[17px]" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="size-8 rounded-md flex items-center justify-center text-brand-hashtag hover:bg-brand-hashtag-subtle active:scale-95 transition-all cursor-pointer"
                  title="Hashtags (#)"
                >
                  <Hash className="size-[17px]" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="size-8 rounded-md flex items-center justify-center text-brand-mention hover:bg-brand-mention-subtle active:scale-95 transition-all cursor-pointer"
                  title="Mention (@)"
                >
                  <AtSign className="size-[17px]" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="size-8 rounded-md flex items-center justify-center text-sky-500 hover:bg-sky-500/10 active:scale-95 transition-all cursor-pointer"
                  title="Rich Formatting / Articles"
                >
                  <Heading className="size-[17px]" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="size-8 rounded-md flex items-center justify-center text-emerald-500 hover:bg-emerald-500/10 active:scale-95 transition-all cursor-pointer"
                  title="Insert Code (```)"
                >
                  <Code2 className="size-[17px]" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="size-8 rounded-md flex items-center justify-center text-amber-500 hover:bg-amber-500/10 active:scale-95 transition-all cursor-pointer"
                  title="Emoji"
                >
                  <Smile className="size-[17px]" />
                </button>
                <Link
                  href="/blogs/new"
                  className="size-8 rounded-md hidden sm:flex items-center justify-center text-brand-article hover:bg-brand-article-subtle active:scale-95 transition-all cursor-pointer"
                  title="Write Blog Post"
                >
                  <BookOpen className="size-[17px]" />
                </Link>
              </div>

              <Button
                onClick={() => setOpen(true)}
                className="rounded-md px-4 sm:px-5 h-8 text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-xs hover:shadow-sm"
              >
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>

      <PostEditorDialog
        open={open}
        onOpenChange={setOpen}
        communityId={communityId}
        onPostCreated={onPostCreated}
      />
    </>
  );
}