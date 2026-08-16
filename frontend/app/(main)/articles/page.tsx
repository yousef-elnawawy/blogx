"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  PenSquare,
  Clock,
  Heart,
  Eye,
  ArrowRight,
  Sparkles,
  Loader2,
  FileText,
  X,
  CheckCircle2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import ArticleEditorDialog from "@/components/article/ArticleEditorDialog";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { getAvatarUrl, cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";

interface ArticleItem {
  id: number;
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  cover_image?: string | null;
  tags?: string[];
  read_time: number;
  status: string;
  views_count: number;
  likes_count: number;
  is_liked?: boolean;
  published_at: string | null;
  created_at: string | null;
  author: {
    id: number | null;
    name: string;
    username: string;
    avatar: string | null;
    bio?: string | null;
    verified?: boolean;
  };
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

function formatCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
}

function ArticlesSkeleton() {
  return (
    <div className="divide-y divide-border/60 animate-in fade-in-50 duration-300">
      {/* Featured Article Skeleton */}
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 rounded-full bg-muted/80 animate-pulse" />
          <div className="h-3 w-20 rounded-full bg-muted/50 animate-pulse" />
        </div>
        <div className="h-64 sm:h-72 w-full rounded-xl bg-muted/70 animate-pulse" />
        <div className="space-y-2">
          <div className="h-6 w-3/4 rounded-full bg-muted/80 animate-pulse" />
          <div className="h-4 w-full rounded-full bg-muted/60 animate-pulse" />
          <div className="h-4 w-5/6 rounded-full bg-muted/60 animate-pulse" />
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-muted/80 animate-pulse" />
            <div className="h-3.5 w-28 rounded-full bg-muted/80 animate-pulse" />
          </div>
          <div className="h-8 w-24 rounded-full bg-muted/70 animate-pulse" />
        </div>
      </div>

      {/* Standard Article Skeletons */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 sm:p-6 flex flex-col sm:flex-row gap-5 items-start">
          <div className="flex-1 space-y-2.5 w-full">
            <div className="h-3 w-20 rounded-full bg-muted/60 animate-pulse" />
            <div className="h-5 w-4/5 rounded-full bg-muted/80 animate-pulse" />
            <div className="h-3.5 w-full rounded-full bg-muted/60 animate-pulse" />
            <div className="h-3.5 w-3/4 rounded-full bg-muted/60 animate-pulse" />
            <div className="flex items-center gap-3 pt-2">
              <div className="size-6 rounded-full bg-muted/80 animate-pulse" />
              <div className="h-3 w-24 rounded-full bg-muted/70 animate-pulse" />
            </div>
          </div>
          <div className="w-full sm:w-48 h-36 sm:h-32 rounded-xl bg-muted/70 animate-pulse shrink-0" />
        </div>
      ))}
    </div>
  );
}

