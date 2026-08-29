"use client";

import { use, useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Bookmark, Share2, ArrowLeft, Send, Loader2, Lock, Repeat2, BarChart3, ChevronDown, ChevronUp, MoreHorizontal, Pencil, Trash2, Image as ImageIcon, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn, getAvatarGradient, getInitials, getAvatarUrl } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import PostImageGrid from "@/components/post/PostImageGrid";
import ImageLightbox from "@/components/post/ImageLightbox";
import ShareDialog from "@/components/post/ShareDialog";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import UserBadges from "@/components/ui/UserBadges";
import VideoEmbed from "@/components/post/VideoEmbed";
import LinkPreviewCard from "@/components/post/LinkPreviewCard";
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
import PostEditorDialog from "@/components/create-post/PostEditorDialog";
import PollWidget, { PollData } from "@/components/post/PollWidget";
import CodeSnippetBlock from "@/components/post/CodeSnippetBlock";
import CustomVideoPlayer from "@/components/video/CustomVideoPlayer";
import SaveToCollectionDialog from "@/components/bookmarks/SaveToCollectionDialog";
import RichPostContent from "@/components/post/RichPostContent";
import PostCommentItem, { CommentData } from "@/components/post/PostCommentItem";
import { toast } from "sonner";

interface Author {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  verified?: boolean;
  equipped_badges?: string[] | null;
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
  id: number;
  author: Author;
  content: string;
  images?: string[];
  video?: {
    url: string;
    thumbnail?: string | null;
    duration?: number | null;
  } | null;
  mentions?: string[];
  likes_count: number;
  comments_count: number;
  reposts_count?: number;
  views_count?: number;
  created_at: string;
  is_edited?: boolean;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  is_reposted?: boolean;
  community_id?: number | string | null;
  community?: {
    id: number;
    name: string;
    slug: string;
    avatar?: string | null;
    type?: string;
  } | null;
  poll?: PollData | null;
  repost_of?: any;
  quote_of?: any;
  comments: CommentItem[];
}

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

function renderInlineContent(text: string, validMentions?: string[]) {
  const regex = /(```[\s\S]*?```|`[^`\n]+`|https?:\/\/[^\s]+|www\.[^\s]+|@[\w.]+|#[\p{L}\p{N}_]+|\b\d{1,2}:\d{2}(?::\d{2})?\b)/gu;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;

    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(part)) {
      const seconds = parseTimeToSeconds(part);
      return (
        <button
          key={i}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("blogx-video-seek", { detail: { time: seconds } }));
          }}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-mono text-xs font-bold transition-colors cursor-pointer relative z-10"
          title={`Jump video to ${part}`}
        >
          <span className="text-[10px]">▶</span>
          <span>{part}</span>
        </button>
      );
    }

    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2 && !part.startsWith("```")) {
      const inlineCode = part.slice(1, -1);
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-[14px] text-primary font-semibold border border-border/60 select-all"
        >
          {inlineCode}
        </code>
      );
    }

    if (part.startsWith("#") && part.length > 1) {
      const tag = part.slice(1);
      return (
        <Link
          key={i}
          href={`/hashtag/${encodeURIComponent(tag)}`}
          className="hashtag-link"
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
          className="mention-link"
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
            className="url-link"
          >
            {cleanUrl}
          </a>
          {trailing}
        </span>
      );
    }

    return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>;
  });
}

