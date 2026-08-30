"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Heart, Repeat2, ExternalLink, Loader2, FileText } from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

interface InternalPostEmbedProps {
  postId: string | number;
}

export default function InternalPostEmbed({ postId }: InternalPostEmbedProps) {
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api
      .get(`/api/posts/${postId}`)
      .then((res) => {
        if (isMounted) {
          setPost(res.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [postId]);

  if (loading) {
    return (
      <div className="my-5 p-4 rounded-2xl border border-border/70 bg-card/60 flex items-center justify-center gap-2 text-xs text-muted-foreground animate-pulse">
        <Loader2 className="size-4 animate-spin text-primary" />
        <span>Loading embedded post...</span>
      </div>
    );
  }

  if (error || !post) {
    return null; // Don't show broken embeds
  }

  const author = post.author || post.user;

  return (
    <div className="my-6 rounded-2xl border border-border/80 bg-card hover:border-primary/40 transition-all p-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <Link
          href={`/@${author?.username}`}
          className="flex items-center gap-2.5 group min-w-0"
        >
          <div className="relative size-8 rounded-full overflow-hidden bg-muted shrink-0 border border-border">
            {author?.avatar ? (
              <Image src={author.avatar} alt={author.name} fill className="object-cover" />
            ) : (
              <div className="size-full flex items-center justify-center font-bold text-xs bg-muted">
                {author?.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-foreground group-hover:underline flex items-center gap-1">
              <span className="truncate">{author?.name}</span>
              {author?.verified && <VerifiedBadge size="xs" />}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              @{author?.username}
            </div>
          </div>
        </Link>

        <Link
          href={`/post/${post.id}`}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Open Post"
        >
          <ExternalLink className="size-3.5" />
        </Link>
      </div>

      {/* Content */}
      <Link href={`/post/${post.id}`} className="block">
        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed line-clamp-4">
          {post.content}
        </p>

        {/* Thumbnail Image if post has photos */}
        {post.images && post.images.length > 0 && (
          <div className="mt-2.5 relative h-36 w-full rounded-xl overflow-hidden bg-muted border border-border/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.images[0]}
              alt="Post image"
              className="size-full object-cover"
            />
          </div>
        )}

        {/* Post Stats */}
        <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-border/50 text-[11px] text-muted-foreground font-medium">
          <span className="flex items-center gap-1">
            <Heart className="size-3.5" />
            <span>{post.likes_count || 0}</span>
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3.5" />
            <span>{post.comments_count || 0}</span>
          </span>
          <span className="flex items-center gap-1">
            <Repeat2 className="size-3.5" />
            <span>{post.reposts_count || 0}</span>
          </span>
        </div>
      </Link>
    </div>
  );
}
