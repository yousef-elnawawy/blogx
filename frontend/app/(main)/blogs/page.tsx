"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BlogCard, { BlogItem } from "@/components/blog/BlogCard";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Plus,
  Search,
  Loader2,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowRight,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { getAvatarUrl, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import UserBadges from "@/components/ui/UserBadges";

export default function BlogsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [featured, setFeatured] = useState<BlogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Fetch featured blog
  useEffect(() => {
    setFeaturedLoading(true);
    api
      .get("/api/blogs/featured")
      .then((res) => {
        const item = res.data.blog || res.data.article;
        setFeatured(item);
      })
      .catch(() => {})
      .finally(() => setFeaturedLoading(false));
  }, []);

  // Fetch blogs list
  const fetchBlogs = useCallback(
    async (pageNum = 1, append = false) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const params: Record<string, any> = { page: pageNum };
        if (searchQuery.trim()) params.q = searchQuery.trim();
        if (selectedTag) params.tag = selectedTag;

        const res = await api.get("/api/blogs", { params });
        const items: BlogItem[] = res.data.data ?? [];
        setBlogs((prev) => (append ? [...prev, ...items] : items));
        setHasMore(Boolean(res.data.next_page_url));
        setPage(pageNum);
      } catch {
        // silent
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [searchQuery, selectedTag]
  );

  useEffect(() => {
    fetchBlogs(1, false);
  }, [fetchBlogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBlogs(1, false);
  };

  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null);
    } else {
      setSelectedTag(tag);
    }
  };

  const POPULAR_TOPICS = [
    "Laravel",
    "React",
    "Next.js",
    "PHP",
    "TypeScript",
    "TailwindCSS",
    "Architecture",
    "AI",
  ];

  return (
    <div className="min-h-screen pb-24 divide-y divide-border/60 animate-in fade-in duration-200">
      {/* ── 1. Top Header Bar ── */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60 px-4 py-3 sm:px-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <BookOpen className="size-4" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight font-[family-name:var(--font-fraunces)]">
              Blog & Stories
            </h1>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              In-depth articles, engineering notes, and tutorials
            </p>
          </div>
        </div>

        {/* Action Button: Full-page editor */}
        <Button
          onClick={() => router.push("/blogs/new")}
          className="rounded-md text-xs font-bold gap-1.5 h-8.5 px-3.5 sm:px-4"
        >
          <Plus className="size-3.5" />
          <span>Write Blog</span>
        </Button>
      </div>

      {/* ── 2. Search & Tag Filter Bar ── */}
      <div className="p-4 sm:p-5 bg-card/30 space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles by title, topic, or content..."
            className="w-full h-10 pl-9 pr-4 text-xs sm:text-sm bg-background border border-border/80 rounded-md placeholder:text-muted-foreground/70 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </form>

        {/* Popular Topic Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
          <span className="text-[11px] font-semibold text-muted-foreground shrink-0 mr-1">
            Topics:
          </span>
          {POPULAR_TOPICS.map((topic) => {
            const active = selectedTag === topic;
            return (
              <button
                key={topic}
                type="button"
                onClick={() => handleTagClick(topic)}
                className={`px-3 py-1 rounded-md font-medium shrink-0 transition-all cursor-pointer ${
                  active
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-muted/70 hover:bg-muted text-foreground/80"
                }`}
              >
                #{topic}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. Featured Story Showcase (Laravel News / Blog style) ── */}
      {!searchQuery && !selectedTag && featured && (
        <section className="p-4 sm:p-6 bg-gradient-to-b from-primary/5 via-card/20 to-transparent border-b border-border/60">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-500 mb-3 uppercase tracking-wider">
            <Sparkles className="size-3.5" />
            <span>Featured Publication</span>
          </div>

          <div className="flex flex-col md:flex-row gap-5 items-start">
            {/* Cover photo */}
            {featured.cover_image && (
              <Link
                href={`/blog/${featured.slug}`}
                className="w-full md:w-5/12 h-52 sm:h-64 rounded-lg overflow-hidden border border-border/60 bg-muted shrink-0 block group shadow-xs"
              >
                <img
                  src={getAvatarUrl(featured.cover_image)}
                  alt={featured.title}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                />
              </Link>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-2.5">
              <Link href={`/@${featured.author.username}`} className="flex items-center gap-2 group text-xs">
                <Avatar className="size-6 ring-1 ring-border/50">
                  <AvatarImage src={getAvatarUrl(featured.author.avatar)} alt={featured.author.name} />
                  <AvatarFallback>{getInitials(featured.author.name)}</AvatarFallback>
                </Avatar>
                <span className="font-bold text-foreground group-hover:underline">
                  {featured.author.name}
                </span>
                {Boolean(featured.author.verified) && <VerifiedBadge size="sm" />}
                <UserBadges equippedBadges={featured.author.equipped_badges} size="xs" />
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {featured.read_time} min read
                </span>
              </Link>

              <Link href={`/blog/${featured.slug}`} className="block group">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight font-[family-name:var(--font-fraunces)]">
                  {featured.title}
                </h2>
              </Link>

              {featured.excerpt && (
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {featured.excerpt}
                </p>
              )}

              <div className="pt-2">
                <Link
                  href={`/blog/${featured.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <span>Read full story</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 4. Main Articles Feed ── */}
      <div className="divide-y divide-border/60">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading blog posts...</p>
          </div>
        ) : blogs.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <div className="mx-auto flex size-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="size-7" />
            </div>
            <h3 className="text-base font-bold text-foreground font-[family-name:var(--font-fraunces)]">
              No blog posts found
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {searchQuery || selectedTag
                ? "Try adjusting your search terms or filters."
                : "Be the first to publish a comprehensive blog post on BlogX!"}
            </p>
            <Button
              onClick={() => router.push("/blogs/new")}
              className="rounded-md text-xs font-bold mt-2"
            >
              Write a Blog Post
            </Button>
          </div>
        ) : (
          <>
            {blogs.map((b) => (
              <BlogCard key={b.id} blog={b} />
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="p-4 text-center">
                <Button
                  variant="outline"
                  onClick={() => fetchBlogs(page + 1, true)}
                  disabled={loadingMore}
                  className="rounded-md text-xs font-semibold px-6"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                      Loading...
                    </>
                  ) : (
                    "Load More Posts"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