export default function ArticlesPage() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [writeDialogOpen, setWriteDialogOpen] = useState(false);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchArticles = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (q.trim()) params.q = q.trim();

      const res = await api.get("/api/articles", { params });
      setArticles(res.data.data || []);
      setNextPageUrl(res.data.next_page_url);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchArticles("");
  }, [fetchArticles]);

  // Live debounced search as user types
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchArticles(searchQuery);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchArticles]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchArticles(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    fetchArticles("");
  };

  const loadMore = useCallback(async () => {
    if (!nextPageUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.get(nextPageUrl);
      setArticles((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const newOnes = (res.data.data || []).filter((a: ArticleItem) => !existingIds.has(a.id));
        return [...prev, ...newOnes];
      });
      setNextPageUrl(res.data.next_page_url);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [nextPageUrl, loadingMore]);

  // Infinite scrolling
  useEffect(() => {
    const target = observerTarget.current;
    if (!target || !nextPageUrl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && nextPageUrl) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "300px" }
    );

    observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [nextPageUrl, loadingMore, loadMore]);

  const featuredArticle = articles.length > 0 && !searchQuery.trim() ? articles[0] : null;
  const standardArticles = featuredArticle ? articles.slice(1) : articles;

  return (
    <div className="min-h-screen pb-16">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/70 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BookOpen className="size-5 text-brand-article" />
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Articles</h1>
        </div>

        {user && (
          <Button
            onClick={() => setWriteDialogOpen(true)}
            className="rounded-full h-9 px-4 text-xs font-bold gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <PenSquare className="size-3.5" />
            <span>Write Article</span>
          </Button>
        )}
      </div>

      {/* Search Input Bar (No tags as requested) */}
      <div className="p-4 sm:p-5 border-b border-border/60 bg-muted/10">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles by title, keywords, or author..."
            className="w-full h-11 pl-10 pr-10 rounded-full bg-background border border-border/70 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </form>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <ArticlesSkeleton />
      ) : articles.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <FileText className="size-7" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              {searchQuery ? `No articles matched "${searchQuery}"` : "No articles published yet"}
            </h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              {searchQuery
                ? "Try searching for a different keyword or clear the search."
                : "Be the first to publish a long-form story or engineering tutorial."}
            </p>
          </div>
          {user && !searchQuery && (
            <Button
              onClick={() => setWriteDialogOpen(true)}
              className="rounded-full px-5 font-bold text-xs mt-2"
            >
              Write First Article
            </Button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {/* Featured Hero Article */}
          {featuredArticle && (
            <article className="p-4 sm:p-6 hover:bg-muted/10 transition-colors group">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-500">
                  <Sparkles className="size-3.5" />
                  FEATURED ARTICLE
                </span>
                <span className="text-xs text-muted-foreground">
                  {featuredArticle.published_at ? format(new Date(featuredArticle.published_at), "MMM d, yyyy") : "Recently published"}
                </span>
              </div>

              {featuredArticle.cover_image && (
                <Link
                  href={`/article/${encodeURIComponent(featuredArticle.slug)}`}
                  className="block relative w-full h-56 sm:h-80 rounded-xl overflow-hidden bg-muted mb-4 border border-border/60"
                >
                  <img
                    src={getAvatarUrl(featuredArticle.cover_image)}
                    alt={featuredArticle.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                </Link>
              )}

              {/* Tags */}
              {featuredArticle.tags && featuredArticle.tags.length > 0 && (
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  {featuredArticle.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              <Link
                href={`/article/${encodeURIComponent(featuredArticle.slug)}`}
                className="block mb-2"
              >
                <h2 className="text-xl sm:text-3xl font-extrabold text-foreground group-hover:text-primary transition-colors leading-tight">
                  {featuredArticle.title}
                </h2>
              </Link>

              {featuredArticle.excerpt && (
                <p className="text-sm sm:text-base text-foreground/80 leading-relaxed line-clamp-3 mb-4">
                  {featuredArticle.excerpt}
                </p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border/40 gap-4 flex-wrap text-xs">
                <Link
                  href={`/@${featuredArticle.author?.username}`}
                  className="flex items-center gap-3 group/author"
                >
                  <Avatar className="size-8 ring-1 ring-border/50">
                    <AvatarImage
                      src={getAvatarUrl(featuredArticle.author?.avatar)}
                      alt={featuredArticle.author?.name}
                    />
                    <AvatarFallback className="font-bold text-xs">
                      {getInitials(featuredArticle.author?.name || "A")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-foreground group-hover/author:underline">
                        {featuredArticle.author?.name}
                      </span>
                      {featuredArticle.author?.verified && <VerifiedBadge size="sm" />}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>@{featuredArticle.author?.username}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {featuredArticle.read_time} min read
                      </span>
                    </div>
                  </div>
                </Link>

                <Link href={`/article/${encodeURIComponent(featuredArticle.slug)}`}>
                  <Button className="rounded-full px-5 h-8.5 text-xs font-bold gap-1.5 shadow-2xs">
                    <span>Read Article</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
              </div>
            </article>
          )}

          {/* Standard Articles List */}
          {standardArticles.map((art, index) => (
            <article
              key={art.id}
              className="p-4 sm:p-6 hover:bg-muted/10 transition-colors group flex flex-col sm:flex-row gap-5 items-start animate-in fade-in-0 slide-in-from-bottom-2 duration-400 fill-mode-both"
              style={{ animationDelay: `${Math.min(index * 60, 500)}ms` }}
            >
              <div className="flex-1 min-w-0 space-y-2 order-2 sm:order-1">
                {/* Tags */}
                {art.tags && art.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {art.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Title */}
                <Link
                  href={`/article/${encodeURIComponent(art.slug)}`}
                  className="block"
                >
                  <h3 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                    {art.title}
                  </h3>
                </Link>

                {/* Excerpt */}
                {art.excerpt && (
                  <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed line-clamp-2">
                    {art.excerpt}
                  </p>
                )}

                {/* Author Row & Meta */}
                <div className="flex items-center justify-between pt-3 border-t border-border/40 gap-3 flex-wrap text-xs text-muted-foreground">
                  <Link
                    href={`/@${art.author?.username}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <Avatar className="size-6 ring-1 ring-border/50">
                      <AvatarImage src={getAvatarUrl(art.author?.avatar)} alt={art.author?.name} />
                      <AvatarFallback className="text-[10px] font-bold">
                        {getInitials(art.author?.name || "A")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-foreground">{art.author?.name}</span>
                    {art.author?.verified && <VerifiedBadge size="sm" />}
                  </Link>

                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {art.read_time} min read
                    </span>

                    {art.views_count > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Eye className="size-3" />
                        {formatCount(art.views_count)}
                      </span>
                    )}

                    {art.likes_count > 0 && (
                      <span className="inline-flex items-center gap-1 text-rose-500">
                        <Heart className="size-3 fill-current" />
                        {formatCount(art.likes_count)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Cover Image */}
              {art.cover_image && (
                <Link
                  href={`/article/${encodeURIComponent(art.slug)}`}
                  className="w-full sm:w-48 h-40 sm:h-32 rounded-xl overflow-hidden shrink-0 border border-border/60 bg-muted order-1 sm:order-2"
                >
                  <img
                    src={getAvatarUrl(art.cover_image)}
                    alt={art.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </Link>
              )}
            </article>
          ))}

          {/* Sentinel element for infinite scroll */}
          <div ref={observerTarget} className="h-4" />

          {loadingMore && (
            <div className="p-4 text-center">
              <Loader2 className="size-5 animate-spin text-primary mx-auto" />
            </div>
          )}

          {!nextPageUrl && articles.length > 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground flex items-center justify-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>You&apos;ve viewed all articles</span>
            </div>
          )}
        </div>
      )}

      {/* Write Article Dialog */}
      <ArticleEditorDialog
        open={writeDialogOpen}
        onOpenChange={setWriteDialogOpen}
        onSaved={() => fetchArticles(searchQuery)}
      />
    </div>
  );
}
