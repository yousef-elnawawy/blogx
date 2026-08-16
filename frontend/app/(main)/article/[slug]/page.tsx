"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  Bookmark,
  Share2,
  Clock,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  UserPlus,
  Check,
  Calendar,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import ShareDialog from "@/components/post/ShareDialog";
import ArticleEditorDialog from "@/components/article/ArticleEditorDialog";
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
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { getAvatarUrl, cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";

interface ArticleDetail {
  id: number;
  title: string;
  slug: string;
  content: string;
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
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(num);
}

function formatInlineText(line: string): React.ReactNode {
  const regex = /(\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s]+|www\.[^\s]+)/gu;
  const parts = line.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;

    const mdMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (mdMatch) {
      const label = mdMatch[1];
      let href = mdMatch[2].trim();
      if (!href.startsWith("http://") && !href.startsWith("https://")) {
        href = `https://${href}`;
      }
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="url-link font-semibold"
        >
          {label}
        </a>
      );
    }

    if (/^(https?:\/\/|www\.)/i.test(part)) {
      let cleanUrl = part;
      let trailing = "";
      const matchTrailing = cleanUrl.match(/[.,!?:;)]+$/);
      if (matchTrailing) {
        trailing = matchTrailing[0];
        cleanUrl = cleanUrl.slice(0, -trailing.length);
      }

      const safeHref = cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`;

      return (
        <span key={i} className="inline">
          <a
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="url-link"
          >
            {cleanUrl}
          </a>
          {trailing}
        </span>
      );
    }

    return <span key={i}>{part}</span>;
  });
}

// Simple Markdown / HTML renderer for rich article text
function renderArticleContent(text: string) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  lines.forEach((line, index) => {
    // Code block check
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${index}`}
            className="p-4 my-3 rounded-xl bg-muted/80 text-foreground font-mono text-xs sm:text-sm overflow-x-auto border border-border/60"
          >
            <code>{codeBuffer.join("\n")}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={index} className="text-lg sm:text-xl font-bold text-foreground mt-6 mb-2">
          {formatInlineText(line.replace(/^###\s+/, ""))}
        </h3>
      );
      return;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={index} className="text-xl sm:text-2xl font-bold text-foreground mt-7 mb-2.5">
          {formatInlineText(line.replace(/^##\s+/, ""))}
        </h2>
      );
      return;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={index} className="text-2xl sm:text-3xl font-extrabold text-foreground mt-8 mb-3">
          {formatInlineText(line.replace(/^#\s+/, ""))}
        </h1>
      );
      return;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={index}
          className="border-l-4 border-primary pl-4 py-1.5 my-3 italic text-muted-foreground bg-primary/5 rounded-r-lg"
        >
          {formatInlineText(line.replace(/^>\s+/, ""))}
        </blockquote>
      );
      return;
    }

    // Divider
    if (line.trim() === "---" || line.trim() === "***") {
      elements.push(<hr key={index} className="my-6 border-border/60" />);
      return;
    }

    // Image markdown: ![alt](url)
    const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const src = imgMatch[2];
      elements.push(
        <figure key={index} className="my-4">
          <img
            src={src}
            alt={alt}
            className="w-full max-h-[480px] object-cover rounded-2xl border border-border/60"
          />
          {alt && alt !== "image" && (
            <figcaption className="text-center text-xs text-muted-foreground mt-1.5">
              {alt}
            </figcaption>
          )}
        </figure>
      );
      return;
    }

    // Lists
    if (line.match(/^[-*]\s+/)) {
      elements.push(
        <li key={index} className="ml-5 list-disc text-[15px] leading-relaxed text-foreground/90 my-1">
          {formatInlineText(line.replace(/^[-*]\s+/, ""))}
        </li>
      );
      return;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={index} className="h-3" />);
      return;
    }

    // Paragraph
    elements.push(
      <p key={index} className="text-[16px] leading-[1.75] text-foreground/90 my-2 font-normal">
        {formatInlineText(line)}
      </p>
    );
  });

  return elements;
}

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const slug = params.slug as string;

  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
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
      .get(`/api/articles/${encodeURIComponent(cleanSlug)}`)
      .then((res) => {
        const art = res.data.article;
        setArticle(art);
        setLiked(Boolean(art.is_liked));
        setLikeCount(art.likes_count || 0);
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const isOwner = Boolean(
    user && article?.author?.username && user.username === article.author.username
  );

  const handleLike = async () => {
    if (!user) {
      toast.error("Please sign in to like articles");
      return;
    }
    if (!article || isLiking) return;

    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
    setIsLiking(true);

    try {
      const res = await api.post(`/api/articles/${article.id}/like`);
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

  const handleDelete = async () => {
    if (!article) return;
    setDeleting(true);
    try {
      await api.delete(`/api/articles/${article.id}`);
      toast.success("Article deleted successfully");
      router.push(user ? `/@${user.username}` : "/");
    } catch {
      toast.error("Failed to delete article");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground mt-3">Loading article...</p>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-bold text-foreground mb-2">Article Not Found</h2>
        <p className="text-sm text-muted-foreground mb-6">
          The article you are looking for does not exist or has been removed.
        </p>
        <Button onClick={() => router.push("/")} className="rounded-full">
          Back to Feed
        </Button>
      </div>
    );
  }

  const publishDateFormatted = (() => {
    const d = article.published_at || article.created_at;
    if (!d) return "";
    try {
      return format(new Date(d), "MMM d, yyyy");
    } catch {
      return "";
    }
  })();

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="min-h-screen pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <span className="text-sm font-bold text-foreground truncate max-w-[200px] sm:max-w-[320px]">
            {article.title}
          </span>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={cn(
              "h-8 px-2.5 gap-1.5 text-xs font-semibold rounded-full",
              liked ? "text-rose-500 hover:text-rose-600 bg-rose-500/10" : "text-muted-foreground hover:text-rose-500"
            )}
          >
            <Heart className={cn("size-4", liked && "fill-current")} />
            {likeCount > 0 && <span>{formatCount(likeCount)}</span>}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShareDialogOpen(true)}
            className="h-8 px-2 rounded-full text-muted-foreground hover:text-foreground"
          >
            <Share2 className="size-4" />
          </Button>

          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 sm:size-7.5 p-0 rounded-full text-muted-foreground/70 hover:text-foreground hover:bg-muted/80 active:scale-95 transition-all cursor-pointer"
                    title="More options"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-40 p-1">
                <DropdownMenuItem
                  onClick={() => setEditDialogOpen(true)}
                  className="gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer"
                >
                  <Pencil className="size-3.5 text-muted-foreground" />
                  <span>Edit Article</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  <span>Delete Article</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Article Content Container */}
      <article className="px-4 py-6 sm:px-6 max-w-2xl mx-auto">
        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {article.tags.map((tag) => (
              <Link
                key={tag}
                href={`/hashtag/${encodeURIComponent(tag)}`}
                className="px-2.5 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-tight mb-4">
          {article.title}
        </h1>

        {/* Author Details Bar */}
        <div className="flex items-center justify-between py-4 border-y border-border/60 my-5 gap-3">
          <Link
            href={`/@${article.author.username}`}
            className="flex items-center gap-3 group min-w-0"
          >
            <Avatar className="size-11 ring-2 ring-border/40">
              <AvatarImage src={getAvatarUrl(article.author.avatar)} alt={article.author.name} />
              <AvatarFallback>{getInitials(article.author.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-foreground group-hover:underline truncate">
                  {article.author.name}
                </span>
                {article.author.verified && <VerifiedBadge size="sm" />}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span>@{article.author.username}</span>
                <span>·</span>
                <span>{publishDateFormatted}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {article.read_time} min read
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Cover Image */}
        {article.cover_image && (
          <div className="mb-6 rounded-2xl overflow-hidden border border-border/60 shadow-sm">
            <img
              src={getAvatarUrl(article.cover_image)}
              alt={article.title}
              className="w-full max-h-[420px] object-cover"
            />
          </div>
        )}

        {/* Main Formatted Body */}
        <div className="article-body leading-relaxed">
          {renderArticleContent(article.content)}
        </div>

        {/* Footer Interaction Bar */}
        <div className="flex items-center justify-between py-4 border-t border-border/60 mt-10">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLike}
              className={cn(
                "rounded-full text-xs font-semibold gap-1.5 h-9 px-4",
                liked && "border-rose-500/50 text-rose-500 bg-rose-500/10"
              )}
            >
              <Heart className={cn("size-4", liked && "fill-current text-rose-500")} />
              <span>{likeCount} {likeCount === 1 ? "Like" : "Likes"}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShareDialogOpen(true)}
              className="rounded-full text-xs font-semibold gap-1.5 h-9 px-3 text-muted-foreground hover:text-foreground"
            >
              <Share2 className="size-4" />
              Share
            </Button>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {article.views_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <Eye className="size-3.5" />
                {formatCount(article.views_count)} views
              </span>
            )}
          </div>
        </div>

        {/* Author Bio Box */}
        <div className="mt-8 p-5 rounded-2xl bg-muted/30 border border-border/60 flex items-start gap-4">
          <Link href={`/@${article.author.username}`}>
            <Avatar className="size-14 ring-2 ring-border/40 shrink-0">
              <AvatarImage src={getAvatarUrl(article.author.avatar)} alt={article.author.name} />
              <AvatarFallback>{getInitials(article.author.name)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
              <div>
                <Link
                  href={`/@${article.author.username}`}
                  className="text-base font-bold text-foreground hover:underline flex items-center gap-1"
                >
                  <span>{article.author.name}</span>
                  {article.author.verified && <VerifiedBadge size="sm" />}
                </Link>
                <p className="text-xs text-muted-foreground">@{article.author.username}</p>
              </div>

              <Link href={`/@${article.author.username}`}>
                <Button size="sm" variant="outline" className="rounded-full text-xs h-8 px-4 font-semibold">
                  View Profile
                </Button>
              </Link>
            </div>

            {article.author.bio && (
              <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed mt-2 line-clamp-3">
                {article.author.bio}
              </p>
            )}
          </div>
        </div>
      </article>

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        post={{
          id: article.id,
          author: {
            name: article.author.name,
            username: article.author.username,
            avatar: article.author.avatar,
          },
          content: article.title,
          images: article.cover_image ? [article.cover_image] : [],
        }}
      />

      {/* Edit Dialog */}
      {isOwner && (
        <ArticleEditorDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          initialData={article}
          onSaved={(updated) => {
            setArticle(updated);
            setLiked(Boolean(updated.is_liked));
            setLikeCount(updated.likes_count || 0);
          }}
        />
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{article.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
