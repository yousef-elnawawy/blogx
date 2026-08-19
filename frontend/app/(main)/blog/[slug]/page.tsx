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
  Clock,
  Heart,
  Eye,
  Share2,
  Bookmark,
  ArrowLeft,
  Pencil,
  Trash2,
  Loader2,
  Lock,
  MoreHorizontal,
} from "lucide-react";
import { getAvatarUrl, getAvatarGradient, getInitials, cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
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
  published_at: string | null;
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
}

function formatCount(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(num);
}

function formatInlineText(text: string) {
  // Bold, italic, inline code, and links
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded-md bg-muted text-xs font-mono text-primary font-semibold">
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80 font-medium"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
}

function renderBlogContent(content: string) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = (key: string | number) => {
    if (tableRows.length === 0) return;
    const headerRow = tableRows[0];
    const bodyRows = tableRows.slice(1);

    elements.push(
      <div key={`table-${key}`} className="my-6 overflow-x-auto rounded-lg border border-border/70 shadow-2xs">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-muted/70 text-foreground font-bold border-b border-border/80">
            <tr>
              {headerRow.map((cell, cIdx) => (
                <th key={cIdx} className="px-4 py-3 border-r last:border-r-0 border-border/50 text-xs sm:text-sm">
                  {formatInlineText(cell.trim())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 bg-card">
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-4 py-3 border-r last:border-r-0 border-border/40 text-xs sm:text-sm text-foreground/90">
                    {formatInlineText(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];

    // Code block check
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <div key={index} className="my-6 rounded-lg overflow-hidden border border-border/70 bg-zinc-950 dark:bg-zinc-900 text-zinc-100 p-4 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto shadow-sm">
            <pre>{codeBuffer.join("\n")}</pre>
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Markdown Table check: | col 1 | col 2 |
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      // separator row check: | --- | --- |
      if (line.includes("---")) {
        // Just header separator, ignore
        continue;
      }
      inTable = true;
      const rawCols = line.trim().slice(1, -1).split("|");
      tableRows.push(rawCols);
      continue;
    } else if (inTable) {
      flushTable(index);
    }

    // Headers with Fraunces font
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={index} className="text-lg sm:text-xl font-bold text-foreground mt-6 mb-2 font-[family-name:var(--font-fraunces)]">
          {formatInlineText(line.replace(/^###\s+/, ""))}
        </h3>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={index} className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-3 font-[family-name:var(--font-fraunces)]">
          {formatInlineText(line.replace(/^##\s+/, ""))}
        </h2>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={index} className="text-2xl sm:text-3xl font-extrabold text-foreground mt-10 mb-4 font-[family-name:var(--font-fraunces)]">
          {formatInlineText(line.replace(/^#\s+/, ""))}
        </h1>
      );
      continue;
    }

    // Blockquote / Callout
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={index}
          className="border-l-3 border-primary pl-4 py-2 my-4 italic text-foreground/85 bg-primary/5 rounded-r-md"
        >
          {formatInlineText(line.replace(/^>\s+/, ""))}
        </blockquote>
      );
      continue;
    }

    // Divider
    if (line.trim() === "---" || line.trim() === "***") {
      elements.push(<hr key={index} className="my-8 border-border/60" />);
      continue;
    }

    // Image markdown: ![alt](url)
    const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const src = imgMatch[2];
      elements.push(
        <figure key={index} className="my-6">
          <img
            src={src}
            alt={alt}
            className="w-full max-h-[500px] object-cover rounded-lg border border-border/60"
          />
          {alt && alt !== "image" && (
            <figcaption className="text-center text-xs text-muted-foreground mt-2">
              {alt}
            </figcaption>
          )}
        </figure>
      );
      continue;
    }

    // Lists
    if (line.match(/^[-*]\s+/)) {
      elements.push(
        <li key={index} className="ml-5 list-disc text-[15px] sm:text-base leading-relaxed text-foreground/90 my-1">
          {formatInlineText(line.replace(/^[-*]\s+/, ""))}
        </li>
      );
      continue;
    }

    if (line.match(/^\d+\.\s+/)) {
      elements.push(
        <li key={index} className="ml-5 list-decimal text-[15px] sm:text-base leading-relaxed text-foreground/90 my-1">
          {formatInlineText(line.replace(/^\d+\.\s+/, ""))}
        </li>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={index} className="h-3" />);
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={index} className="text-[15px] sm:text-base leading-relaxed text-foreground/90 my-2">
        {formatInlineText(line)}
      </p>
    );
  }

  if (inTable) flushTable(lines.length);

  return elements;
}

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const slug = params.slug as string;

  const [blog, setBlog] = useState<BlogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        setLiked(Boolean(blg.is_liked));
        setLikeCount(blg.likes_count || 0);
        setBookmarked(Boolean(blg.is_bookmarked));
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
      setBookmarked(res.data.is_bookmarked);
      toast.success(
        res.data.is_bookmarked
          ? "Saved to bookmarks"
          : "Removed from bookmarks"
      );
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
    <div className="min-h-screen pb-24 animate-in fade-in duration-200">
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="p-1.5 -ml-1 rounded-md hover:bg-muted transition-colors text-foreground cursor-pointer shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <span className="text-sm font-bold text-foreground truncate max-w-[200px] sm:max-w-md">
            {blog.title}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Like button in header */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={cn(
              "h-8 px-2.5 rounded-md gap-1.5 text-xs font-semibold",
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
              "size-8 p-0 rounded-md",
              bookmarked ? "text-brand-bookmark bg-brand-bookmark-subtle" : "text-muted-foreground hover:text-foreground"
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

      {/* Blog Content Container */}
      <article className="px-4 py-6 sm:px-6 max-w-2xl mx-auto">
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

        {/* Author Details Bar */}
        <div className="flex items-center justify-between py-4 border-y border-border/60 my-5 gap-3">
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

        {/* Main Content Render */}
        <div className="space-y-1 text-foreground/95 text-[15px] sm:text-base leading-relaxed tracking-normal">
          {renderBlogContent(blog.content)}
        </div>

        {/* Footer actions bar */}
        <div className="flex items-center justify-between py-4 border-t border-border/60 mt-10 gap-3">
          <div className="flex items-center gap-2">
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
              {likeCount > 0 && <span className="text-muted-foreground ml-1">({formatCount(likeCount)})</span>}
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
              <AvatarFallback className={`font-bold ${getAvatarGradient(blog.author.username || blog.author.name)}`}>
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

      {/* Share Dialog (Same as Post Share) */}
      {blog && (
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
      )}

      {/* Delete Confirmation Alert */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete blog post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your blog post &quot;{blog.title}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
