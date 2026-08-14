"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MapPin,
  Link as LinkIcon,
  Calendar,
  BadgeCheck,
  FileText,
  UserX,
  ArrowLeft,
  UserPlus,
  Check,
  Loader2,
  Users,
  Share2,
  QrCode,
  BookOpen,
  Lock,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import PostCard, { PostCardProps } from "@/components/PostCard";
import ArticleCard, { ArticleItem } from "@/components/article/ArticleCard";
import ArticleEditorDialog, { ArticleEditorInitialData } from "@/components/article/ArticleEditorDialog";
import PostEditorDialog from "@/components/create-post/PostEditorDialog";
import api from "@/lib/api";
import { getAvatarUrl } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import ProfileShareDialog from "@/components/profile/ProfileShareDialog";

interface ProfileUser {
  id: number;
  name: string;
  username: string;
  bio: string | null;
  avatar: string | null;
  cover: string | null;
  website: string | null;
  location: string | null;
  verified: boolean;
  created_at: string | null;
  posts_count?: number;
  followers_count?: number;
  following_count?: number;
  is_following?: boolean;
}

interface UserListItem {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  verified?: boolean;
  is_following: boolean;
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

function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-32 bg-muted sm:h-48" />
      <div className="px-4 sm:px-5 pb-4">
        <div className="-mt-12 mb-4 flex items-end justify-between sm:-mt-16">
          <div className="size-24 sm:size-32 rounded-full bg-muted border-4 border-background" />
          <div className="h-9 w-28 rounded-full bg-muted" />
        </div>
        <div className="mb-4 space-y-2">
          <div className="h-6 w-40 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
        <div className="h-4 w-full rounded bg-muted mb-2" />
        <div className="h-4 w-2/3 rounded bg-muted" />
      </div>
    </div>
  );
}

function UserProfileContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();

  const rawUsername = params.username as string;
  const username = rawUsername ? decodeURIComponent(rawUsername).replace(/^@/, "") : "";
  const initialTab = searchParams.get("tab") || "Posts";

  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [userPosts, setUserPosts] = useState<PostCardProps[]>([]);
  const [userArticles, setUserArticles] = useState<ArticleItem[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articlesLoaded, setArticlesLoaded] = useState(false);

  // Drafts state (only for profile owner)
  const [articleDrafts, setArticleDrafts] = useState<ArticleItem[]>([]);
  const [postDrafts, setPostDrafts] = useState<PostCardProps[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsLoaded, setDraftsLoaded] = useState(false);

  // Media state
  const [userMedia, setUserMedia] = useState<any[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  // Likes state
  const [likedPosts, setLikedPosts] = useState<PostCardProps[]>([]);
  const [likedArticles, setLikedArticles] = useState<ArticleItem[]>([]);
  const [likesLoading, setLikesLoading] = useState(false);
  const [likesLoaded, setLikesLoaded] = useState(false);

  const [notFound, setNotFound] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);

  // Editor states
  const [articleEditorOpen, setArticleEditorOpen] = useState(false);
  const [selectedArticleDraft, setSelectedArticleDraft] = useState<ArticleEditorInitialData | null>(null);
  const [postEditorOpen, setPostEditorOpen] = useState(false);
  const [selectedPostDraft, setSelectedPostDraft] = useState<any>(null);

  // User list modal state (Followers / Following)
  const [userListModalOpen, setUserListModalOpen] = useState(false);
  const [userListModalTitle, setUserListModalTitle] = useState<"Followers" | "Following">("Followers");
  const [userListUsers, setUserListUsers] = useState<UserListItem[]>([]);
  const [userListLoading, setUserListLoading] = useState(false);
  const [shareProfileOpen, setShareProfileOpen] = useState(false);

  const isOwnProfile =
    !authLoading && currentUser?.username === username;

  const profileTabs = isOwnProfile
    ? ["Posts", "Articles", "Drafts", "Media", "Likes"]
    : ["Posts", "Articles", "Media", "Likes"];

  // Fetch base profile data
  useEffect(() => {
    if (!username) return;

    setProfileLoading(true);
    setNotFound(false);

    api
      .get(`/api/profile/${username}`)
      .then((res) => {
        setProfileUser(res.data.user);
        setUserPosts(res.data.posts?.data ?? []);
      })
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
      })
      .finally(() => setProfileLoading(false));

    const handlePostCreated = (e: Event) => {
      const customEvent = e as CustomEvent<PostCardProps>;
      if (customEvent.detail && currentUser?.username === username) {
        setUserPosts((prev) => {
          if (prev.some((p) => String(p.id) === String(customEvent.detail.id))) {
            return prev;
          }
          return [customEvent.detail, ...prev];
        });
      }
    };

    const handlePostDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string | number }>;
      if (customEvent.detail && customEvent.detail.id) {
        setUserPosts((prev) => prev.filter((p) => String(p.id) !== String(customEvent.detail.id)));
      }
    };

    window.addEventListener("post-created", handlePostCreated);
    window.addEventListener("post-deleted", handlePostDeleted);
    return () => {
      window.removeEventListener("post-created", handlePostCreated);
      window.removeEventListener("post-deleted", handlePostDeleted);
    };
  }, [username, currentUser?.username]);

  // Fetch articles when Articles tab is active
  const fetchArticles = useCallback(() => {
    if (!username) return;
    setArticlesLoading(true);
    api
      .get(`/api/profile/${username}/articles`)
      .then((res) => {
        setUserArticles(res.data.data ?? []);
        setArticlesLoaded(true);
      })
      .catch(() => {})
      .finally(() => setArticlesLoading(false));
  }, [username]);

  useEffect(() => {
    if (activeTab === "Articles" && !articlesLoaded) {
      fetchArticles();
    }
  }, [activeTab, articlesLoaded, fetchArticles]);

  // Fetch media when Media tab is active
  const fetchMedia = useCallback(() => {
    if (!username) return;
    setMediaLoading(true);
    api
      .get(`/api/profile/${username}/media`)
      .then((res) => {
        setUserMedia(res.data.media ?? []);
        setMediaLoaded(true);
      })
      .catch(() => {})
      .finally(() => setMediaLoading(false));
  }, [username]);

  useEffect(() => {
    if (activeTab === "Media" && !mediaLoaded) {
      fetchMedia();
    }
  }, [activeTab, mediaLoaded, fetchMedia]);

  // Fetch likes when Likes tab is active
  const fetchLikes = useCallback(() => {
    if (!username) return;
    setLikesLoading(true);
    api
      .get(`/api/profile/${username}/likes`)
      .then((res) => {
        setLikedPosts(res.data.posts ?? []);
        setLikedArticles(res.data.articles ?? []);
        setLikesLoaded(true);
      })
      .catch(() => {})
      .finally(() => setLikesLoading(false));
  }, [username]);

  useEffect(() => {
    if (activeTab === "Likes" && !likesLoaded) {
      fetchLikes();
    }
  }, [activeTab, likesLoaded, fetchLikes]);

  // Fetch drafts when Drafts tab is active
  const fetchDrafts = useCallback(() => {
    if (!isOwnProfile) return;
    setDraftsLoading(true);
    api
      .get("/api/drafts")
      .then((res) => {
        setArticleDrafts(res.data.article_drafts ?? []);
        setPostDrafts(res.data.post_drafts ?? []);
        setDraftsLoaded(true);
      })
      .catch(() => {})
      .finally(() => setDraftsLoading(false));
  }, [isOwnProfile]);

  useEffect(() => {
    if (activeTab === "Drafts" && isOwnProfile && !draftsLoaded) {
      fetchDrafts();
    }
  }, [activeTab, isOwnProfile, draftsLoaded, fetchDrafts]);

  // Handle follow / unfollow
  const handleFollowToggle = async () => {
    if (!currentUser) {
      toast.error("Please sign in to follow users");
      return;
    }
    if (!profileUser) return;

    try {
      const res = await api.post(`/api/users/${profileUser.id}/follow`);
      const isFollowing = res.data.is_following;
      setProfileUser((prev) =>
        prev
          ? {
              ...prev,
              is_following: isFollowing,
              followers_count: res.data.followers_count,
            }
          : null
      );
      toast.success(isFollowing ? `Following @${profileUser.username}` : `Unfollowed @${profileUser.username}`);
    } catch {
      toast.error("Failed to update follow status");
    }
  };

  // Draft actions
  const handleEditArticleDraft = (art: ArticleItem) => {
    setSelectedArticleDraft({
      id: art.id,
      title: art.title,
      content: art.content,
      excerpt: art.excerpt,
      cover_image: art.cover_image,
      tags: art.tags,
      status: art.status,
    });
    setArticleEditorOpen(true);
  };

  const handleDeleteArticleDraft = async (id: number) => {
    try {
      await api.delete(`/api/articles/${id}`);
      setArticleDrafts((prev) => prev.filter((d) => d.id !== id));
      toast.success("Draft deleted");
    } catch {
      toast.error("Failed to delete draft");
    }
  };

  const handleDeletePostDraft = async (id: string | number) => {
    try {
      await api.delete(`/api/posts/${id}`);
      setPostDrafts((prev) => prev.filter((d) => String(d.id) !== String(id)));
      toast.success("Post draft deleted");
    } catch {
      toast.error("Failed to delete draft");
    }
  };

  // Open user list modal
  const openUserListModal = async (type: "Followers" | "Following") => {
    setUserListModalTitle(type);
    setUserListModalOpen(true);
    setUserListLoading(true);
    try {
      const endpoint =
        type === "Followers"
          ? `/api/profile/${username}/followers`
          : `/api/profile/${username}/following`;
      const res = await api.get(endpoint);
      setUserListUsers(res.data.users || []);
    } catch {
      setUserListUsers([]);
    } finally {
      setUserListLoading(false);
    }
  };

  const handleModalUserFollowToggle = async (userId: number, targetName: string) => {
    if (!currentUser) {
      toast.error("Please sign in to follow users");
      return;
    }
    try {
      const res = await api.post(`/api/users/${userId}/follow`);
      const nextState = res.data.is_following;
      setUserListUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_following: nextState } : u))
      );
      toast.success(nextState ? `Following ${targetName}` : `Unfollowed ${targetName}`);
    } catch {
      toast.error("Failed to follow user");
    }
  };

  if (profileLoading) {
    return <ProfileSkeleton />;
  }

  if (notFound || !profileUser) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
          <UserX className="size-8 text-muted-foreground" />
        </div>
        <h2 className="mb-1 text-xl font-bold text-foreground">User not found</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          The user @{username} doesn&apos;t exist or was suspended.
        </p>
        <Link href="/">
          <Button variant="outline" className="gap-2 rounded-full">
            <ArrowLeft className="size-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  const joinDate = profileUser.created_at
    ? new Date(profileUser.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div>
      {/* Sticky top header */}
      <div className="sticky top-0 z-30 flex items-center gap-4 border-b border-border/60 bg-background/80 px-4 py-2 backdrop-blur-md">
        <button
          onClick={() => router.back()}
          className="rounded-full p-1.5 hover:bg-muted transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <div className="flex items-center gap-1">
            <h1 className="text-base font-bold text-foreground leading-tight">
              {profileUser.name}
            </h1>
            {Boolean(profileUser.verified) && <VerifiedBadge size="sm" />}
          </div>
          <p className="text-xs text-muted-foreground">
            {profileUser.posts_count ?? userPosts.length} posts
          </p>
        </div>
      </div>

      {/* Cover image / gradient header */}
      <div className="h-32 sm:h-48 w-full bg-gradient-to-r from-primary/30 via-amber-500/20 to-violet-500/30 relative overflow-hidden">
        {profileUser.cover && (
          <img
            src={getAvatarUrl(profileUser.cover)}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Profile Header Details */}
      <div className="px-4 pb-4 sm:px-5">
        {/* Avatar & Actions Row */}
        <div className="-mt-12 mb-3 flex items-end justify-between sm:-mt-16">
          <Avatar className="size-24 sm:size-32 rounded-full border-4 border-background shadow-lg ring-2 ring-border/30">
            <AvatarImage
              src={getAvatarUrl(profileUser.avatar)}
              alt={profileUser.name}
              className="object-cover"
            />
            <AvatarFallback className="bg-muted text-xl sm:text-2xl font-bold text-muted-foreground">
              {profileUser.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-full"
              onClick={() => setShareProfileOpen(true)}
              title="Share profile / QR Code"
            >
              <Share2 className="size-4" />
            </Button>

            {isOwnProfile ? (
              <Button
                variant="outline"
                className="rounded-full text-sm font-semibold h-9 px-4"
                onClick={() => router.push("/settings")}
              >
                Edit Profile
              </Button>
            ) : (
              <Button
                onClick={handleFollowToggle}
                className={`rounded-full text-sm font-bold h-9 px-5 transition-all ${
                  profileUser.is_following
                    ? "bg-muted text-foreground hover:bg-destructive/10 hover:text-destructive border border-border"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                }`}
              >
                {profileUser.is_following ? "Following" : "Follow"}
              </Button>
            )}
          </div>
        </div>

        {/* User Names */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-xl font-bold text-foreground">
              {profileUser.name}
            </h2>
            {Boolean(profileUser.verified) && <VerifiedBadge size="md" />}
          </div>
          <p className="text-sm text-muted-foreground font-medium">@{profileUser.username}</p>
        </div>

        {/* Bio */}
        {profileUser.bio && (
          <p className="mb-3 text-[15px] leading-relaxed text-foreground/90 whitespace-pre-line">
            {profileUser.bio}
          </p>
        )}

        {/* Meta Info */}
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {profileUser.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-4 text-muted-foreground/70" />
              {profileUser.location}
            </span>
          )}
          {profileUser.website && (
            <a
              href={
                profileUser.website.startsWith("http")
                  ? profileUser.website
                  : `https://${profileUser.website}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <LinkIcon className="size-4" />
              {profileUser.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          {joinDate && (
            <span className="flex items-center gap-1">
              <Calendar className="size-4 text-muted-foreground/70" />
              Joined {joinDate}
            </span>
          )}
        </div>

        {/* Followers / Following counts */}
        <div className="flex gap-5 text-sm">
          <button
            onClick={() => openUserListModal("Following")}
            className="hover:underline cursor-pointer text-left"
          >
            <strong className="text-foreground font-bold">{profileUser.following_count ?? 0}</strong>{" "}
            <span className="text-muted-foreground">Following</span>
          </button>

          <button
            onClick={() => openUserListModal("Followers")}
            className="hover:underline cursor-pointer text-left"
          >
            <strong className="text-foreground font-bold">{profileUser.followers_count ?? 0}</strong>{" "}
            <span className="text-muted-foreground">Followers</span>
          </button>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="border-b border-border/60">
        <div className="flex overflow-x-auto no-scrollbar">
          {profileTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[75px] py-3.5 text-sm font-semibold text-center transition-colors relative ${
                activeTab === tab
                  ? "text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <span>{tab}</span>
              {activeTab === tab && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: POSTS ── */}
      {activeTab === "Posts" && (
        <div>
          {userPosts.length > 0 ? (
            <div>
              {userPosts.map((post) => (
                <PostCard key={post.id} {...post} showPinnedBadge={true} />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                <FileText className="size-8 text-muted-foreground" />
              </div>
              <h3 className="mb-1 text-lg font-bold text-foreground">
                No posts yet
              </h3>
              <p className="text-sm text-muted-foreground">
                {isOwnProfile
                  ? "When you create posts, they'll show up here."
                  : `@${profileUser.username} hasn't posted anything yet.`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: ARTICLES ── */}
      {activeTab === "Articles" && (
        <div>
          {articlesLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="size-8 animate-spin mx-auto text-primary" />
            </div>
          ) : userArticles.length > 0 ? (
            <div className="divide-y divide-border/60">
              {userArticles.map((art) => (
                <ArticleCard key={art.id} article={art} />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center max-w-sm mx-auto">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BookOpen className="size-8" />
              </div>
              <h3 className="mb-1 text-lg font-bold text-foreground">
                No articles yet
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {isOwnProfile
                  ? "Write and publish comprehensive long-form articles, guides, or stories."
                  : `@${profileUser.username} hasn't published any articles yet.`}
              </p>
              {isOwnProfile && (
                <Button
                  onClick={() => {
                    setSelectedArticleDraft(null);
                    setArticleEditorOpen(true);
                  }}
                  className="rounded-full text-xs font-bold gap-1.5"
                >
                  <Plus className="size-4" />
                  Write an Article
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: DRAFTS (Private - Owner Only) ── */}
      {activeTab === "Drafts" && isOwnProfile && (
        <div className="p-4 sm:p-5 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Lock className="size-4 text-amber-500" />
                Private Drafts
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                These drafts are only visible to you. Finish writing or publish them anytime.
              </p>
            </div>

            {/* <Button
              size="sm"
              onClick={() => {
                setSelectedArticleDraft(null);
                setArticleEditorOpen(true);
              }}
              className="rounded-full text-xs font-bold gap-1"
            >
              <Plus className="size-3.5" />
              New Draft
            </Button> */}
          </div>

          {draftsLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="size-8 animate-spin mx-auto text-primary" />
            </div>
          ) : articleDrafts.length === 0 && postDrafts.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-border/60 rounded-2xl">
              <p className="text-sm font-semibold text-foreground mb-1">No drafts saved</p>
              <p className="text-xs text-muted-foreground">
                When you click &quot;Save as Draft&quot; while writing a post or article, it will appear here safely.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Article Drafts */}
              {articleDrafts.length > 0 && (
                <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/60">
                  <div className="px-4 py-2.5 bg-muted/30 text-xs font-bold text-foreground">
                    Article Drafts ({articleDrafts.length})
                  </div>
                  {articleDrafts.map((d) => (
                    <ArticleCard
                      key={d.id}
                      article={d}
                      isDraft={true}
                      onEditDraft={handleEditArticleDraft}
                      onDeleteDraft={handleDeleteArticleDraft}
                    />
                  ))}
                </div>
              )}

              {/* Post Drafts */}
              {postDrafts.length > 0 && (
                <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/60">
                  <div className="px-4 py-2.5 bg-muted/30 text-xs font-bold text-foreground">
                    Post Drafts ({postDrafts.length})
                  </div>
                  {postDrafts.map((pd) => (
                    <div key={pd.id} className="p-4 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground line-clamp-2">{pd.content || "Empty post content"}</p>
                        <span className="text-[11px] text-muted-foreground mt-1 inline-block">
                          Draft post
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPostDraft({
                              id: pd.id,
                              content: pd.content,
                              images: pd.images,
                            });
                            setPostEditorOpen(true);
                          }}
                          className="h-8 px-3 text-xs rounded-full"
                        >
                          <Pencil className="size-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeletePostDraft(pd.id)}
                          className="h-8 px-2 text-xs rounded-full text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: MEDIA ── */}
      {activeTab === "Media" && (
        <div>
          {mediaLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 sm:p-5 animate-in fade-in-50 duration-300">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-square rounded-xl bg-muted/70 animate-pulse border border-border/50" />
              ))}
            </div>
          ) : userMedia.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="size-12 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <FileText className="size-6" />
              </div>
              <p className="text-sm font-bold text-foreground">No media found</p>
              <p className="text-xs text-muted-foreground">Photos and covers uploaded by @{username} will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 sm:p-5 animate-in fade-in duration-300">
              {userMedia.map((m, idx) => (
                <Link
                  key={m.id || idx}
                  href={m.type === "article_cover" ? `/article/${encodeURIComponent(m.article_slug)}` : `/post/${m.post_id}`}
                  className="aspect-square rounded-xl overflow-hidden border border-border/60 bg-muted relative group shadow-2xs block"
                >
                  <img
                    src={getAvatarUrl(m.url)}
                    alt={m.title || "Media"}
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end">
                    <span className="text-[11px] font-bold text-white line-clamp-1 drop-shadow-sm">
                      {m.title || (m.type === "article_cover" ? "Article Cover" : "Post Photo")}
                    </span>
                    <span className="text-[9px] text-white/80 uppercase font-extrabold tracking-wider mt-0.5">
                      {m.type === "article_cover" ? "Article" : "Post"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: LIKES ── */}
      {activeTab === "Likes" && (
        <div className="divide-y divide-border/60 animate-in fade-in duration-300">
          {likesLoading ? (
            <div className="divide-y divide-border/60">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 sm:p-5 space-y-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-muted" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 w-32 rounded bg-muted" />
                      <div className="h-3 w-20 rounded bg-muted" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-full rounded bg-muted" />
                    <div className="h-4 w-3/4 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : likedPosts.length === 0 && likedArticles.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="size-12 mx-auto rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                <FileText className="size-6" />
              </div>
              <p className="text-sm font-bold text-foreground">No liked content yet</p>
              <p className="text-xs text-muted-foreground">Posts and articles liked by @{username} will appear here.</p>
            </div>
          ) : (
            <div>
              {/* Liked Articles */}
              {likedArticles.map((art) => (
                <ArticleCard key={`liked_art_${art.id}`} article={art} />
              ))}

              {/* Liked Posts */}
              {likedPosts.map((post) => (
                <PostCard key={`liked_post_${post.id}`} {...post} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Followers / Following List Dialog */}
      <Dialog open={userListModalOpen} onOpenChange={setUserListModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-5 gap-4">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="size-5 text-primary" />
              <span>{userListModalTitle}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
            {userListLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="size-6 animate-spin mx-auto text-primary" />
              </div>
            ) : userListUsers.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No {userListModalTitle.toLowerCase()} to display.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {userListUsers.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                    <Link
                      href={`/@${item.username}`}
                      onClick={() => setUserListModalOpen(false)}
                      className="flex items-center gap-3 min-w-0"
                    >
                      <Avatar className="size-10 shrink-0">
                        <AvatarImage src={getAvatarUrl(item.avatar)} alt={item.name} />
                        <AvatarFallback className="text-xs font-bold bg-muted">
                          {getInitials(item.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-semibold text-foreground truncate hover:underline">
                            {item.name}
                          </p>
                          {Boolean(item.verified) && <VerifiedBadge size="sm" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          @{item.username}
                        </p>
                      </div>
                    </Link>

                    {currentUser && currentUser.username !== item.username && (
                      <Button
                        size="sm"
                        onClick={() => handleModalUserFollowToggle(item.id, item.name)}
                        className={`rounded-full h-8 text-xs font-bold px-4 transition-all ${
                          item.is_following
                            ? "bg-muted text-foreground hover:bg-destructive/10 hover:text-destructive border border-border"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}
                      >
                        {item.is_following ? "Following" : "Follow"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Share & QR Code Dialog */}
      {profileUser && (
        <ProfileShareDialog
          open={shareProfileOpen}
          onOpenChange={setShareProfileOpen}
          user={profileUser}
        />
      )}

      {/* Article Editor Dialog */}
      <ArticleEditorDialog
        open={articleEditorOpen}
        onOpenChange={setArticleEditorOpen}
        initialData={selectedArticleDraft}
        onSaved={() => {
          fetchArticles();
          if (isOwnProfile) fetchDrafts();
        }}
      />

      {/* Post Editor Dialog for editing post drafts */}
      <PostEditorDialog
        open={postEditorOpen}
        onOpenChange={setPostEditorOpen}
        postToEdit={selectedPostDraft}
        onPostUpdated={() => {
          if (isOwnProfile) fetchDrafts();
        }}
      />
    </div>
  );
}

export default function UserProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <UserProfileContent />
    </Suspense>
  );
}
