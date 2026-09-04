"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import UserBadges from "@/components/ui/UserBadges";
import ShareDialog from "@/components/post/ShareDialog";
import SaveToCollectionDialog from "@/components/bookmarks/SaveToCollectionDialog";
import {
  Clock,
  Heart,
  Eye,
  Share2,
  Bookmark,
  ArrowLeft,
  Pencil,
  Trash2,
  Loader2,
  MoreHorizontal,
  Headphones,
  Highlighter,
  Sparkles,
} from "lucide-react";
import { getAvatarUrl, getAvatarGradient, getInitials, cn } from "@/lib/utils";
import { format } from "date-fns";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import RichBlogContent from "@/components/blog/RichBlogContent";
import SeriesNavigationBanner from "@/components/blog/SeriesNavigationBanner";
import BlogReadingProgressBar from "@/components/blog/BlogReadingProgressBar";
import BlogTableOfContents from "@/components/blog/BlogTableOfContents";
import BlogAudioPlayer from "@/components/blog/BlogAudioPlayer";
import BlogTextSelectionToolbar from "@/components/blog/BlogTextSelectionToolbar";
import BlogAnnotationsDrawer, { AnnotationItem } from "@/components/blog/BlogAnnotationsDrawer";
import BlogQuotePostModal from "@/components/blog/BlogQuotePostModal";

export interface BlogDetail {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image: string | null;
  tags: string[];
  read_time: number;
  status: string;
  views_count: number;
  likes_count: number;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  published_at: string | null;
  created_at: string | null;
  series?: any;
  author: {
    id: number | null;
    name: string;
    username: string;
    avatar: string | null;
    bio?: string | null;
    verified?: boolean;
    equipped_badges?: string[] | null;
  };
}

