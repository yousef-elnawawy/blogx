"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Clock, ArrowRight, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { getAvatarUrl, getInitials, cn } from "@/lib/utils";
import api from "@/lib/api";

interface BlogQuoteEmbedCardProps {
  slug: string;
  quote: string;
  className?: string;
}

export default function BlogQuoteEmbedCard({
  slug,
  quote,
  className,
}: BlogQuoteEmbedCardProps) {
  const router = useRouter();
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    let cleanSlug = slug;
    try {
      cleanSlug = decodeURIComponent(slug);
    } catch {
      cleanSlug = slug;
    }

    api
      .get(`/api/blogs/${encodeURIComponent(cleanSlug)}`)
      .then((res) => {
        if (isMounted) {
          setBlog(res.data.blog || res.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetSlug = blog?.slug || slug;
    router.push(`/blog/${encodeURIComponent(targetSlug)}?highlight=${encodeURIComponent(quote)}`);
  };

  const author = blog?.author || blog?.user;

  if (loading) {
    return (
      <div className="my-3 p-3.5 rounded-2xl border border-border/70 bg-card/60 flex items-center justify-center gap-2 text-xs text-muted-foreground animate-pulse">
        <Loader2 className="size-4 animate-spin text-primary" />
        <span>Loading story...</span>
      </div>
    );
  }

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "my-3 w-full rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:bg-muted/15 transition-all duration-200 cursor-pointer p-4 group text-left",
        className
      )}
    >
      {/* Top author row & reading time */}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="size-5 ring-1 ring-border/40">
            <AvatarImage src={getAvatarUrl(author?.avatar)} alt={author?.name || "Author"} />
            <AvatarFallback className="text-[9px] font-bold">
              {getInitials(author?.name || "A")}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-foreground/90 truncate text-xs">
            {author?.name || "Author"}
          </span>
          {Boolean(author?.verified) && <VerifiedBadge size="xs" />}
          {blog?.read_time && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-[11px]">
                <Clock className="size-3" />
                {blog.read_time} min read
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0 font-medium">
          <BookOpen className="size-3 text-primary" />
          <span>Article</span>
        </div>
      </div>

      {/* Main card body with optional cover image thumbnail */}
      <div className="flex gap-3.5 items-start justify-between">
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Blog Title */}
          <h4 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1 leading-snug font-[family-name:var(--font-fraunces)]">
            {blog?.title || "Story Excerpt"}
          </h4>

          {/* Quoted Excerpt as a clean, authentic quote paragraph */}
          <blockquote className="text-xs sm:text-sm text-foreground/80 leading-relaxed italic line-clamp-3 pl-3 border-l-2 border-primary/50 my-1">
            &ldquo;{quote}&rdquo;
          </blockquote>
        </div>

        {/* Cover thumbnail on the side if available - identical to InternalBlogEmbed */}
        {blog?.cover_image && (
          <div className="relative w-20 h-16 sm:w-24 sm:h-20 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/50 self-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getAvatarUrl(blog.cover_image)}
              alt={blog?.title || "Blog cover"}
              className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
      </div>

      {/* Subtle bottom action hint */}
      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-border/40 text-[11px] text-muted-foreground group-hover:text-primary transition-colors">
        <span>Click to jump to this quote</span>
        <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
}
