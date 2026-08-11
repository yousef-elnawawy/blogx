"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Bookmark, Share2, MoreHorizontal, Pencil, Trash2, Loader2, Repeat2, BarChart3 } from "lucide-react";
import Link from "next/link";
import { cn, getAvatarUrl } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import PostEditorDialog from "@/components/create-post/PostEditorDialog";
import ShareDialog from "@/components/post/ShareDialog";
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
import PostImageGrid from "@/components/post/PostImageGrid";
import ImageLightbox from "@/components/post/ImageLightbox";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import VideoEmbed from "@/components/post/VideoEmbed";
import api from "@/lib/api";

export interface PostCardProps {
  id: string | number;
  author: {
    id?: number;
    name: string;
    username: string;
    avatar: string | null;
    verified?: boolean;
  };
  content: string;
  images?: string[];
  mentions?: string[];
  likes_count: number;
  comments_count: number;
  views_count?: number;
  created_at: string;
  is_edited?: boolean;
  is_liked?: boolean;
  is_bookmarked?: boolean;
}

function formatCount(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(num);
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

function renderHighlighted(text: string, validMentions?: string[]) {
  const parts = text.split(/(@[\w.]+|#[\p{L}\p{N}_]+)/gu);
  return parts.map((part, i) => {
    if (part.startsWith("#")) {
      const tag = part.slice(1); // strip '#'
      return (
        <Link
          key={i}
          href={`/hashtag/${encodeURIComponent(tag)}`}
          onClick={(e) => e.stopPropagation()}
          className="text-primary font-semibold hover:underline relative z-10"
        >
          {part}
        </Link>
      );
    }
    if (part.startsWith("@")) {
      const username = part.slice(1);
      const isValid = validMentions
        ? validMentions.some((m) => m.toLowerCase() === username.toLowerCase())
        : true;

      if (!isValid) {
        return <span key={i} className="text-foreground/80">{part}</span>;
      }

      return (
        <Link
          key={i}
          href={`/@${username}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 font-semibold border border-sky-500/20 hover:border-sky-500/40 transition-colors align-baseline relative z-10"
        >
          {part}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function PostCard({
  id,
  author,
  content,
  images = [],
  mentions = [],
  likes_count,
  comments_count,
  views_count = 0,
  created_at,
  is_edited = false,
  is_liked: initialLiked = false,
  is_bookmarked: initialBookmarked = false,
}: PostCardProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [likeCount, setLikeCount] = useState(likes_count);
  const [viewCount, setViewCount] = useState(views_count);
  const [postContent, setPostContent] = useState(content);
  const [postImages, setPostImages] = useState<string[]>(images);
  const [isEdited, setIsEdited] = useState(is_edited);
  const articleRef = useRef<HTMLElement>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = Boolean(
    user && (user.username === author.username || (author.id && user.id === author.id))
  );

  useEffect(() => {
    setViewCount(views_count);
  }, [views_count]);

  useEffect(() => {
    setPostContent(content);
    setPostImages(images);
  }, [content, images]);

  useEffect(() => {
    const handlePostUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<PostCardProps>;
      if (customEvent.detail && String(customEvent.detail.id) === String(id)) {
        setPostContent(customEvent.detail.content);
        setPostImages(customEvent.detail.images || []);
        if (customEvent.detail.is_edited !== undefined) {
          setIsEdited(customEvent.detail.is_edited);
        }
      }
    };
    window.addEventListener("post-updated", handlePostUpdated);
    return () => window.removeEventListener("post-updated", handlePostUpdated);
  }, [id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLiking) return;

    const previousLiked = liked;
    const previousCount = likeCount;

    setLiked(!previousLiked);
    setLikeCount(previousLiked ? previousCount - 1 : previousCount + 1);
    setIsLiking(true);

    api
      .post(`/api/posts/${id}/like`)
      .then((res) => {
        if (res.data) {
          setLiked(res.data.is_liked);
          setLikeCount(res.data.likes_count);
        }
      })
      .catch(() => {
        setLiked(previousLiked);
        setLikeCount(previousCount);
      })
      .finally(() => {
        setIsLiking(false);
      });
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isBookmarking) return;

    const previousBookmarked = bookmarked;
    setBookmarked(!previousBookmarked);
    setIsBookmarking(true);

    api
      .post(`/api/posts/${id}/bookmark`)
      .then((res) => {
        if (res.data) {
          setBookmarked(res.data.is_bookmarked);
        }
      })
      .catch(() => {
        setBookmarked(previousBookmarked);
      })
      .finally(() => {
        setIsBookmarking(false);
      });
  };

  const handleDeletePost = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/posts/${id}`);
      toast.success("Post deleted successfully");
      window.dispatchEvent(new CustomEvent("post-deleted", { detail: { id } }));
    } catch {
      toast.error("Failed to delete post.");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const avatarSrc = getAvatarUrl(author.avatar);

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(created_at), { addSuffix: false });
    } catch {
      return "";
    }
  })();

  return (
    <>
      <article ref={articleRef} className="relative border-b border-border/60 hover:bg-muted/30 transition-colors duration-150 cursor-pointer group">
        {/* Invisible overlay link for post navigation */}
        <Link
          href={`/post/${id}`}
          className="absolute inset-0 z-0"
          aria-label={`View post by ${author.name}`}
        />

        <div className="p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-start gap-3">
            <Link
              href={`/@${author.username}`}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 relative z-10"
            >
              <Avatar className="size-10 ring-2 ring-border/40">
                <AvatarImage src={avatarSrc} alt={author.name} />
                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                  {getInitials(author.name)}
                </AvatarFallback>
              </Avatar>
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={`/@${author.username}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[15px] font-bold text-foreground hover:underline relative z-10 flex items-center gap-1"
                >
                  <span>{author.name}</span>
                  {Boolean(author.verified) && <VerifiedBadge size="sm" />}
                </Link>
                <span className="text-sm text-muted-foreground">
                  @{author.username}
                </span>
                <span className="text-sm text-muted-foreground">·</span>
                <span className="text-sm text-muted-foreground">
                  {timeAgo}
                </span>
                {isEdited && (
                  <span className="text-xs text-muted-foreground/70 italic">
                    · edited
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="mt-1.5 relative z-10">
                <p className="text-[15px] leading-[1.6] text-foreground whitespace-pre-wrap">
                  {renderHighlighted(postContent, mentions)}
                </p>
                {/* Embedded Video (YouTube, Instagram Reels, Direct Video) */}
                <VideoEmbed content={postContent} />
              </div>

              {/* Image Grid */}
              {postImages.length > 0 && (
                <div className="mt-3">
                  <PostImageGrid images={postImages} onImageClick={handleImageClick} />
                </div>
              )}

              {/* Actions Bar */}
              <div className="mt-3 flex items-center justify-between relative z-10 -ml-2">
                {/* Left actions */}
                <div className="flex items-center gap-0">
                  {/* Comments */}
                  <Link href={`/post/${id}`} onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 gap-1.5 text-xs font-medium text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-full"
                    >
                      <MessageSquare className="size-[16px]" />
                      {comments_count > 0 && <span>{formatCount(comments_count)}</span>}
                    </Button>
                  </Link>

                  {/* Like - Red Theme */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLike}
                    disabled={false}
                    className={cn(
                      "h-8 px-2 gap-1.5 text-xs font-medium rounded-full",
                      liked
                        ? "text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                    )}
                  >
                    <Heart className={cn("size-[16px]", liked && "fill-current")} />
                    {likeCount > 0 && <span>{formatCount(likeCount)}</span>}
                  </Button>

                  {/* Views */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    className="h-8 px-2 gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                  >
                    <BarChart3 className="size-[16px]" />
                    <span>{formatCount(viewCount)}</span>
                  </Button>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-0">
                  {/* Bookmark - Green Theme */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBookmark}
                    className={cn(
                      "h-8 px-2 rounded-full",
                      bookmarked
                        ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                        : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
                    )}
                  >
                    <Bookmark className={cn("size-[16px]", bookmarked && "fill-current")} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShareDialogOpen(true);
                    }}
                    className="h-8 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                  >
                    <Share2 className="size-[16px]" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Owner Dropdown */}
            {isOwner && (
              <div className="relative z-10 shrink-0" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem
                      onClick={() => setEditDialogOpen(true)}
                      className="cursor-pointer gap-2"
                    >
                      <Pencil className="h-4 w-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                      className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </article>

      <ImageLightbox
        images={postImages}
        open={lightboxOpen}
        index={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Edit Dialog */}
      <PostEditorDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        postToEdit={{ id, content: postContent, images: postImages }}
        onPostUpdated={(updatedPost) => {
          setPostContent(updatedPost.content);
          setPostImages(updatedPost.images || []);
        }}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        post={{ id, author, content: postContent, images: postImages }}
      />
    </>
  );
}