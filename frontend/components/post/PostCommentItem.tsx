"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Heart,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  Pin,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  Loader2,
  Check,
  X,
  Send,
  Image as ImageIcon,
} from "lucide-react";
import { cn, getAvatarUrl, getInitials } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import UserBadges from "@/components/ui/UserBadges";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import RichPostContent from "./RichPostContent";
import ImageLightbox from "./ImageLightbox";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface CommentAuthor {
  id: number;
  name: string;
  username: string;
  avatar?: string | null;
  verified?: boolean;
  equipped_badges?: any[];
}

export interface CommentData {
  id: number;
  content: string;
  image_url?: string | null;
  created_at: string;
  likes_count: number;
  is_liked: boolean;
  is_pinned?: boolean;
  is_edited?: boolean;
  is_creator_liked?: boolean;
  mentions?: string[];
  author: CommentAuthor;
  replies?: CommentData[];
}

interface PostCommentItemProps {
  comment: CommentData;
  postId: number | string;
  postAuthorId?: number;
  postAuthorUsername?: string;
  postAuthorAvatar?: string | null;
  onCommentUpdated?: (comment: CommentData) => void;
  onCommentDeleted?: (commentId: number) => void;
  onReplyAdded?: (parentCommentId: number, reply: CommentData) => void;
  depth?: number;
}

