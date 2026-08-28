"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import UserBadges from "@/components/ui/UserBadges";
import ShareDialog from "@/components/post/ShareDialog";
import {
  Layers,
  Clock,
  Eye,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Loader2,
  Share2,
} from "lucide-react";
import { getAvatarUrl, getAvatarGradient, getInitials } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SeriesBlogItem {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  read_time: number;
  views_count: number;
  series_order: number;
  part_number: number;
  published_at: string | null;
}

interface SeriesDetail {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  views_count: number;
  blogs_count: number;
  total_read_time: number;
  created_at: string | null;
  author: {
    id: number | null;
    name: string;
    username: string;
    avatar: string | null;
    bio?: string | null;
    verified?: boolean;
    equipped_badges?: string[] | null;
  };
  blogs: SeriesBlogItem[];
}

export default function SeriesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetchSeriesDetail();
  }, [slug]);

  const fetchSeriesDetail = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get(`/api/series/${encodeURIComponent(slug)}`);
      const data = res.data?.series || res.data;
      setSeries(data);
      if (data?.title) {
        document.title = `${data.title} — BlogX Series`;
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    setShareDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="text-xs font-medium">Loading series details...</span>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="size-14 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-3">
          <Layers className="size-7" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Series Not Found</h2>
        <p className="text-xs text-muted-foreground mt-1 mb-5">
          The series you are looking for does not exist or has been removed.
        </p>
        <Link href="/series">
          <Button variant="outline" size="sm" className="rounded-lg gap-2 text-xs">
            <ArrowLeft className="size-4" />
            <span>Back to Series</span>
          </Button>
        </Link>
      </div>
    );
  }

  const firstBlog = series.blogs?.[0];

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 selection:bg-primary/20">
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/series"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Series</span>
          </Link>
          <span className="text-muted-foreground/50 text-xs">/</span>
          <span className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-[300px]">
            {series.title}
          </span>
        </div>

        <button
          onClick={handleShare}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Share series"
        >
          <Share2 className="size-4" />
        </button>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {/* Cover image */}
        {series.cover_image && (
          <div className="mb-6 rounded-xl overflow-hidden border border-border/60 shadow-xs">
            <img
              src={getAvatarUrl(series.cover_image)}
              alt={series.title}
              className="w-full max-h-[320px] object-cover"
            />
          </div>
        )}

        {/* Series Header */}
        <div className="space-y-4 pb-6 border-b border-border/60">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold">
            <Layers className="size-3.5" />
            <span>Blog Series ({series.blogs_count} Parts)</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight font-[family-name:var(--font-fraunces)] leading-tight">
            {series.title}
          </h1>

          {series.description && (
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {series.description}
            </p>
          )}

          {/* Author Details Bar */}
          <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
            <Link
              href={`/@${series.author.username}`}
              className="flex items-center gap-3 group"
            >
              <Avatar className="size-10 ring-1 ring-border/40">
                <AvatarImage src={getAvatarUrl(series.author.avatar)} alt={series.author.name} />
                <AvatarFallback className={`text-xs font-bold ${getAvatarGradient(series.author.name)}`}>
                  {getInitials(series.author.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-foreground group-hover:underline">
                    {series.author.name}
                  </span>
                  {series.author.verified && <VerifiedBadge size="sm" />}
                  <UserBadges equippedBadges={series.author.equipped_badges} size="xs" />
                </div>
                <span className="text-xs text-muted-foreground">
                  @{series.author.username}
                </span>
              </div>
            </Link>

            {firstBlog && (
              <Link href={`/blog/${encodeURIComponent(firstBlog.slug)}`}>
                <Button className="rounded-lg text-xs font-bold gap-1.5 h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs">
                  <BookOpen className="size-3.5" />
                  <span>Start Reading (Part 1)</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Ordered Parts List */}
        <div className="mt-8 space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2 font-[family-name:var(--font-fraunces)]">
            <Layers className="size-4 text-primary" />
            <span>Table of Contents ({series.blogs.length} Stories)</span>
          </h2>

          <div className="divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden bg-card/40">
            {series.blogs.map((blog, idx) => (
              <Link
                key={blog.id}
                href={`/blog/${encodeURIComponent(blog.slug)}`}
                className="group p-4 hover:bg-muted/20 transition-colors flex items-center justify-between gap-4 block"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="size-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-1">
                      {blog.title}
                    </h3>
                    {blog.excerpt && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {blog.excerpt}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    <span>{blog.read_time} min</span>
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      {series && (
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          post={{
            id: series.id,
            type: "series",
            title: series.title,
            slug: series.slug,
            author: series.author || { name: "Author", username: "author", avatar: null },
            content: series.description || series.title,
            cover_image: series.cover_image,
          }}
        />
      )}
    </div>
  );
}
