"use client";

import { useState, useEffect } from "react";
import { BookOpen, Clock, Heart, ExternalLink, Loader2 } from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

interface InternalBlogEmbedProps {
  slug: string;
}

export default function InternalBlogEmbed({ slug }: InternalBlogEmbedProps) {
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api
      .get(`/api/blogs/${slug}`)
      .then((res) => {
        if (isMounted) {
          setBlog(res.data.blog || res.data);
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
  }, [slug]);

  if (loading) {
    return (
      <div className="my-5 p-4 rounded-2xl border border-border/70 bg-card/60 flex items-center justify-center gap-2 text-xs text-muted-foreground animate-pulse">
        <Loader2 className="size-4 animate-spin text-primary" />
        <span>Loading embedded article...</span>
      </div>
    );
  }

  if (error || !blog) {
    return null;
  }

  const author = blog.user || blog.author;

  return (
    <Link
      href={`/blogs/${blog.slug || slug}`}
      className="my-6 block rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all p-4 shadow-xs group"
    >
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        {/* Cover Image if available */}
        {blog.cover_image && (
          <div className="relative w-full sm:w-36 h-24 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={blog.cover_image.startsWith("http") ? blog.cover_image : `${process.env.NEXT_PUBLIC_BACKEND_URL || ""}/storage/${blog.cover_image.replace(/^\/?storage\//, "")}`}
              alt={blog.title}
              className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[10px] text-primary font-bold uppercase tracking-wider mb-1">
            <BookOpen className="size-3" />
            <span>Related Article</span>
          </div>

          <h4 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
            {blog.title}
          </h4>

          {blog.excerpt && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {blog.excerpt}
            </p>
          )}

          {/* Author and Read Time */}
          <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
            {author && (
              <span className="font-semibold text-foreground/80">
                By {author.name}
              </span>
            )}
            {blog.read_time && (
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                <span>{blog.read_time} min read</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