function formatCount(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(num);
}

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const slug = params.slug as string;

  const articleRef = useRef<HTMLElement>(null);

  const [blog, setBlog] = useState<BlogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [saveToCollectionOpen, setSaveToCollectionOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Interactive Reader Features State
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [audioPlayerOpen, setAudioPlayerOpen] = useState(false);
  const [activeSentenceText, setActiveSentenceText] = useState<string | null>(null);
  const [annotationsDrawerOpen, setAnnotationsDrawerOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quotedTextForModal, setQuotedTextForModal] = useState("");

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);

    let cleanSlug = slug;
    try {
      cleanSlug = decodeURIComponent(decodeURIComponent(slug));
    } catch {
      try {
        cleanSlug = decodeURIComponent(slug);
      } catch {
        cleanSlug = slug;
      }
    }

    api
      .get(`/api/blogs/${encodeURIComponent(cleanSlug)}`)
      .then((res) => {
        const blg = res.data.blog || res.data.article;
        setBlog(blg);
        if (blg?.title) {
          document.title = `${blg.title} — BlogX Stories`;
        }
        setLiked(Boolean(blg.is_liked));
        setLikeCount(blg.likes_count || 0);
        setBookmarked(Boolean(blg.is_bookmarked));

        // Load annotations for this blog
        api
          .get(`/api/blogs/${encodeURIComponent(cleanSlug)}/annotations`)
          .then((annotRes) => {
            setAnnotations(annotRes.data.annotations || []);
          })
          .catch(() => {});
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const isOwner = Boolean(
    user && blog?.author?.username && user.username === blog.author.username
  );

  const handleShare = () => {
    setShareDialogOpen(true);
  };

  const handleLike = async () => {
    if (!user) {
      toast.error("Please sign in to like blog posts");
      return;
    }
    if (!blog || isLiking) return;

    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
    setIsLiking(true);

    try {
      const res = await api.post(`/api/blogs/${blog.id}/like`);
      setLiked(res.data.is_liked);
      setLikeCount(res.data.likes_count);
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      toast.error("Failed to update like");
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      toast.error("Please sign in to bookmark blog posts");
      return;
    }
    if (!blog || isBookmarking) return;

    const prevBookmarked = bookmarked;
    setBookmarked(!prevBookmarked);
    setIsBookmarking(true);

    try {
      const res = await api.post(`/api/blogs/${blog.id}/bookmark`);
      const isSaved = Boolean(res.data.is_bookmarked);
      setBookmarked(isSaved);
      if (isSaved) {
        setSaveToCollectionOpen(true);
      } else {
        toast.success("Removed from bookmarks");
      }
    } catch {
      setBookmarked(prevBookmarked);
      toast.error("Failed to update bookmark");
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleDelete = async () => {
    if (!blog) return;
    setDeleting(true);
    try {
      await api.delete(`/api/blogs/${blog.id}`);
      toast.success("Blog post deleted successfully");
      router.push("/blogs");
    } catch {
      toast.error("Failed to delete blog post");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Annotation handlers
  const handleHighlightAdded = (newAnnotation: AnnotationItem) => {
    setAnnotations((prev) => [
      newAnnotation,
      ...prev.filter((a) => a.id !== newAnnotation.id),
    ]);
  };

  const handleAnnotationDeleted = (id: number) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  };

  const handleQuoteRequested = (text: string) => {
    setQuotedTextForModal(text);
    setQuoteModalOpen(true);
  };

  const handleJumpToText = (text: string) => {
    if (!articleRef.current) return;
    const marks = articleRef.current.querySelectorAll("mark");
    for (let i = 0; i < marks.length; i++) {
      if (marks[i].textContent?.includes(text.slice(0, 30))) {
        marks[i].scrollIntoView({ behavior: "smooth", block: "center" });
        marks[i].classList.add("ring-2", "ring-primary");
        setTimeout(() => {
          marks[i].classList.remove("ring-2", "ring-primary");
        }, 2000);
        return;
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading blog post...</p>
      </div>
    );
  }

  if (notFound || !blog) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <h2 className="text-xl font-bold text-foreground font-[family-name:var(--font-fraunces)]">
          Blog Post Not Found
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The blog post you are looking for does not exist or may have been deleted.
        </p>
        <Link href="/blogs">
          <Button variant="default" className="rounded-md mt-2">
            Browse all posts
          </Button>
        </Link>
      </div>
    );
  }

  const publishDateFormatted = (() => {
    const rawDate = blog.published_at || blog.created_at;
    if (!rawDate) return "Recently";
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return "Recently";
      return format(d, "MMM d, yyyy");
    } catch {
      return "Recently";
    }
  })();

  return (
    <div className="min-h-screen pb-24 animate-in fade-in duration-200 relative">
      {/* 1. Top Reading Progress Bar */}
      <BlogReadingProgressBar targetRef={articleRef} showBadge={false} />

      {/* Top Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60 px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => router.back()}
            className="p-1.5 -ml-1 rounded-md hover:bg-muted transition-colors text-foreground cursor-pointer shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <span className="text-sm font-bold text-foreground truncate max-w-[160px] sm:max-w-xs md:max-w-md">
            {blog.title}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Audio Player Quick Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAudioPlayerOpen((prev) => !prev)}
            className={cn(
              "h-8 px-2 rounded-md gap-1.5 text-xs font-semibold cursor-pointer",
              audioPlayerOpen && "text-primary bg-primary/10"
            )}
            title={audioPlayerOpen ? "Close audio reader" : "Listen to article"}
          >
            <Headphones className="size-4" />
            <span className="hidden md:inline">Listen</span>
          </Button>

          {/* Table of Contents Floating Dropdown */}
          <BlogTableOfContents
            content={blog.content}
            variant="floating-popover"
          />

          {/* Reader Notes & Highlights Drawer Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAnnotationsDrawerOpen(true)}
            className={cn(
              "h-8 px-2 rounded-md gap-1 text-xs font-semibold cursor-pointer",
              annotations.length > 0 ? "text-amber-500" : "text-muted-foreground hover:text-foreground"
            )}
            title="View reader notes and highlights"
          >
            <Highlighter className="size-4" />
            {annotations.length > 0 && (
              <span className="text-[11px] font-mono">{annotations.length}</span>
            )}
          </Button>

          {/* Like button in header */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={cn(
              "h-8 px-2.5 rounded-md gap-1.5 text-xs font-semibold cursor-pointer",
              liked && "text-rose-500 hover:text-rose-600"
            )}
          >
            <Heart className={cn("size-4", liked && "fill-current")} />
            {likeCount > 0 && <span>{formatCount(likeCount)}</span>}
          </Button>

          {/* Bookmark */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBookmark}
            className={cn(
              "size-8 p-0 rounded-md cursor-pointer",
              bookmarked
                ? "text-brand-bookmark bg-brand-bookmark-subtle"
                : "text-muted-foreground hover:text-foreground"
            )}
            title={bookmarked ? "Remove from bookmarks" : "Save to bookmarks"}
          >
            <Bookmark className={cn("size-4", bookmarked && "fill-current")} />
          </Button>

          {/* Share */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="size-8 p-0 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
            title="Share article"
          >
            <Share2 className="size-4" />
          </Button>

          {/* Owner actions */}
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0 rounded-md text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-40 rounded-lg">
                <DropdownMenuItem
                  onClick={() => router.push(`/blogs/${blog.slug}/edit`)}
                  className="gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer"
                >
                  <Pencil className="size-3.5" />
                  <span>Edit Post</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  <span>Delete Post</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Main Blog Content Container */}
      <article ref={articleRef} className="px-4 py-6 sm:px-6 max-w-2xl mx-auto relative">
        {/* Medium-style Floating Text Selection Toolbar */}
        <BlogTextSelectionToolbar
          blogId={blog.id}
          containerRef={articleRef}
          onHighlightAdded={handleHighlightAdded}
          onQuoteRequested={handleQuoteRequested}
        />

        {/* Tags */}
        {blog.tags && blog.tags.length > 0 && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {blog.tags.map((tag) => (
              <Link
                key={tag}
                href={`/hashtag/${encodeURIComponent(tag)}`}
                className="px-2.5 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight mb-4 font-[family-name:var(--font-fraunces)]">
          {blog.title}
        </h1>

        {/* Author Details & Audio Listen Bar */}
        <div className="py-4 border-y border-border/60 my-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Link
              href={`/@${blog.author.username}`}
              className="flex items-center gap-3 group min-w-0"
            >
              <Avatar className="size-11 ring-2 ring-border/40">
                <AvatarImage src={getAvatarUrl(blog.author.avatar)} alt={blog.author.name} />
                <AvatarFallback>{getInitials(blog.author.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-bold text-foreground group-hover:underline truncate">
                    {blog.author.name}
                  </span>
                  {Boolean(blog.author.verified) && <VerifiedBadge size="sm" />}
                  <UserBadges equippedBadges={blog.author.equipped_badges} size="sm" />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span>@{blog.author.username}</span>
                  <span>·</span>
                  <span>{publishDateFormatted}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {blog.read_time} min read
                  </span>
                </div>
              </div>
            </Link>

            {/* Audio Reader Trigger Button in Hero */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAudioPlayerOpen((prev) => !prev)}
              className={cn(
                "rounded-full gap-2 text-xs font-semibold h-8 px-3.5 cursor-pointer transition-all",
                audioPlayerOpen
                  ? "bg-primary/10 text-primary border-primary/40 shadow-xs"
                  : "bg-card/70 hover:bg-muted/60 text-foreground"
              )}
            >
              <Headphones className="size-3.5 text-primary" />
              <span>Listen</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                ~{blog.read_time} min
              </span>
            </Button>
          </div>

          {/* Audio Player Embedded / Expanded Box */}
          {audioPlayerOpen && (
            <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <BlogAudioPlayer
                title={blog.title}
                content={blog.content}
                authorName={blog.author.name}
                onActiveSentenceChange={(idx, text) => {
                  setActiveSentenceText(text);
                }}
                onClose={() => {
                  setAudioPlayerOpen(false);
                  setActiveSentenceText(null);
                }}
              />
            </div>
          )}
        </div>

        {/* Cover Image */}
        {blog.cover_image && (
          <div className="mb-6 rounded-lg overflow-hidden border border-border/60 shadow-sm">
            <img
              src={getAvatarUrl(blog.cover_image)}
              alt={blog.title}
              className="w-full max-h-[420px] object-cover"
            />
          </div>
        )}

        {/* Series Badge Indicator (Top) */}
        {blog.series && (
          <div className="mb-4">
            <Link
              href={`/series/${blog.series.slug}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted/50 hover:bg-muted text-xs font-semibold text-foreground/80 hover:text-foreground border border-border/60 transition-colors"
            >
              <span className="text-primary font-bold">
                Part {blog.series.current_part} of {blog.series.total_parts}
              </span>
              <span className="text-muted-foreground">in</span>
              <span className="font-bold underline underline-offset-2">
                {blog.series.title}
              </span>
            </Link>
          </div>
        )}

        {/* 2. Interactive Table of Contents (Inline Card) */}
        <BlogTableOfContents content={blog.content} variant="inline" />

        {/* 3. Main Rich Content Render with Highlights, Active Spoken Sentence & Anchor Headings */}
        <div className="space-y-1 text-foreground/95 text-[15px] sm:text-base leading-relaxed tracking-normal">
          <RichBlogContent
            content={blog.content}
            annotations={annotations}
            activeSentenceText={activeSentenceText}
            onAnnotationClick={() => {
              setAnnotationsDrawerOpen(true);
            }}
          />
        </div>

        {/* Series Navigation Banner (Bottom) */}
        {blog.series && (
          <div className="mt-8">
            <SeriesNavigationBanner series={blog.series} />
          </div>
        )}

        {/* Footer actions bar */}
        <div className="flex items-center justify-between py-4 border-t border-border/60 mt-10 gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLike}
              className={cn(
                "rounded-full gap-1.5 text-xs font-semibold h-9 px-4 cursor-pointer",
                liked && "text-rose-500 border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10"
              )}
            >
              <Heart className={cn("size-4", liked && "fill-current")} />
              <span>{liked ? "Liked" : "Like"}</span>
              {likeCount > 0 && (
                <span className="text-muted-foreground ml-1">({formatCount(likeCount)})</span>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleBookmark}
              className={cn(
                "rounded-full gap-1.5 text-xs font-semibold h-9 px-4 cursor-pointer",
                bookmarked && "text-brand-bookmark border-brand-bookmark/40 bg-brand-bookmark-subtle"
              )}
            >
              <Bookmark className={cn("size-4", bookmarked && "fill-current")} />
              <span>{bookmarked ? "Saved" : "Save"}</span>
            </Button>

            {/* Notes & Highlights Footer Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnnotationsDrawerOpen(true)}
              className={cn(
                "rounded-full gap-1.5 text-xs font-semibold h-9 px-4 cursor-pointer",
                annotations.length > 0 && "text-amber-500 border-amber-500/40 bg-amber-500/5"
              )}
            >
              <Highlighter className="size-4" />
              <span>Notes</span>
              {annotations.length > 0 && (
                <span className="text-muted-foreground font-mono">({annotations.length})</span>
              )}
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="rounded-full gap-1.5 text-xs font-semibold h-9 px-4 cursor-pointer"
          >
            <Share2 className="size-4" />
            <span>Share</span>
          </Button>
        </div>

        {/* Author Bio Card at Bottom */}
        <div className="p-5 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm mt-8 flex items-start gap-4 shadow-sm">
          <Link href={`/@${blog.author.username}`}>
            <Avatar className="size-12 ring-2 ring-primary/20">
              <AvatarImage src={getAvatarUrl(blog.author.avatar)} alt={blog.author.name} />
              <AvatarFallback
                className={`font-bold ${getAvatarGradient(
                  blog.author.username || blog.author.name
                )}`}
              >
                {getInitials(blog.author.name)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
              <Link href={`/@${blog.author.username}`} className="hover:underline">
                <h4 className="text-base font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                  <span>{blog.author.name}</span>
                  {Boolean(blog.author.verified) && <VerifiedBadge size="sm" />}
                  <UserBadges equippedBadges={blog.author.equipped_badges} size="sm" />
                </h4>
              </Link>
              <Link href={`/@${blog.author.username}`}>
                <Button size="sm" variant="outline" className="h-7 px-3 text-xs rounded-md">
                  View Profile
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mb-2">@{blog.author.username}</p>
            {blog.author.bio && (
              <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">
                {blog.author.bio}
              </p>
            )}
          </div>
        </div>
      </article>

      {/* Reader Annotations & Highlights Drawer */}
      {blog && (
        <BlogAnnotationsDrawer
          open={annotationsDrawerOpen}
          onOpenChange={setAnnotationsDrawerOpen}
          blogId={blog.id}
          annotations={annotations}
          onAnnotationDeleted={handleAnnotationDeleted}
          onJumpToText={handleJumpToText}
        />
      )}

      {/* Quote Post Modal */}
      {blog && (
        <BlogQuotePostModal
          open={quoteModalOpen}
          onOpenChange={setQuoteModalOpen}
          blog={{
            id: blog.id,
            title: blog.title,
            slug: blog.slug,
            author: {
              name: blog.author.name,
              username: blog.author.username,
            },
          }}
          quotedText={quotedTextForModal}
        />
      )}

      {/* Share Dialog */}
      {blog && (
        <>
          <ShareDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            post={{
              id: blog.id,
              type: "blog",
              title: blog.title,
              slug: blog.slug,
              author: blog.author,
              content: blog.excerpt || blog.content || blog.title,
              cover_image: blog.cover_image,
            }}
          />

          <SaveToCollectionDialog
            open={saveToCollectionOpen}
            onOpenChange={setSaveToCollectionOpen}
            blogId={blog.id}
          />
        </>
      )}

      {/* Delete Confirmation Alert */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete blog post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your blog post &quot;
              {blog.title}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