function renderContent(text: string, validMentions?: string[]) {
  if (!text) return null;

  const normalized = text.replace(/\r\n/g, "\n");
  const codeBlockRegex = /(```[\s\S]*?```)/g;
  const sections = normalized.split(codeBlockRegex);

  return sections.map((sec, idx) => {
    if (!sec) return null;

    if (sec.startsWith("```") && sec.endsWith("```")) {
      const inner = sec.slice(3, -3);
      const firstNewline = inner.indexOf("\n");
      let lang = "";
      let code = inner;

      if (firstNewline !== -1) {
        const potentialLang = inner.slice(0, firstNewline).trim();
        if (/^[a-zA-Z0-9_-]+$/.test(potentialLang)) {
          lang = potentialLang;
          code = inner.slice(firstNewline + 1);
        }
      }

      return <CodeSnippetBlock key={idx} code={code} language={lang} />;
    }

    return <span key={idx}>{renderInlineContent(sec, validMentions)}</span>;
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
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saveToCollectionOpen, setSaveToCollectionOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = Boolean(
    user && post && (user.username === post.author.username || (post.author.id && user.id === post.author.id))
  );
  const hasVideo = Boolean(post?.video?.url);
  const canEditPost = isOwner && !post?.poll && !hasVideo;

  const handleDeletePost = async () => {
    if (!post || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/api/posts/${post.id}`);
      toast.success("Post deleted successfully");
      router.push("/");
    } catch {
      toast.error("Failed to delete post");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const [commentSort, setCommentSort] = useState<"top" | "newest" | "oldest">("top");

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/api/posts/${id}`)
      .then((res) => {
        setPost(res.data);
        if (res.data?.author?.name) {
          const preview = (res.data.content || "Post").slice(0, 40);
          document.title = `${res.data.author.name} on BlogX: "${preview}..."`;
        }
        // Record impression on single post visit
        api.post(`/api/posts/${id}/view`).then((viewRes) => {
          if (viewRes.data?.views_count) {
            setPost((prev) => prev ? { ...prev, views_count: viewRes.data.views_count } : null);
          }
        }).catch(() => { });
      })
      .catch((err) => {
        console.error(err);
        setError("Post not found or failed to load");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const sortedComments = useMemo(() => {
    if (!post?.comments) return [];
    const list = [...post.comments];
    return list.sort((a: any, b: any) => {
      // Pinned comments always first
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;

      if (commentSort === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (commentSort === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      // "top" (Most liked first, then newest)
      const diff = (b.likes_count || 0) - (a.likes_count || 0);
      if (diff !== 0) return diff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [post?.comments, commentSort]);

  const handleCommentUpdated = (updated: CommentData) => {
    setPost((prev) => {
      if (!prev) return null;
      const updateInTree = (list: any[]): any[] =>
        list.map((c) => {
          if (c.id === updated.id) {
            return { ...c, ...updated };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: updateInTree(c.replies) };
          }
          return c;
        });
      return { ...prev, comments: updateInTree(prev.comments || []) };
    });
  };

  const handleCommentDeleted = (deletedId: number) => {
    setPost((prev) => {
      if (!prev) return null;
      const removeFromTree = (list: any[]): any[] =>
        list
          .filter((c) => c.id !== deletedId)
          .map((c) => ({
            ...c,
            replies: c.replies ? removeFromTree(c.replies) : [],
          }));
      return {
        ...prev,
        comments_count: Math.max(0, (prev.comments_count || 1) - 1),
        comments: removeFromTree(prev.comments || []),
      };
    });
  };

  const handleReplyAdded = (parentId: number, newReply: CommentData) => {
    setPost((prev) => {
      if (!prev) return null;
      const addReplyInTree = (list: any[]): any[] =>
        list.map((c) => {
          if (c.id === parentId) {
            return { ...c, replies: [...(c.replies || []), newReply] };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: addReplyInTree(c.replies) };
          }
          return c;
        });
      return {
        ...prev,
        comments_count: (prev.comments_count || 0) + 1,
        comments: addReplyInTree(prev.comments || []),
      };
    });
  };

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
        const isSaved = res.data.is_bookmarked;
        setPost((prev) =>
          prev
            ? {
              ...prev,
              is_bookmarked: isSaved,
            }
            : null
        );
        if (isSaved) {
          setSaveToCollectionOpen(true);
        } else {
          toast.success("Removed from Bookmarks");
        }
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
      toast.error("Failed to bookmark post");
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleCommentImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCommentImage(file);
    setCommentImagePreview(URL.createObjectURL(file));
  };

  const removeCommentImage = () => {
    if (commentImagePreview) URL.revokeObjectURL(commentImagePreview);
    setCommentImage(null);
    setCommentImagePreview(null);
    if (commentFileInputRef.current) commentFileInputRef.current.value = "";
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || (!newComment.trim() && !commentImage) || submittingComment) return;

    setSubmittingComment(true);
    try {
      const formData = new FormData();
      formData.append("content", newComment.trim());
      if (commentImage) {
        formData.append("image", commentImage);
      }

      const res = await api.post(`/api/posts/${id}/comments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
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
        removeCommentImage();
        toast.success("Comment posted!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to post comment");
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
          <h1 className="text-xl font-bold text-foreground font-[family-name:var(--font-fraunces)]">Post</h1>
        </div>
      </div>

      {/* Main Post */}
      <div className="p-4 sm:p-5 border-b border-border/60">
        {/* Author info & Owner Dropdown */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {post.community ? (
              /* Facebook Style: Square Squircle Community Avatar with small User Avatar overlaid */
              <div className="shrink-0 relative z-10 size-11 sm:size-12">
                <Link
                  href={`/c/${post.community.slug}`}
                  title={post.community.name}
                  className="block size-11 sm:size-12 rounded-xl overflow-hidden ring-2 ring-border/50 bg-muted/60"
                >
                  {post.community.avatar ? (
                    <img
                      src={getAvatarUrl(post.community.avatar)}
                      alt={post.community.name}
                      className="size-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center font-bold text-sm bg-primary/10 text-primary rounded-xl">
                      {getInitials(post.community.name)}
                    </div>
                  )}
                </Link>

                {/* Overlaid Author Avatar */}
                <Link
                  href={`/@${post.author.username}`}
                  title={post.author.name}
                  className="absolute -bottom-1 -right-1 z-20 block size-6 rounded-full ring-2 ring-card overflow-hidden shadow-xs"
                >
                  <Avatar className="size-6 rounded-full">
                    <AvatarImage src={getAvatarUrl(post.author.avatar) ?? undefined} alt={post.author.name} />
                    <AvatarFallback className="text-[9px] font-bold">
                      {getInitials(post.author.name)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </div>
            ) : (
              <Link href={`/@${post.author.username}`}>
                <Avatar className="size-10 sm:size-12 ring-2 ring-border/40">
                  <AvatarImage src={getAvatarUrl(post.author.avatar) ?? undefined} alt={post.author.name} />
                  <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                    {getInitials(post.author.name)}
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={`/@${post.author.username}`}
                  className="text-[15px] font-bold text-foreground hover:underline flex items-center gap-1"
                >
                  <span>{post.author.name}</span>
                  {Boolean(post.author.verified) && <VerifiedBadge size="md" />}
                  <UserBadges equippedBadges={post.author.equipped_badges} size="sm" />
                </Link>
                {post.community && (
                  <>
                    <span className="text-xs text-muted-foreground">in</span>
                    <Link
                      href={`/c/${post.community.slug}`}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      {post.community.name}
                    </Link>
                  </>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                @{post.author.username}
              </p>
            </div>
          </div>

          {/* Owner Dropdown */}
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
              <DropdownMenuContent align="end" className="w-40 sm:w-44 p-1">
                {canEditPost && (
                  <DropdownMenuItem
                    onClick={() => setEditDialogOpen(true)}
                    className="gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer"
                  >
                    <Pencil className="size-3.5 text-muted-foreground" />
                    <span>Edit</span>
                  </DropdownMenuItem>
                )}
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
          )}
        </div>

        {/* Post Content */}
        <div className="mt-4">
          <div className="text-lg leading-[1.7] text-foreground">
            <RichPostContent
              content={post.content}
              validMentions={post.mentions}
              postId={post.id}
            />
          </div>
          {/* Embedded Video (YouTube, Instagram Reels, Direct Video) */}
          <VideoEmbed content={post.content} />
          {/* Rich Link OpenGraph Preview Card */}
          <LinkPreviewCard content={post.content} />
          {/* YouTube Style Poll Widget */}
          {post.poll && (
            <div className="mt-3.5" onClick={(e) => e.stopPropagation()}>
              <PollWidget
                poll={post.poll}
                onVoteSuccess={(updatedPoll) => {
                  setPost((prev) => (prev ? { ...prev, poll: updatedPoll } : null));
                }}
              />
            </div>
          )}

          {/* Embedded Quote Post Card */}
          {post.quote_of && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/post/${post.quote_of.id}`);
              }}
              className="mt-4 w-full rounded-2xl border border-border/80 bg-card/75 hover:bg-muted/40 p-4 transition-all duration-200 cursor-pointer space-y-2.5 group/quote shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-2.5">
                <Avatar className="size-6 ring-1 ring-border/40">
                  <AvatarImage src={getAvatarUrl(post.quote_of.author?.avatar)} alt={post.quote_of.author?.name} />
                  <AvatarFallback className="text-[10px] font-bold">
                    {getInitials(post.quote_of.author?.name || "U")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span className="text-sm font-bold text-foreground group-hover/quote:underline truncate">
                    {post.quote_of.author?.name}
                  </span>
                  {Boolean(post.quote_of.author?.verified) && <VerifiedBadge size="xs" />}
                  <span className="text-xs text-muted-foreground truncate">
                    @{post.quote_of.author?.username}
                  </span>
                </div>
              </div>
              {post.quote_of.content && (
                <div className="text-sm text-foreground/90 leading-relaxed">
                  <RichPostContent
                    content={post.quote_of.content}
                    validMentions={post.quote_of.mentions}
                    postId={post.quote_of.id}
                  />
                </div>
              )}
              {post.quote_of.poll && (
                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                  <PollWidget
                    poll={post.quote_of.poll}
                    onVoteSuccess={() => { }}
                  />
                </div>
              )}
              {post.quote_of.images && post.quote_of.images.length > 0 && (
                <div className="mt-2.5 rounded-xl overflow-hidden pointer-events-none">
                  <PostImageGrid images={post.quote_of.images} onImageClick={() => { }} />
                </div>
              )}
              {post.quote_of.video && post.quote_of.video.url && (
                <div className="mt-2.5 rounded-xl overflow-hidden">
                  <CustomVideoPlayer
                    src={post.quote_of.video.url}
                    poster={post.quote_of.video.thumbnail}
                    duration={post.quote_of.video.duration}
                  />
                </div>
              )}
            </div>
          )}
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

        {/* Uploaded Video */}
        {post.video && post.video.url && (
          <div className="mt-4">
            <CustomVideoPlayer
              src={post.video.url}
              poster={post.video.thumbnail}
              duration={post.video.duration}
              postId={post.id}
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
              onClick={() => {
                const el = document.getElementById("comments-section");
                if (el) {
                  const top = el.getBoundingClientRect().top + window.scrollY - 56;
                  window.scrollTo({ top, behavior: "smooth" });
                }
              }}
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
                  ? "text-brand-like hover:text-brand-like hover:bg-brand-like-subtle"
                  : "text-[#78716C] hover:text-brand-like hover:bg-brand-like-subtle"
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
                    ? "text-brand-bookmark hover:text-brand-bookmark hover:bg-brand-bookmark-subtle"
                    : "text-[#78716C] hover:text-brand-bookmark hover:bg-brand-bookmark-subtle"
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

      {/* Comments Header & Sorting Tabs */}
      <div id="comments-section" className="px-4 py-3 border-b border-border/60 flex items-center justify-between gap-2 flex-wrap bg-card/20">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4.5 text-primary" />
          <h2 className="text-sm sm:text-base font-bold text-foreground">
            Comments
            <span className="ml-1.5 text-xs text-muted-foreground font-normal">
              ({post.comments_count || post.comments.length})
            </span>
          </h2>
        </div>

        {/* Sorting Pills */}
        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-full text-xs font-semibold">
          <button
            type="button"
            onClick={() => setCommentSort("top")}
            className={cn(
              "px-3 py-1 rounded-full transition-all cursor-pointer",
              commentSort === "top"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Top
          </button>
          <button
            type="button"
            onClick={() => setCommentSort("newest")}
            className={cn(
              "px-3 py-1 rounded-full transition-all cursor-pointer",
              commentSort === "newest"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Newest
          </button>
          <button
            type="button"
            onClick={() => setCommentSort("oldest")}
            className={cn(
              "px-3 py-1 rounded-full transition-all cursor-pointer",
              commentSort === "oldest"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Oldest
          </button>
        </div>
      </div>

      {/* Add Comment Input */}
      {user ? (
        <form onSubmit={handleAddComment} className="p-3.5 border-b border-border/60 bg-card/30 space-y-2.5">
          {/* Hidden File Input for Comment Photos */}
          <input
            ref={commentFileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleCommentImageSelect}
          />

          {/* Attached Image Preview */}
          {commentImagePreview && (
            <div className="relative inline-block rounded-xl overflow-hidden border border-border/80 ml-11">
              <img src={commentImagePreview} alt="Attached Preview" className="h-24 w-auto rounded-xl object-cover" />
              <button
                type="button"
                onClick={removeCommentImage}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/75 text-white hover:bg-black transition-colors cursor-pointer"
                title="Remove image"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <Avatar className="size-8.5 shrink-0 ring-1 ring-border">
              <AvatarImage src={getAvatarUrl(user.avatar) ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a thoughtful reply…"
              className="flex-1 bg-muted/40 border border-border/70 focus:border-primary focus:bg-background px-3.5 py-2 rounded-xl text-sm outline-none text-foreground placeholder:text-muted-foreground transition-all"
            />
            {/* Attach Image Button */}
            <button
              type="button"
              onClick={() => commentFileInputRef.current?.click()}
              className="size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              title="Attach photo"
            >
              <ImageIcon className="size-4.5" />
            </button>
            <Button
              type="submit"
              size="sm"
              disabled={(!newComment.trim() && !commentImage) || submittingComment}
              className="rounded-xl px-4 h-9 text-xs font-bold shadow-xs cursor-pointer"
            >
              {submittingComment ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Reply"
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-b border-border/60 bg-amber-500/5">
          <div className="flex items-center gap-2.5 text-sm font-medium text-amber-700 dark:text-amber-400">
            <Lock className="h-4 w-4 shrink-0" />
            <span>Log in to join the conversation.</span>
          </div>
          <Link href="/login">
            <Button size="sm" className="rounded-xl px-4 text-xs h-8 font-bold cursor-pointer">
              Log In
            </Button>
          </Link>
        </div>
      )}

      {/* Threaded Comments List */}
      {sortedComments.length === 0 ? (
        <div className="py-12 text-center max-w-xs mx-auto space-y-2">
          <div className="size-10 rounded-full bg-muted/80 text-muted-foreground flex items-center justify-center mx-auto">
            <MessageSquare className="size-5" />
          </div>
          <p className="text-sm font-bold text-foreground">No comments yet</p>
          <p className="text-xs text-muted-foreground">Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="divide-y divide-border/40 p-2 sm:p-4 space-y-1">
          {sortedComments.map((comment) => (
            <PostCommentItem
              key={`comment_${comment.id}`}
              comment={comment as any}
              postId={post.id}
              postAuthorId={post.author.id}
              postAuthorUsername={post.author.username}
              postAuthorAvatar={post.author.avatar}
              onCommentUpdated={handleCommentUpdated}
              onCommentDeleted={handleCommentDeleted}
              onReplyAdded={handleReplyAdded}
            />
          ))}
        </div>
      )}

      <ImageLightbox
        images={post.images || []}
        open={lightboxOpen}
        index={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
      />

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        post={{
          id: post.id,
          type: hasVideo ? "video" : "post",
          author: post.author,
          content: post.content,
          images: post.images,
          cover_image: hasVideo ? (post.video?.thumbnail ?? null) : null,
        }}
      />

      {/* Edit Dialog */}
      {post && (
        <PostEditorDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          postToEdit={{
            id: post.id,
            content: post.content,
            images: post.images || [],
            video: post.video || null,
          }}
          onPostUpdated={(updatedPost) => {
            setPost((prev) =>
              prev
                ? {
                  ...prev,
                  content: updatedPost.content,
                  images: updatedPost.images || [],
                  video: updatedPost.video || null,
                }
                : null
            );
          }}
        />
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This post will be permanently deleted from your profile and feed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={handleDeletePost}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save to Collection Dialog */}
      <SaveToCollectionDialog
        open={saveToCollectionOpen}
        onOpenChange={setSaveToCollectionOpen}
        postId={post?.id}
      />
    </div>
  );
}