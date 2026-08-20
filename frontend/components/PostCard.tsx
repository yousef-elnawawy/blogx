"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Bookmark, Share2, MoreHorizontal, Pencil, Trash2, Repeat2, BarChart3, Pin, Quote } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn, getAvatarUrl, getAvatarGradient, getInitials } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import PostEditorDialog from "@/components/create-post/PostEditorDialog";
import ShareDialog from "@/components/post/ShareDialog";
import QuotePostDialog from "@/components/post/QuotePostDialog";
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
import PollWidget, { PollData } from "@/components/post/PollWidget";
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
  poll?: PollData | null;
  likes_count: number;
  comments_count: number;
  reposts_count?: number;
  views_count?: number;
  created_at: string;
  is_edited?: boolean;
  is_pinned?: boolean;
  showPinnedBadge?: boolean;
  status?: string;
  scheduled_at?: string | null;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  is_reposted?: boolean;
  repost_of_id?: number | string | null;
  quote_of_id?: number | string | null;
  repost_of?: any;
  quote_of?: any;
  community_id?: number | string | null;
  community?: {
    id: number;
    name: string;
    slug: string;
    avatar?: string | null;
    type?: string;
  } | null;
}

function formatCount(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(num);
}

function renderHighlighted(text: string, validMentions?: string[]) {
  const regex = /(https?:\/\/[^\s]+|www\.[^\s]+|@[a-zA-Z0-9_]+|#[\p{L}\p{N}_]+)/gu;
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
  poll,
  likes_count,
  comments_count,
  reposts_count = 0,
  views_count = 0,
  created_at,
  is_edited = false,
  is_pinned: initialPinned = false,
  showPinnedBadge = false,
  is_liked: initialLiked = false,
  is_bookmarked: initialBookmarked = false,
  is_reposted: initialReposted = false,
  repost_of_id,
  quote_of_id,
  repost_of,
  quote_of,
  community_id,
  community,
}: PostCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [reposted, setReposted] = useState(initialReposted);
  const [likeCount, setLikeCount] = useState(likes_count);
  const [repostCount, setRepostCount] = useState(reposts_count);
  const [viewCount, setViewCount] = useState(views_count);
  const [postContent, setPostContent] = useState(content);
  const [postImages, setPostImages] = useState<string[]>(images);
  const [isEdited, setIsEdited] = useState(is_edited);
  const [isPinned, setIsPinned] = useState(Boolean(initialPinned));
  const articleRef = useRef<HTMLElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // If this post is a pure repost, actual display author & content comes from repost_of
  const effectivePost = repost_of || {
    id,
    author,
    content: postContent,
    images: postImages,
    mentions,
    poll,
    community,
    community_id,
    created_at,
  };

  const displayAuthor = effectivePost.author || author;

  const isReposter = Boolean(
    repost_of && user && (user.username === author.username || (author.id && user.id === author.id))
  );

  const isOriginalAuthor = Boolean(
    user && (user.username === displayAuthor.username || (displayAuthor.id && user.id === displayAuthor.id))
  );

  const canShowMenu = isReposter || isOriginalAuthor;
  const canEdit = !repost_of && isOriginalAuthor;
  const hasCommunity = Boolean(community || community_id || effectivePost?.community || effectivePost?.community_id);
  const hasQuote = Boolean(quote_of || quote_of_id || effectivePost?.quote_of || effectivePost?.quote_of_id);
  const hasRepost = Boolean(repost_of || repost_of_id);
  const canRepost = !hasCommunity && !hasQuote && !hasRepost;

  useEffect(() => {
    setViewCount(views_count);
  }, [views_count]);

  useEffect(() => {
    setPostContent(content);
    setPostImages(images);
    setIsPinned(Boolean(initialPinned));
    setLiked(Boolean(initialLiked));
    setBookmarked(Boolean(initialBookmarked));
    setReposted(Boolean(initialReposted));
    setLikeCount(likes_count);
    setRepostCount(reposts_count);
  }, [content, images, initialPinned, initialLiked, initialBookmarked, initialReposted, likes_count, reposts_count]);

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

  const handleToggleRepost = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Sign in to repost");
      return;
    }

    if (isReposting) return;

    const previousReposted = reposted;
    const previousCount = repostCount;

    setReposted(!previousReposted);
    setRepostCount(previousReposted ? Math.max(0, previousCount - 1) : previousCount + 1);
    setIsReposting(true);

    api
      .post(`/api/posts/${id}/repost`)
      .then((res) => {
        if (res.data) {
          setReposted(res.data.is_reposted);
          setRepostCount(res.data.reposts_count);
          toast.success(res.data.is_reposted ? "Post reposted!" : "Repost removed");
        }
      })
      .catch(() => {
        setReposted(previousReposted);
        setRepostCount(previousCount);
        toast.error("Failed to repost");
      })
      .finally(() => {
        setIsReposting(false);
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

  const avatarSrc = getAvatarUrl(displayAuthor.avatar);

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(effectivePost.created_at || created_at), { addSuffix: false });
    } catch {
      return "";
    }
  })();

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('a, button, input, textarea, select, [role="button"], [role="menuitem"], [role="dialog"], [data-interactive]')
    ) {
      return;
    }
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      return;
    }
    router.push(`/post/${effectivePost.id || id}`);
  };

  return (
    <>
      <article
        ref={articleRef}
        onClick={handleCardClick}
        className="relative border-b border-border hover:bg-muted/25 dark:hover:bg-muted/15 transition-colors duration-150 cursor-pointer group"
      >
        <div className="p-4 sm:p-5">
          
          {/* Repost Header Banner */}
          {Boolean(repost_of) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold mb-2.5 pl-6">
              <Repeat2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{author.name} Reposted</span>
            </div>
          )}

          {/* Pinned Post Badge */}
          {showPinnedBadge && isPinned && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-500 mb-2 pl-9">
              <Pin className="size-3.5 rotate-45 fill-current" />
              <span>Pinned Post</span>
            </div>
          )}

          {/* Header */}
          <div className="flex items-start gap-3">
            {community ? (
              /* Facebook Style: Square/Squircle Community Avatar with small User Avatar overlaid */
              <div className="shrink-0 relative z-10 size-10">
                <Link
                  href={`/c/${community.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  title={community.name}
                  className="block size-10 rounded-xl overflow-hidden ring-2 ring-border/50 bg-muted/60"
                >
                  {community.avatar ? (
                    <img
                      src={getAvatarUrl(community.avatar)}
                      alt={community.name}
                      className="size-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center font-bold text-xs bg-primary/10 text-primary rounded-xl">
                      {getInitials(community.name)}
                    </div>
                  )}
                </Link>

                {/* Overlaid Author Avatar */}
                <Link
                  href={`/@${displayAuthor.username}`}
                  onClick={(e) => e.stopPropagation()}
                  title={displayAuthor.name}
                  className="absolute -bottom-1 -right-1 z-20 block size-5.5 rounded-full ring-2 ring-card overflow-hidden shadow-xs"
                >
                  <Avatar className="size-5.5 rounded-full">
                    <AvatarImage src={avatarSrc} alt={displayAuthor.name} />
                    <AvatarFallback className={`text-[8px] font-bold ${getAvatarGradient(displayAuthor.username || displayAuthor.name)}`}>
                      {getInitials(displayAuthor.name)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </div>
            ) : (
              <Link
                href={`/@${displayAuthor.username}`}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 relative z-10"
              >
                <Avatar className="size-10 ring-2 ring-border/40">
                  <AvatarImage src={avatarSrc} alt={displayAuthor.name} />
                  <AvatarFallback className={`text-xs font-bold ${getAvatarGradient(displayAuthor.username || displayAuthor.name)}`}>
                    {getInitials(displayAuthor.name)}
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={`/@${displayAuthor.username}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[15px] font-bold text-foreground hover:underline relative z-10 flex items-center gap-1"
                >
                  <span>{displayAuthor.name}</span>
                  {Boolean(displayAuthor.verified) && <VerifiedBadge size="sm" />}
                  <UserBadges equippedBadges={displayAuthor.equipped_badges} size="xs" />
                </Link>
                {community && (
                  <>
                    <span className="text-xs text-muted-foreground">in</span>
                    <Link
                      href={`/c/${community.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      {community.name}
                    </Link>
                  </>
                )}
                <span className="text-sm text-muted-foreground">
                  @{displayAuthor.username}
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
                  {renderHighlighted(effectivePost.content || "", effectivePost.mentions || mentions)}
                </p>
                {/* Embedded Video */}
                <VideoEmbed content={effectivePost.content || ""} />
                {/* Rich Link OpenGraph Preview */}
                <LinkPreviewCard content={effectivePost.content || ""} />
                {/* Interactive Poll */}
                {(effectivePost.poll || poll) && (
                  <PollWidget poll={(effectivePost.poll || poll)!} />
                )}
              </div>

              {/* Image Grid */}
              {(effectivePost.images && effectivePost.images.length > 0) && (
                <div className="mt-3">
                  <PostImageGrid images={effectivePost.images} onImageClick={handleImageClick} />
                </div>
              )}

              {/* Embedded Quote Post Card */}
              {quote_of && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/post/${quote_of.id}`);
                  }}
                  className="mt-3 rounded-2xl border border-border/80 bg-card/70 hover:bg-muted/40 p-3.5 transition-colors cursor-pointer space-y-2 group/quote"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="size-5 ring-1 ring-border/40">
                      <AvatarImage src={getAvatarUrl(quote_of.author?.avatar)} alt={quote_of.author?.name} />
                      <AvatarFallback className="text-[9px] font-bold">
                        {getInitials(quote_of.author?.name || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-bold text-foreground group-hover/quote:underline">
                      {quote_of.author?.name}
                    </span>
                    {Boolean(quote_of.author?.verified) && <VerifiedBadge size="xs" />}
                    <span className="text-xs text-muted-foreground">
                      @{quote_of.author?.username}
                    </span>
                  </div>
                  {quote_of.content && (
                    <p className="text-xs text-foreground/90 leading-relaxed line-clamp-3">
                      {quote_of.content}
                    </p>
                  )}
                  {quote_of.images && quote_of.images.length > 0 && (
                    <div className="mt-2 rounded-xl overflow-hidden max-h-44 pointer-events-none">
                      <PostImageGrid images={quote_of.images} onImageClick={() => {}} />
                    </div>
                  )}
                </div>
              )}

              {/* Actions Bar */}
              <div className="mt-3 flex items-center justify-between relative z-10 -ml-2">
                <div className="flex items-center gap-0">
                  {/* Comments */}
                  <Link href={`/post/${effectivePost.id || id}`} onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 gap-1.5 text-xs font-medium text-[#78716C] hover:text-teal-500 hover:bg-teal-500/10 rounded-md transition-colors"
                    >
                      <MessageSquare className="size-[16px]" />
                      {comments_count > 0 && <span>{formatCount(comments_count)}</span>}
                    </Button>
                  </Link>

                  {/* Repost / Quote Dropdown (Allowed only for regular non-community, non-quote posts) */}
                  {canRepost && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            className={cn(
                              "h-8 px-2 gap-1.5 text-xs font-medium rounded-md transition-colors",
                              reposted
                                ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                                : "text-[#78716C] hover:text-emerald-600 hover:bg-emerald-500/10"
                            )}
                          >
                            <Repeat2 className={cn("size-[16px]", reposted && "stroke-[2.5]")} />
                            {repostCount > 0 && <span>{formatCount(repostCount)}</span>}
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="start" className="rounded-2xl p-1.5 min-w-36 bg-popover border-border shadow-xl">
                        <DropdownMenuItem
                          onClick={handleToggleRepost}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold cursor-pointer rounded-xl text-foreground hover:bg-muted"
                        >
                          <Repeat2 className="size-4 text-emerald-600" />
                          <span>{reposted ? "Undo Repost" : "Repost"}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) {
                              toast.error("Sign in to quote posts");
                              return;
                            }
                            setQuoteDialogOpen(true);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold cursor-pointer rounded-xl text-foreground hover:bg-muted"
                        >
                          <Quote className="size-4 text-primary" />
                          <span>Quote Post</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* Like */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLike}
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

                  {/* Share */}
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

            {/* Owner / Reposter Dropdown */}
            {canShowMenu && (
              <div className="relative z-10 shrink-0" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-7 sm:size-7.5 p-0 rounded-full text-muted-foreground/70 hover:text-foreground hover:bg-muted/80 active:scale-95 transition-all cursor-pointer"
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent
                    align="end"
                    className="w-44 p-1.5 rounded-2xl bg-popover/95 backdrop-blur-xl border border-border/80 shadow-2xl animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
                  >
                    <DropdownMenuItem
                      onClick={handleTogglePin}
                      className="gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-foreground hover:bg-muted focus:bg-muted transition-colors cursor-pointer"
                    >
                      <Pin className="size-3.5 text-amber-500 rotate-45" />
                      <span>{isPinned ? "Unpin from profile" : "Pin to profile"}</span>
                    </DropdownMenuItem>

                    {canEdit && (
                      <DropdownMenuItem
                        onClick={() => setEditDialogOpen(true)}
                        className="gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-foreground hover:bg-muted focus:bg-muted transition-colors cursor-pointer"
                      >
                        <Pencil className="size-3.5 text-primary" />
                        <span>Edit post</span>
                      </DropdownMenuItem>
                    )}

                    <div className="my-1 border-t border-border/50" />

                    <DropdownMenuItem
                      onClick={() => setDeleteDialogOpen(true)}
                      className="gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-destructive hover:bg-destructive/10 focus:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                      <span>{isReposter ? "Undo Repost" : "Delete post"}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Lightbox */}
      <ImageLightbox
        images={effectivePost.images || []}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Edit Dialog */}
      <PostEditorDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        postToEdit={{
          id: effectivePost.id || id,
          content: effectivePost.content || "",
          images: effectivePost.images || [],
        }}
      />

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        post={{
          id: effectivePost.id || id,
          author: displayAuthor,
          content: effectivePost.content || "",
          images: effectivePost.images || [],
        }}
      />

      {/* Quote Dialog */}
      <QuotePostDialog
        open={quoteDialogOpen}
        onOpenChange={setQuoteDialogOpen}
        targetPost={{
          id: effectivePost.id || id,
          content: effectivePost.content || "",
          images: effectivePost.images || [],
          created_at: effectivePost.created_at || created_at,
          author: displayAuthor,
        }}
        currentUser={user}
        onPostCreated={() => {
          setRepostCount((prev) => prev + 1);
        }}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}