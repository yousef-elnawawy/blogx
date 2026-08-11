"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Hash, Sparkles } from "lucide-react";
import PostEditorDialog from "./PostEditorDialog";
import { useAuth } from "@/contexts/AuthContext";
import { PostCardProps } from "@/components/PostCard";
import { getAvatarUrl } from "@/lib/utils";

interface CreatePostProps {
  onPostCreated?: (post: PostCardProps) => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const avatarSrc = getAvatarUrl(user.avatar);

  return (
    <>
      <div className="p-4 sm:p-5 border-b border-border/60">
        <div className="flex gap-3 items-start">
          <Avatar className="size-10 shrink-0">
            <AvatarImage src={avatarSrc} alt={user.name} />
            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Clickable prompt input area */}
            <div
              onClick={() => setOpen(true)}
              className="text-[15px] sm:text-base text-muted-foreground/80 hover:text-foreground cursor-text py-2 min-h-[44px] transition-colors"
            >
              What is happening?!
            </div>

            {/* Action Toolbar - X Style */}
            <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-2">
              <div className="flex items-center gap-1 text-primary">
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="p-2 rounded-full hover:bg-primary/10 transition-colors"
                  title="Media"
                >
                  <ImageIcon className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="p-2 rounded-full hover:bg-primary/10 transition-colors"
                  title="Hashtag"
                >
                  <Hash className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="p-2 rounded-full hover:bg-primary/10 transition-colors"
                  title="Inspire"
                >
                  <Sparkles className="size-5" />
                </button>
              </div>

              <Button
                onClick={() => setOpen(true)}
                className="rounded-full px-5 h-9 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
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
        onPostCreated={onPostCreated}
      />
    </>
  );
}