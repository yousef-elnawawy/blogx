"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Bookmark, Share2, MoreHorizontal, Pencil, Trash2, Loader2, Repeat2, BarChart3, Pin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn, getAvatarUrl, getAvatarGradient, getInitials } from "@/lib/utils";
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
import UserBadges from "@/components/ui/UserBadges";
import VideoEmbed from "@/components/post/VideoEmbed";
import LinkPreviewCard from "@/components/post/LinkPreviewCard";
import api from "@/lib/api";

export interface PostCardProps {
  id: string | number;
  author: {
    id?: number;
    name: string;
    username: string;
    avatar: string | null;
    verified?: boolean;
    equipped_badges?: string[] | null;
  };
  content: string;
  images?: string[];
  mentions?: string[];
  likes_count: number;
  comments_count: number;
  views_count?: number;
  created_at: string;
  is_edited?: boolean;
  is_pinned?: boolean;
  showPinnedBadge?: boolean;
  status?: string;
  scheduled_at?: string | null;
  is_liked?: boolean;
  is_bookmarked?: boolean;
}

function formatCount(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(num);
}

function renderHighlighted(text: string, validMentions?: string[]) {
  const regex = /(https?:\/\/[^\s]+|www\.[^\s]+|@[\w.]+|#[\p{L}\p{N}_]+)/gu;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;

    if (part.startsWith("#") && part.length > 1) {
      const tag = part.slice(1);
      return (
        <Link
          key={i}
          href={`/hashtag/${encodeURIComponent(tag)}`}
          onClick={(e) => e.stopPropagation()}
          className="hashtag-link relative z-10"
        >
          {part}
        </Link>
      );
    }

    if (part.startsWith("@") && part.length > 1) {
      const username = part.slice(1);
      const isValid = validMentions
        ? validMentions.some((m) => m.toLowerCase() === username.toLowerCase())
        : true;

      if (!isValid) {
        return <span key={i}>{part}</span>;
      }

      return (
        <Link
          key={i}
          href={`/@${username}`}
          onClick={(e) => e.stopPropagation()}
          className="mention-link relative z-10"
        >
          {part}
        </Link>
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
            onClick={(e) => e.stopPropagation()}
            className="url-link relative z-10"
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
  is_pinned: initialPinned = false,
  showPinnedBadge = false,
  is_liked: initialLiked = false,
  is_bookmarked: initialBookmarked = false,
}: PostCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [likeCount, setLikeCount] = useState(likes_count);
  const [viewCount, setViewCount] = useState(views_count);
  const [postContent, setPostContent] = useState(content);
  const [postImages, setPostImages] = useState<string[]>(images);
  const [isEdited, setIsEdited] = useState(is_edited);
  const [isPinned, setIsPinned] = useState(initialPinned);
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
    setIsPinned(Boolean(initialPinned));
  }, [content, images, initialPinned]);

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

    if (!user) {
      toast.error("Sign in to like posts");
      return;
    }

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

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await api.post(`/api/posts/${id}/pin`);
      const newPinned = res.data.is_pinned;
      setIsPinned(newPinned);
      toast.success(newPinned ? "Post pinned to your profile" : "Post unpinned from profile");
    } catch {
      toast.error("Failed to update pin status");
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

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't navigate if user clicked on an interactive element (buttons, links, menus, inputs, dialogs)
    if (
      target.closest('a, button, input, textarea, select, [role="button"], [role="menuitem"], [role="dialog"], [data-interactive]')
    ) {
      return;
    }
    // Don't navigate if user is selecting text
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      return;
    }
    router.push(`/post/${id}`);
  };

  return (
    <>
      <article
        ref={articleRef}
        onClick={handleCardClick}
        className="relative border-b border-border hover:bg-muted/25 dark:hover:bg-muted/15 transition-colors duration-150 cursor-pointer group"
      >
        <div className="p-4 sm:p-5">
          {/* Pinned Post Badge */}
          {showPinnedBadge && isPinned && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-500 mb-2 pl-9">
              <Pin className="size-3.5 rotate-45 fill-current" />
              <span>Pinned Post</span>
            </div>
          )}

          {/* Header */}
          <div className="flex items-start gap-3">
            <Link
              href={`/@${author.username}`}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 relative z-10"
            >
              <Avatar className="size-10 ring-2 ring-border/40">
                <AvatarImage src={avatarSrc} alt={author.name} />
                <AvatarFallback className={`text-xs font-bold ${getAvatarGradient(author.username || author.name)}`}>
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
                  <UserBadges equippedBadges={author.equipped_badges} size="xs" />
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
                {/* Rich Link OpenGraph Preview Card */}
                <LinkPreviewCard content={postContent} />
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
                      className="h-8 px-2 gap-1.5 text-xs font-medium text-[#78716C] hover:text-teal-500 hover:bg-teal-500/10 rounded-md transition-colors"
                    >
                      <MessageSquare className="size-[16px]" />
                      {comments_count > 0 && <span>{formatCount(comments_count)}</span>}
                    </Button>
                  </Link>

                  {/* Like */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLike}
                    disabled={false}
                    className={cn(
                      "h-8 px-2 gap-1.5 text-xs font-medium rounded-md transition-colors",
                      liked
                        ? "text-brand-like hover:text-brand-like hover:bg-brand-like-subtle"
                        : "text-[#78716C] hover:text-brand-like hover:bg-brand-like-subtle"
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
                    className="h-8 px-2 gap-1.5 text-xs font-medium text-[#78716C] hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                  >
                    <BarChart3 className="size-[16px]" />
                    <span>{formatCount(viewCount)}</span>
                  </Button>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-0">
                  {/* Bookmark */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBookmark}
                    className={cn(
                      "h-8 px-2 rounded-md transition-colors",
                      bookmarked
                        ? "text-brand-bookmark hover:text-brand-bookmark hover:bg-brand-bookmark-subtle"
                        : "text-[#78716C] hover:text-brand-bookmark hover:bg-brand-bookmark-subtle"
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
                    className="h-8 px-2 text-[#78716C] hover:text-cyan-500 hover:bg-cyan-500/10 rounded-md transition-colors"
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
                        className="size-7 sm:size-7.5 p-0 rounded-full text-muted-foreground/70 hover:text-foreground hover:bg-muted/80 active:scale-95 transition-all cursor-pointer"
                        title="More options"
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-40 sm:w-44 p-1">
                    <DropdownMenuItem
                      onClick={handleTogglePin}
                      className="gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer"
                    >
                      <Pin className="size-3.5 text-amber-500" />
                      <span>{isPinned ? "Unpin from profile" : "Pin to profile"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setEditDialogOpen(true)}
                      className="gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer"
                    >
                      <Pencil className="size-3.5 text-muted-foreground" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                      className="gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
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
          setIsEdited(true);
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