export default function PostCommentItem({
  comment,
  postId,
  postAuthorId,
  postAuthorUsername,
  postAuthorAvatar,
  onCommentUpdated,
  onCommentDeleted,
  onReplyAdded,
  depth = 0,
}: PostCommentItemProps) {
  const { user } = useAuth();

  const [isLiked, setIsLiked] = useState(comment.is_liked);
  const [likeCount, setLikeCount] = useState(comment.likes_count);
  const [isLiking, setIsLiking] = useState(false);

  const [isPinned, setIsPinned] = useState(Boolean(comment.is_pinned));
  const [isCreatorLiked, setIsCreatorLiked] = useState(Boolean(comment.is_creator_liked));
  const [isEdited, setIsEdited] = useState(Boolean(comment.is_edited));
  const [content, setContent] = useState(comment.content);

  // Lightbox state for attached image
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Reply state
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState(`@${comment.author.username} `);
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const [submittingReply, setSubmittingReply] = useState(false);

  // Collapse thread
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isCommentOwner = Boolean(user && user.id === comment.author.id);
  const isPostOwner = Boolean(
    user && (user.id === postAuthorId || (postAuthorUsername && user.username === postAuthorUsername))
  );
  const isAuthorComment = Boolean(
    (postAuthorId && comment.author.id === postAuthorId) ||
    (postAuthorUsername && comment.author.username === postAuthorUsername)
  );

  const handleToggleLike = async () => {
    if (!user || isLiking) return;
    const prevLiked = isLiked;
    const prevCount = likeCount;

    setIsLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    setIsLiking(true);

    try {
      const res = await api.post(`/api/posts/${postId}/comments/${comment.id}/like`);
      setIsLiked(res.data.is_liked);
      setLikeCount(res.data.likes_count);
    } catch {
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleTogglePin = async () => {
    if (!isPostOwner) return;
    try {
      const res = await api.post(`/api/posts/${postId}/comments/${comment.id}/pin`);
      setIsPinned(res.data.is_pinned);
      toast.success(res.data.message);
      onCommentUpdated?.({ ...comment, is_pinned: res.data.is_pinned });
    } catch {
      toast.error("Failed to pin comment");
    }
  };

  const handleToggleCreatorHeart = async () => {
    if (!isPostOwner) return;
    try {
      const res = await api.post(`/api/posts/${postId}/comments/${comment.id}/heart`);
      setIsCreatorLiked(res.data.is_creator_liked);
      toast.success(res.data.message);
      onCommentUpdated?.({ ...comment, is_creator_liked: res.data.is_creator_liked });
    } catch {
      toast.error("Failed to update creator heart");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    setDeleting(true);
    try {
      await api.delete(`/api/posts/${postId}/comments/${comment.id}`);
      toast.success("Comment deleted");
      onCommentDeleted?.(comment.id);
    } catch {
      toast.error("Failed to delete comment");
    } finally {
      setDeleting(false);
    }
  };

  const handleReplyImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReplyImage(file);
    setReplyImagePreview(URL.createObjectURL(file));
  };

  const removeReplyImage = () => {
    if (replyImagePreview) URL.revokeObjectURL(replyImagePreview);
    setReplyImage(null);
    setReplyImagePreview(null);
    if (replyFileInputRef.current) replyFileInputRef.current.value = "";
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!replyText.trim() && !replyImage) || submittingReply || !user) return;

    setSubmittingReply(true);
    try {
      const formData = new FormData();
      formData.append("content", replyText.trim());
      formData.append("parent_id", String(comment.id));
      if (replyImage) {
        formData.append("image", replyImage);
      }

      const res = await api.post(`/api/posts/${postId}/comments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Reply posted!");
      setIsReplying(false);
      setReplyText(`@${comment.author.username} `);
      removeReplyImage();
      onReplyAdded?.(comment.id, res.data.comment);
    } catch {
      toast.error("Failed to post reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  const repliesCount = comment.replies?.length || 0;
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: false });

  return (
    <div className={cn("relative group/comment", depth > 0 ? "ml-5 sm:ml-9" : "")}>
      {/* ── Thread Connector Line ── */}
      {depth > 0 && (
        <div
          className="absolute -left-4 sm:-left-6 top-4 w-4 sm:w-6 h-5 border-l-2 border-b-2 border-border/70 rounded-bl-xl pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Main Comment Row */}
      <div className={cn(
        "p-3.5 sm:p-4 rounded-2xl transition-colors relative",
        isPinned ? "bg-primary/5 dark:bg-primary/10 border border-primary/20" : "hover:bg-muted/30"
      )}>
        {/* Pinned Badge */}
        {isPinned && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-2 pl-0.5">
            <Pin className="size-3.5 fill-current rotate-45" />
            <span>Pinned by author</span>
          </div>
        )}

        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Link href={`/@${comment.author.username}`} className="shrink-0">
            <Avatar className="size-8 sm:size-9 ring-1 ring-border/60 hover:ring-primary transition-all">
              <AvatarImage src={getAvatarUrl(comment.author.avatar)} alt={comment.author.name} />
              <AvatarFallback className="text-xs font-bold bg-muted">
                {getInitials(comment.author.name)}
              </AvatarFallback>
            </Avatar>
          </Link>

          {/* Comment Content Area */}
          <div className="flex-1 min-w-0">
            {/* Author Header */}
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <Link
                  href={`/@${comment.author.username}`}
                  className="text-xs sm:text-sm font-bold text-foreground hover:underline truncate"
                >
                  {comment.author.name}
                </Link>

                {Boolean(comment.author.verified) && <VerifiedBadge size="xs" />}
                <UserBadges equippedBadges={comment.author.equipped_badges} size="xs" />

                {/* Author / OP Badge */}
                {isAuthorComment && (
                  <span className="px-1.5 py-0.2 rounded-md bg-primary/10 text-primary text-[10px] font-extrabold border border-primary/25 tracking-wider">
                    Author
                  </span>
                )}

                <span className="text-[11px] text-muted-foreground truncate">
                  @{comment.author.username}
                </span>
                <span className="text-[11px] text-muted-foreground">·</span>
                <span className="text-[11px] text-muted-foreground">
                  {timeAgo}
                </span>

                {isEdited && (
                  <span className="text-[10px] text-muted-foreground/70 italic">
                    · edited
                  </span>
                )}
              </div>

              {/* 3-Dot Options Menu */}
              {(isCommentOwner || isPostOwner) && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="p-1 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="Comment options"
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 rounded-xl">
                    {/* Pin/Unpin (Post owner only) */}
                    {isPostOwner && (
                      <DropdownMenuItem onClick={handleTogglePin} className="gap-2 cursor-pointer text-xs font-semibold">
                        <Pin className="size-3.5 text-primary rotate-45" />
                        <span>{isPinned ? "Unpin Comment" : "Pin to Top"}</span>
                      </DropdownMenuItem>
                    )}

                    {/* Creator Heart (Post owner only) */}
                    {isPostOwner && (
                      <DropdownMenuItem onClick={handleToggleCreatorHeart} className="gap-2 cursor-pointer text-xs font-semibold">
                        <Heart className="size-3.5 text-red-500 fill-red-500" />
                        <span>{isCreatorLiked ? "Remove Heart" : "Heart by Author"}</span>
                      </DropdownMenuItem>
                    )}

                    {/* Delete Comment */}
                    <DropdownMenuItem onClick={handleDelete} className="gap-2 text-destructive focus:text-destructive cursor-pointer text-xs font-semibold">
                      <Trash2 className="size-3.5" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Comment Body */}
            <div>
              {content && (
                <div className="mt-1 text-[14px] leading-relaxed text-foreground whitespace-pre-wrap">
                  <RichPostContent
                    content={content}
                    validMentions={comment.mentions}
                    postId={postId}
                  />
                </div>
              )}

              {/* Comment Photo Attachment */}
              {comment.image_url && (
                <div className="mt-2.5 max-w-sm rounded-2xl overflow-hidden border border-border/70 bg-card/40 shadow-xs">
                  <img
                    src={comment.image_url}
                    alt="Comment attachment"
                    className="w-full max-h-72 object-cover rounded-2xl cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={() => setLightboxOpen(true)}
                  />
                </div>
              )}
            </div>

            {/* Action Bar (Like, Reply, Creator Heart Indicator) */}
            <div className="mt-2.5 flex items-center gap-3 text-xs flex-wrap">
              {/* Like Button */}
              <button
                type="button"
                onClick={handleToggleLike}
                disabled={!user || isLiking}
                className={cn(
                  "inline-flex items-center gap-1.5 py-0.5 px-2 rounded-full transition-all cursor-pointer font-semibold",
                  isLiked
                    ? "text-red-500 bg-red-500/10"
                    : "text-muted-foreground hover:text-red-500 hover:bg-muted"
                )}
                title={user ? (isLiked ? "Unlike" : "Like") : "Log in to like"}
              >
                <Heart className={cn("size-3.5", isLiked && "fill-current")} />
                {likeCount > 0 && <span className="font-mono text-xs">{likeCount}</span>}
              </button>

              {/* Creator Heart Badge */}
              {isCreatorLiked && (
                <div
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[11px] font-bold border border-red-500/20"
                  title="Hearted by author"
                >
                  <Heart className="size-3 fill-current" />
                  <span className="text-[10px]">Liked by creator</span>
                </div>
              )}

              {/* Reply Trigger */}
              {user && (
                <button
                  type="button"
                  onClick={() => setIsReplying(!isReplying)}
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors font-semibold cursor-pointer py-0.5 px-1.5 rounded-md hover:bg-muted"
                >
                  <CornerDownRight className="size-3.5" />
                  <span>Reply</span>
                </button>
              )}

              {/* Collapse/Expand Replies button if has replies */}
              {repliesCount > 0 && (
                <button
                  type="button"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="inline-flex items-center gap-1 text-primary font-bold hover:underline transition-all cursor-pointer"
                >
                  {isCollapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
                  <span>
                    {isCollapsed ? `Show ${repliesCount} ${repliesCount === 1 ? "reply" : "replies"}` : "Hide replies"}
                  </span>
                </button>
              )}
            </div>

            {/* ── Inline Reply Box ── */}
            {isReplying && (
              <form onSubmit={handleSendReply} className="mt-3 p-2.5 rounded-2xl border border-primary/30 bg-primary/5 space-y-2 animate-in fade-in-50 duration-200">
                {/* Hidden File Input */}
                <input
                  ref={replyFileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleReplyImageSelect}
                />

                {/* Photo Preview inside Reply Box */}
                {replyImagePreview && (
                  <div className="relative inline-block rounded-xl overflow-hidden border border-border">
                    <img src={replyImagePreview} alt="Preview" className="h-20 w-auto rounded-xl object-cover" />
                    <button
                      type="button"
                      onClick={removeReplyImage}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white hover:bg-black cursor-pointer"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Avatar className="size-6 shrink-0">
                    <AvatarImage src={getAvatarUrl(user?.avatar)} />
                    <AvatarFallback className="text-[10px] font-bold">
                      {getInitials(user?.name || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to @${comment.author.username}...`}
                    className="flex-1 bg-transparent border-none text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    autoFocus
                  />
                  <div className="flex items-center gap-1">
                    {/* Add Image Button */}
                    <button
                      type="button"
                      onClick={() => replyFileInputRef.current?.click()}
                      className="size-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                      title="Attach image"
                    >
                      <ImageIcon className="size-3.5" />
                    </button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setIsReplying(false); removeReplyImage(); }}
                      className="size-7 p-0 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="size-3.5" />
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submittingReply || (!replyText.trim() && !replyImage)}
                      className="size-7 p-0 rounded-full font-bold cursor-pointer"
                    >
                      {submittingReply ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Send className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ── Nested Replies Thread ── */}
      {!isCollapsed && repliesCount > 0 && (
        <div className="space-y-1 relative border-l-2 border-border/50 ml-4 sm:ml-5 pl-2 mt-1">
          {comment.replies!.map((reply) => (
            <PostCommentItem
              key={`reply_${reply.id}`}
              comment={reply}
              postId={postId}
              postAuthorId={postAuthorId}
              postAuthorUsername={postAuthorUsername}
              postAuthorAvatar={postAuthorAvatar}
              onCommentUpdated={onCommentUpdated}
              onCommentDeleted={onCommentDeleted}
              onReplyAdded={onReplyAdded}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {/* ── Image Lightbox ── */}
      {comment.image_url && (
        <ImageLightbox
          images={[comment.image_url]}
          initialIndex={0}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
