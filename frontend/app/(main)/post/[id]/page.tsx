"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Bookmark, Share2, ArrowLeft, Send, Loader2, Lock, Repeat2, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import PostImageGrid from "@/components/post/PostImageGrid";
import ImageLightbox from "@/components/post/ImageLightbox";
import ShareDialog from "@/components/post/ShareDialog";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import VideoEmbed from "@/components/post/VideoEmbed";
import LinkPreviewCard from "@/components/post/LinkPreviewCard";
import { toast } from "sonner";

interface Author {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  verified?: boolean;
}

interface CommentItem {
  id: number;
  content: string;
  created_at: string;
  likes_count: number;
  is_liked: boolean;
  mentions?: string[];
  author: Author;
  replies?: CommentItem[];
}

interface PostDetail {
  id: number | string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  views_count?: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  mentions?: string[];
  images: string[];
  author: Author;
  comments: CommentItem[];
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function getInitials(name: string) {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function renderContent(text: string, validMentions?: string[]) {
  if (!text) return null;
  const parts = text.split(/(@[\w.]+|#[\p{L}\p{N}_]+)/gu);
  return parts.map((part, i) => {
    if (part.startsWith("#")) {
      const tag = part.slice(1);
      return (
        <Link
          key={i}
          href={`/hashtag/${encodeURIComponent(tag)}`}
          className="text-amber-600 dark:text-amber-400 font-semibold hover:underline"
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
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20 hover:border-blue-500/40 transition-colors align-baseline"
        >
          {part}
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const { user } = useAuth();
  const router = useRouter();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isLiking, setIsLiking] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [replyingToCommentId, setReplyingToCommentId] = useState<number | null>(null);
  const [submittingReplyId, setSubmittingReplyId] = useState<number | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});
  const [commentLikingIds, setCommentLikingIds] = useState<Record<number, boolean>>({});
  const [replySuccessId, setReplySuccessId] = useState<number | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/api/posts/${id}`)
      .then((res) => {
        setPost(res.data);
        // Record impression on single post visit
        api.post(`/api/posts/${id}/view`).then((viewRes) => {
          if (viewRes.data?.views_count) {
            setPost((prev) => prev ? { ...prev, views_count: viewRes.data.views_count } : null);
          }
        }).catch(() => {});
      })
      .catch((err) => {
        console.error(err);
        setError("Post not found or failed to load");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleLike = async () => {
    if (!post || isLiking) return;

    if (!user) {
      toast.error("Sign in to like posts");
      return;
    }

    const previousLiked = post.is_liked;
    const previousCount = post.likes_count;

    setPost((prev) =>
      prev
        ? {
            ...prev,
            is_liked: !previousLiked,
            likes_count: previousLiked ? previousCount - 1 : previousCount + 1,
          }
        : null
    );
    setIsLiking(true);

    api
      .post(`/api/posts/${id}/like`)
      .then((res) => {
        if (res.data) {
          setPost((prev) =>
            prev
              ? {
                  ...prev,
                  is_liked: res.data.is_liked,
                  likes_count: res.data.likes_count,
                }
              : null
          );
        }
      })
      .catch(() => {
        setPost((prev) =>
          prev
            ? {
                ...prev,
                is_liked: previousLiked,
                likes_count: previousCount,
              }
            : null
        );
      })
      .finally(() => {
        setIsLiking(false);
      });
  };

  const [isBookmarking, setIsBookmarking] = useState(false);

  const handleBookmark = async () => {
    if (!post || isBookmarking) return;

    const previousBookmarked = post.is_bookmarked;

    setPost((prev) =>
      prev
        ? {
            ...prev,
            is_bookmarked: !previousBookmarked,
          }
        : null
    );
    setIsBookmarking(true);

    try {
      const res = await api.post(`/api/posts/${id}/bookmark`);
      if (res.data) {
        setPost((prev) =>
          prev
            ? {
                ...prev,
                is_bookmarked: res.data.is_bookmarked,
              }
            : null
        );
      }
    } catch {
      setPost((prev) =>
        prev
          ? {
              ...prev,
              is_bookmarked: previousBookmarked,
            }
          : null
      );
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const res = await api.post(`/api/posts/${id}/comments`, {
        content: newComment.trim(),
      });
      if (res.data && res.data.comment) {
        setPost((prev) =>
          prev
            ? {
                ...prev,
                comments_count: res.data.comments_count,
                comments: [res.data.comment, ...prev.comments],
              }
            : null
        );
        setNewComment("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const insertReplyIntoComments = (
    comments: CommentItem[],
    parentId: number,
    reply: CommentItem
  ): CommentItem[] =>
    comments.map((comment) => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: [reply, ...(comment.replies ?? [])],
        };
      }

      if (comment.replies?.length) {
        return {
          ...comment,
          replies: insertReplyIntoComments(comment.replies, parentId, reply),
        };
      }

      return comment;
    });

  const handleAddReply = async (parentId: number, e?: React.FormEvent) => {
    e?.preventDefault();
    if (!post || !replyDrafts[parentId]?.trim() || submittingReplyId === parentId) return;

    setSubmittingReplyId(parentId);
    try {
      const res = await api.post(`/api/posts/${id}/comments`, {
        content: replyDrafts[parentId].trim(),
        parent_id: parentId,
      });
      if (res.data && res.data.comment) {
        setPost((prev) =>
          prev
            ? {
                ...prev,
                comments_count: res.data.comments_count,
                comments: insertReplyIntoComments(prev.comments, parentId, res.data.comment),
              }
            : null
        );
        setReplyDrafts((prev) => ({ ...prev, [parentId]: "" }));
        setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
        setReplyingToCommentId(null);
        setReplySuccessId(parentId);
        window.setTimeout(() => {
          setReplySuccessId((prev) => (prev === parentId ? null : prev));
        }, 1800);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const handleToggleCommentLike = async (commentId: number) => {
    if (!post || commentLikingIds[commentId] || !user) return;

    setCommentLikingIds((prev) => ({ ...prev, [commentId]: true }));
    const updateComment = (comments: CommentItem[]): CommentItem[] =>
      comments.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            is_liked: !comment.is_liked,
            likes_count: comment.is_liked ? comment.likes_count - 1 : comment.likes_count + 1,
          };
        }

        if (comment.replies?.length) {
          return {
            ...comment,
            replies: updateComment(comment.replies),
          };
        }

        return comment;
      });

    setPost((prev) => (prev ? { ...prev, comments: updateComment(prev.comments) } : null));

    try {
      const res = await api.post(`/api/posts/${id}/comments/${commentId}/like`);
      if (res.data) {
        const syncComment = (comments: CommentItem[]): CommentItem[] =>
          comments.map((comment) => {
            if (comment.id === commentId) {
              return {
                ...comment,
                is_liked: res.data.is_liked,
                likes_count: res.data.likes_count,
              };
            }

            if (comment.replies?.length) {
              return {
                ...comment,
                replies: syncComment(comment.replies),
              };
            }

            return comment;
          });

        setPost((prev) => (prev ? { ...prev, comments: syncComment(prev.comments) } : null));
      }
    } catch (err) {
      console.error(err);
      setPost((prev) => (prev ? { ...prev, comments: updateComment(prev.comments) } : null));
    } finally {
      setCommentLikingIds((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Loading post...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="py-12 px-4 text-center">
        <h2 className="text-lg font-semibold text-foreground">Post Not Found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The post you are looking for does not exist or was deleted.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-6 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Link>
      </div>
    );
  }

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
    } catch {
      return "";
    }
  })();

  return (
    <div>
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/60">
        <div className="flex items-center gap-4 px-4 py-2.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-muted transition-all duration-200 active:scale-90"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Post</h1>
        </div>
      </div>

      {/* Main Post */}
      <div className="p-4 sm:p-5 border-b border-border/60">
        {/* Author info */}
        <div className="flex items-start gap-3">
          <Link href={`/@${post.author.username}`}>
            <Avatar className="size-10 sm:size-12 ring-2 ring-border/40">
              <AvatarImage src={post.author.avatar ?? undefined} alt={post.author.name} />
              <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                {getInitials(post.author.name)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link
              href={`/@${post.author.username}`}
              className="text-[15px] font-bold text-foreground hover:underline flex items-center gap-1"
            >
              <span>{post.author.name}</span>
              {Boolean(post.author.verified) && <VerifiedBadge size="md" />}
            </Link>
            <p className="text-sm text-muted-foreground">
              @{post.author.username}
            </p>
          </div>
        </div>

        {/* Post Content */}
        <div className="mt-4">
          <p className="text-lg leading-[1.7] text-foreground whitespace-pre-wrap">
            {renderContent(post.content, post.mentions)}
          </p>
          {/* Embedded Video (YouTube, Instagram Reels, Direct Video) */}
          <VideoEmbed content={post.content} />
          {/* Rich Link OpenGraph Preview Card */}
          <LinkPreviewCard content={post.content} />
        </div>

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <div className="mt-4">
            <PostImageGrid
              images={post.images}
              onImageClick={(idx) => {
                setLightboxIndex(idx);
                setLightboxOpen(true);
              }}
            />
          </div>
        )}

        {/* Timestamp */}
        <div className="mt-4 text-sm text-muted-foreground">
          {timeAgo}
        </div>

        {/* Stats */}
        <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-4 text-sm">
          <span><strong className="text-foreground">{formatCount(post.likes_count)}</strong> <span className="text-muted-foreground">Likes</span></span>
          <span><strong className="text-foreground">{formatCount(post.comments_count)}</strong> <span className="text-muted-foreground">Comments</span></span>
          <span><strong className="text-foreground">{formatCount(post.views_count ?? 0)}</strong> <span className="text-muted-foreground">Views</span></span>
        </div>

        {/* Post Actions */}
        <div className="mt-3 pt-3 border-t border-border/60">
          <div className="flex items-center justify-around">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 gap-2 rounded-full text-[#78716C] hover:text-teal-500 hover:bg-teal-500/10 transition-colors"
            >
              <MessageSquare className="size-5" />
            </Button>

            {/* Like */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={false}
              className={cn(
                "h-9 px-3 gap-2 rounded-full transition-colors",
                post.is_liked
                  ? "text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  : "text-[#78716C] hover:text-red-500 hover:bg-red-500/10"
              )}
            >
              <Heart className={cn("size-5", post.is_liked && "fill-current")} />
            </Button>

            <div className="flex items-center gap-1">
              {/* Bookmark */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBookmark}
                disabled={isBookmarking}
                className={cn(
                  "h-9 px-2 rounded-full transition-colors",
                  post.is_bookmarked
                    ? "text-violet-500 hover:text-violet-600 hover:bg-violet-500/10"
                    : "text-[#78716C] hover:text-violet-500 hover:bg-violet-500/10"
                )}
              >
                <Bookmark className={cn("size-5", post.is_bookmarked && "fill-current")} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShareDialogOpen(true)}
                className="h-9 px-2 rounded-full text-[#78716C] hover:text-cyan-500 hover:bg-cyan-500/10 transition-colors"
              >
                <Share2 className="size-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Comment */}
      {user ? (
        <form onSubmit={handleAddComment} className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
          <Avatar className="size-8 shrink-0">
            <AvatarImage src={user.avatar ?? undefined} />
            <AvatarFallback className="bg-teal-500/15 text-teal-600 dark:text-teal-400 text-xs">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Post your reply…"
            className="flex-1 bg-transparent text-[15px] focus:outline-none text-foreground placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newComment.trim() || submittingComment}
            className="rounded-full px-4 h-8 text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white"
          >
            {submittingComment ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Reply"
            )}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-b border-border/60 bg-amber-500/5">
          <div className="flex items-center gap-2.5 text-sm font-medium text-amber-700">
            <Lock className="h-4 w-4 shrink-0" />
            <span>Log in to reply.</span>
          </div>
          <Link href="/login">
            <Button size="sm" className="rounded-full px-4 text-xs h-8 font-bold">
              Log In
            </Button>
          </Link>
        </div>
      )}

      {/* Comments List */}
      {post.comments.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-sm">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div>
          {post.comments.map((comment) => (
            <div key={comment.id} className="border-b border-border/40">
              <div className="p-4 flex items-start gap-3">
                <Link href={`/@${comment.author.username}`} className="shrink-0">
                  <Avatar className="size-8 sm:size-9 ring-2 ring-transparent hover:ring-primary/40 transition-all">
                    <AvatarImage src={comment.author.avatar ?? undefined} />
                    <AvatarFallback className="bg-muted text-xs font-semibold">
                      {getInitials(comment.author.name)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      href={`/@${comment.author.username}`}
                      className="text-sm font-bold text-foreground hover:underline flex items-center gap-1"
                    >
                      <span>{comment.author.name}</span>
                      {Boolean(comment.author.verified) && <VerifiedBadge size="sm" />}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      @{comment.author.username}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: false })}
                    </span>
                  </div>
                  <p className="mt-1 text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
                    {renderContent(comment.content, comment.mentions)}
                  </p>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {user ? (
                      <button
                        type="button"
                        onClick={() => handleToggleCommentLike(comment.id)}
                        disabled={commentLikingIds[comment.id]}
                        className={cn(
                          "inline-flex items-center gap-1.5 text-sm font-medium rounded-full px-2.5 py-1 transition-colors",
                          comment.is_liked
                            ? "text-red-500 bg-red-500/10"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Heart className={cn("size-4", comment.is_liked && "fill-current")} />
                        {comment.likes_count > 0 ? formatCount(comment.likes_count) : ""}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Heart className="size-4" />
                        {comment.likes_count > 0 ? formatCount(comment.likes_count) : ""}
                      </span>
                    )}
                    {user ? (
                      <button
                        type="button"
                        onClick={() => setReplyingToCommentId(comment.id)}
                        className="text-sm font-medium text-teal-500 hover:text-teal-600 transition-colors"
                      >
                        Reply
                      </button>
                    ) : null}
                    {(comment.replies?.length ?? 0) > 0 ? (
                      <button
                        type="button"
                        onClick={() => setExpandedReplies((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                        className="inline-flex items-center gap-1 text-sm font-medium text-teal-500 hover:text-teal-600 transition-colors"
                      >
                        {expandedReplies[comment.id] ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        {expandedReplies[comment.id] ? "Hide replies" : `View ${comment.replies?.length ?? 0} replies`}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {replyingToCommentId === comment.id ? (
                <form
                  onSubmit={(e) => handleAddReply(comment.id, e)}
                  className="mx-4 mb-3 flex items-center gap-2 rounded-2xl border border-teal-500/30 bg-teal-500/5 px-3 py-2"
                >
                  <input
                    value={replyDrafts[comment.id] ?? ""}
                    onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                    placeholder="Write a reply…"
                    className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
                  />
                  <Button type="submit" size="sm" className="rounded-full px-3 h-8 bg-teal-600 hover:bg-teal-700 text-white" disabled={!replyDrafts[comment.id]?.trim() || submittingReplyId === comment.id}>
                    {submittingReplyId === comment.id ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  </Button>
                </form>
              ) : null}

              {replySuccessId === comment.id ? (
                <div className="mx-4 mb-3 text-sm font-medium text-emerald-600" aria-live="polite">
                  Reply added
                </div>
              ) : null}

              {/* Nested Replies */}
              {(comment.replies?.length ?? 0) > 0 && (
                <div className={cn("ml-12 sm:ml-14 border-l-2 border-border/40", expandedReplies[comment.id] ? "block" : "hidden")}>
                  {comment.replies?.map((reply) => (
                    <div key={reply.id} className="p-3 flex items-start gap-2.5">
                      <Link href={`/@${reply.author.username}`} className="shrink-0">
                        <Avatar className="size-7">
                          <AvatarImage src={reply.author.avatar ?? undefined} />
                          <AvatarFallback className="bg-muted text-[10px] font-semibold">
                            {getInitials(reply.author.name)}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={`/@${reply.author.username}`}
                            className="text-xs font-bold text-foreground hover:underline flex items-center gap-1"
                          >
                            <span>{reply.author.name}</span>
                            {Boolean(reply.author.verified) && <VerifiedBadge size="sm" />}
                          </Link>
                          <span className="text-[11px] text-muted-foreground">
                            @{reply.author.username}
                          </span>
                          <span className="text-[11px] text-muted-foreground">·</span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: false })}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                          {renderContent(reply.content, reply.mentions)}
                        </p>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          {user ? (
                            <button
                              type="button"
                              onClick={() => handleToggleCommentLike(reply.id)}
                              disabled={commentLikingIds[reply.id]}
                              className={cn(
                                "inline-flex items-center gap-1.5 text-sm font-medium rounded-full px-2.5 py-1 transition-colors",
                                reply.is_liked
                                  ? "text-red-500 bg-red-500/10"
                                  : "text-muted-foreground hover:bg-muted"
                              )}
                            >
                              <Heart className={cn("size-4", reply.is_liked && "fill-current")} />
                              {reply.likes_count > 0 ? formatCount(reply.likes_count) : ""}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Heart className="size-4" />
                              {reply.likes_count > 0 ? formatCount(reply.likes_count) : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ImageLightbox
        images={post.images}
        open={lightboxOpen}
        index={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
      />

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        post={post}
      />
    </div>
  );
}