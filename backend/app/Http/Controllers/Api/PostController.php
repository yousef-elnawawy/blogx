<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Hashtag;
use App\Models\Post;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;

class PostController extends Controller
{
    /**
     * Return a paginated feed of all posts (public).
     */
    public function index(Request $request)
    {
        $user = $request->user() ?? auth('sanctum')->user();
        $tab = $request->query('tab', 'for_you');

        $query = Post::published()
            ->with(['user', 'images', 'mentions.user', 'repostOf.user', 'repostOf.images', 'quoteOf.user', 'quoteOf.images', 'community', 'poll.options', 'poll.votes'])
            ->withCount(['likes', 'comments']);

        // Only include community posts in general feed if user is a member of that community
        if ($user) {
            $joinedCommunityIds = \App\Models\CommunityMember::where('user_id', $user->id)
                ->where('status', 'approved')
                ->pluck('community_id');

            $query->where(function ($q) use ($joinedCommunityIds) {
                $q->whereNull('community_id')
                  ->orWhereIn('community_id', $joinedCommunityIds);
            });
        } else {
            $query->whereNull('community_id');
        }

        $category = $request->query('category');
        if (!empty($category) && $category !== 'all') {
            $query->where('category', $category);
        }

        // Apply Ghost block and mute filters
        $this->applyGhostAndMuteFilter($query, $user);

        if ($tab === 'following') {
            if ($user) {
                $followingIds = $user->following()->pluck('users.id');
                $query->whereIn('user_id', $followingIds);
            }
            $query->latest();
        } elseif ($tab === 'trending') {
            $query->orderByRaw('(likes_count * 2 + comments_count * 3 + views_count) DESC')
                  ->latest();
        } elseif ($tab === 'latest') {
            $query->latest('created_at');
        } else {
            // For You - default feed
            $query->latest();
        }

        $posts = $query->paginate(15);

        $posts->getCollection()->transform(function ($post) use ($user) {
            return $this->formatPost($post, $user);
        });

        return response()->json($posts);
    }

    /**
     * Return feed of posts that have videos attached.
     */
    public function videos(Request $request)
    {
        $user = $request->user() ?? auth('sanctum')->user();

        $query = Post::published()
            ->whereNotNull('video_url')
            ->with([
                'user',
                'images',
                'poll.options',
                'community',
            ]);

        $this->applyGhostAndMuteFilter($query, $user);

        $posts = $query->latest()->paginate(12);

        $posts->getCollection()->transform(function ($post) use ($user) {
            return $this->formatPost($post, $user);
        });

        return response()->json($posts);
    }

    /**
     * Return a single post by ID with comments (public).
     */
    public function show(Request $request, $id)
    {
        $user = $request->user() ?? auth('sanctum')->user();
        $sort = $request->query('sort', 'top'); // top, newest, oldest

        $post = Post::with([
            'user',
            'images',
            'mentions.user',
            'repostOf.user',
            'repostOf.images',
            'quoteOf.user',
            'quoteOf.images',
            'community',
            'comments' => function ($query) use ($sort, $user) {
                $blockedUserIds = $user ? $user->allBlockedUserIds() : [];

                $query->whereNull('parent_id')
                    ->with([
                        'user',
                        'replies' => function ($rq) use ($blockedUserIds) {
                            $rq->with(['user', 'likes']);
                            if (!empty($blockedUserIds)) {
                                $rq->whereNotIn('user_id', $blockedUserIds);
                            }
                        },
                        'likes',
                    ])
                    ->withCount(['likes', 'replies'])
                    ->orderByDesc('is_pinned');

                if (!empty($blockedUserIds)) {
                    $query->whereNotIn('user_id', $blockedUserIds);
                }

                if ($sort === 'newest') {
                    $query->latest();
                } elseif ($sort === 'oldest') {
                    $query->oldest();
                } else {
                    // Top (Most liked, then latest)
                    $query->orderByDesc('likes_count')->latest();
                }
            }
        ])
        ->withCount(['likes', 'comments'])
        ->find($id);

        if (!$post) {
            return response()->json(['message' => 'Post not found'], 404);
        }

        // Strict Ghost Block Check: if either author or viewer blocked each other, return 404
        if ($user && $user->id !== $post->user_id) {
            if ($user->hasBlockedOrIsBlockedBy($post->user_id)) {
                return response()->json(['message' => 'Post not found'], 404);
            }
        }

        $formattedPost = $this->formatPost($post, $user);
        $formattedPost['comments'] = $post->comments->map(function ($comment) use ($user) {
            return $this->formatComment($comment, $user);
        });

        return response()->json($formattedPost);
    }

    /**
     * Toggle like on a post (authenticated).
     */
    public function toggleLike(Request $request, $id)
    {
        $user = $request->user();
        $post = Post::find($id);

        if (!$post || $user->hasBlockedOrIsBlockedBy($post->user_id)) {
            return response()->json(['message' => 'Post not found'], 404);
        }

        $existingLike = $post->likes()->where('user_id', $user->id)->first();

        if ($existingLike) {
            $existingLike->delete();
            $isLiked = false;
        } else {
            $post->likes()->create([
                'user_id' => $user->id,
            ]);
            $isLiked = true;
            NotificationService::sendLikePostNotification($user, $post);
        }

        $likesCount = $post->likes()->count();

        return response()->json([
            'message'     => $isLiked ? 'Post liked' : 'Post unliked',
            'is_liked'    => $isLiked,
            'likes_count' => $likesCount,
        ]);
    }

    /**
     * Store a comment on a post (authenticated).
     */
    public function storeComment(Request $request, $id)
    {
        $post = Post::find($id);

        if (!$post || $request->user()->hasBlockedOrIsBlockedBy($post->user_id)) {
            return response()->json(['message' => 'Post not found'], 404);
        }

        $validated = $request->validate([
            'content'   => ['nullable', 'string', 'max:2000'],
            'image'     => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:10240'],
            'parent_id' => ['nullable', 'exists:comments,id'],
        ]);

        if (empty($validated['content']) && !$request->hasFile('image')) {
            return response()->json(['message' => 'Comment cannot be empty'], 422);
        }

        $imageUrl = null;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('comments', 'public');
            $imageUrl = '/storage/' . $path;
        }

        $comment = $post->comments()->create([
            'user_id'   => $request->user()->id,
            'content'   => $validated['content'] ?? '',
            'image_url' => $imageUrl,
            'parent_id' => $validated['parent_id'] ?? null,
        ]);

        NotificationService::sendCommentNotification($request->user(), $comment, $post);

        // Mentions in comment
        if (!empty($validated['content'])) {
            preg_match_all('/@([a-zA-Z0-9_]+)/u', $validated['content'], $cMatches);
            $commentUsernames = array_unique(array_map('strtolower', $cMatches[1] ?? []));
            if (!empty($commentUsernames)) {
                $mentionedUsers = User::whereIn('username', $commentUsernames)->get();
                foreach ($mentionedUsers as $mUser) {
                    NotificationService::sendMentionNotification($request->user(), $mUser, $post);
                }
            }
        }

        $comment->load(['user', 'replies.user']);
        $comment->loadCount('likes');

        return response()->json([
            'message'        => 'Comment added successfully',
            'comment'        => $this->formatComment($comment, $request->user()),
            'comments_count' => $post->comments()->count(),
        ], 201);
    }

    /**
     * Toggle like on a comment or reply (authenticated).
     */
    public function toggleCommentLike(Request $request, $id, $commentId)
    {
        $post = Post::find($id);

        if (!$post || $request->user()->hasBlockedOrIsBlockedBy($post->user_id)) {
            return response()->json(['message' => 'Post not found'], 404);
        }

        $comment = $post->comments()->find($commentId);

        if (!$comment || $request->user()->hasBlockedOrIsBlockedBy($comment->user_id)) {
            return response()->json(['message' => 'Comment not found'], 404);
        }

        $existingLike = $comment->likes()->where('user_id', $request->user()->id)->first();

        if ($existingLike) {
            $existingLike->delete();
            $isLiked = false;
        } else {
            $comment->likes()->create(['user_id' => $request->user()->id]);
            $isLiked = true;
            NotificationService::sendLikeCommentNotification($request->user(), $comment, $post);
        }

        return response()->json([
            'message'     => $isLiked ? 'Comment liked' : 'Comment unliked',
            'is_liked'    => $isLiked,
            'likes_count' => $comment->likes()->count(),
        ]);
    }

    /**
     * Update comment content (authenticated, comment owner only).
     */
    public function updateComment(Request $request, $id, $commentId)
    {
        $post = Post::find($id);
        if (!$post || $request->user()->hasBlockedOrIsBlockedBy($post->user_id)) return response()->json(['message' => 'Post not found'], 404);

        $comment = $post->comments()->where('user_id', $request->user()->id)->find($commentId);
        if (!$comment) {
            return response()->json(['message' => 'Comment not found or unauthorized'], 404);
        }

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:2000'],
        ]);

        $comment->update([
            'content'   => $validated['content'],
            'is_edited' => true,
        ]);

        $comment->load(['user', 'replies.user']);
        $comment->loadCount('likes');

        return response()->json([
            'message' => 'Comment updated successfully',
            'comment' => $this->formatComment($comment, $request->user()),
        ]);
    }

    /**
     * Delete a comment (authenticated, comment owner or post author).
     */
    public function destroyComment(Request $request, $id, $commentId)
    {
        $post = Post::find($id);
        if (!$post || $request->user()->hasBlockedOrIsBlockedBy($post->user_id)) return response()->json(['message' => 'Post not found'], 404);

        $comment = $post->comments()->find($commentId);
        if (!$comment) {
            return response()->json(['message' => 'Comment not found'], 404);
        }

        $user = $request->user();
        if ($comment->user_id !== $user->id && $post->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized to delete this comment'], 403);
        }

        $comment->delete();

        return response()->json([
            'message'        => 'Comment deleted successfully',
            'comments_count' => $post->comments()->count(),
        ]);
    }

    /**
     * Toggle pin on a top-level comment (authenticated, post owner only).
     */
    public function togglePinComment(Request $request, $id, $commentId)
    {
        $post = Post::find($id);
        if (!$post || $request->user()->hasBlockedOrIsBlockedBy($post->user_id)) return response()->json(['message' => 'Post not found'], 404);

        if ($post->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Only post author can pin comments'], 403);
        }

        $comment = $post->comments()->find($commentId);
        if (!$comment) return response()->json(['message' => 'Comment not found'], 404);

        $newPinned = !$comment->is_pinned;

        // If pinning, unpin any previously pinned comment on this post
        if ($newPinned) {
            $post->comments()->where('id', '!=', $comment->id)->update(['is_pinned' => false]);
        }

        $comment->update(['is_pinned' => $newPinned]);

        return response()->json([
            'message'   => $newPinned ? 'Comment pinned to top' : 'Comment unpinned',
            'is_pinned' => $newPinned,
        ]);
    }

    /**
     * Toggle creator heart on a comment (authenticated, post owner only).
     */
    public function toggleHeartComment(Request $request, $id, $commentId)
    {
        $post = Post::find($id);
        if (!$post || $request->user()->hasBlockedOrIsBlockedBy($post->user_id)) return response()->json(['message' => 'Post not found'], 404);

        if ($post->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Only post author can heart comments'], 403);
        }

        $comment = $post->comments()->find($commentId);
        if (!$comment) return response()->json(['message' => 'Comment not found'], 404);

        $newHearted = !$comment->is_creator_liked;
        $comment->update(['is_creator_liked' => $newHearted]);

        return response()->json([
            'message'          => $newHearted ? 'Creator heart added' : 'Creator heart removed',
            'is_creator_liked' => $newHearted,
        ]);
    }

    /**
     * Toggle bookmark on a post (authenticated).
     */
    public function toggleBookmark(Request $request, $id)
    {
        $user = $request->user();
        $post = Post::find($id);

        if (!$post || $user->hasBlockedOrIsBlockedBy($post->user_id)) {
            return response()->json(['message' => 'Post not found'], 404);
        }

        $existing = $post->bookmarks()->where('user_id', $user->id)->first();

        if ($existing) {
            $existing->delete();
            $isBookmarked = false;
        } else {
            $post->bookmarks()->create([
                'user_id' => $user->id,
            ]);
            $isBookmarked = true;
        }

        return response()->json([
            'message'       => $isBookmarked ? 'Post saved' : 'Post removed from saved',
            'is_bookmarked' => $isBookmarked,
        ]);
    }

    /**
     * Get user's bookmarked posts (authenticated).
     */
    public function bookmarks(Request $request)
    {
        $user = $request->user();
        $collectionId = $request->query('collection_id');

        $bookmarksQuery = \App\Models\Bookmark::where('user_id', $user->id);

        if ($collectionId !== null && $collectionId !== '') {
            if ($collectionId === 'uncategorized') {
                $bookmarksQuery->whereNull('collection_id');
            } else {
                $bookmarksQuery->where('collection_id', (int) $collectionId);
            }
        }

        $blockedIds = $user->allBlockedUserIds();

        $postIds = (clone $bookmarksQuery)->whereNotNull('post_id')->pluck('post_id');
        $blogIds = (clone $bookmarksQuery)->whereNotNull('blog_id')->pluck('blog_id');

        $postsQuery = Post::whereIn('id', $postIds);
        if (!empty($blockedIds)) {
            $postsQuery->whereNotIn('user_id', $blockedIds);
        }

        $posts = $postsQuery
            ->with(['user', 'images', 'mentions.user'])
            ->withCount(['likes', 'comments'])
            ->latest()
            ->get()
            ->map(fn($p) => $this->formatPost($p, $user));

        $blogController = new BlogController();
        $blogsQuery = \App\Models\Blog::whereIn('id', $blogIds)->published();
        if (!empty($blockedIds)) {
            $blogsQuery->whereNotIn('user_id', $blockedIds);
        }

        $blogs = $blogsQuery
            ->with('user')
            ->withCount('likes')
            ->latest('published_at')
            ->get()
            ->map(fn($b) => $blogController->formatBlog($b, $user));

        return response()->json([
            'data'     => $posts,
            'posts'    => $posts,
            'blogs'    => $blogs,
            'articles' => $blogs,
        ]);
    }

    /**
     * Get user's liked posts (authenticated).
     */
    public function likedPosts(Request $request)
    {
        $user = $request->user();

        $query = Post::whereHas('likes', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })
        ->with(['user', 'images', 'mentions.user'])
        ->withCount(['likes', 'comments']);

        $this->applyGhostAndMuteFilter($query, $user);

        $posts = $query->latest()->paginate(15);

        $posts->getCollection()->transform(function ($post) use ($user) {
            return $this->formatPost($post, $user);
        });

        return response()->json($posts);
    }

    /**
     * Get posts feed from followed users (authenticated).
     */
    public function followingFeed(Request $request)
    {
        $user = $request->user();
        $followingIds = $user->following()->pluck('users.id');

        $query = Post::whereIn('user_id', $followingIds)
            ->published()
            ->with(['user', 'images', 'mentions.user'])
            ->withCount(['likes', 'comments']);

        $this->applyGhostAndMuteFilter($query, $user);

        $posts = $query->latest()->paginate(15);

        $posts->getCollection()->transform(function ($post) use ($user) {
            return $this->formatPost($post, $user);
        });

        return response()->json($posts);
    }

    /**
     * Get posts where the user is mentioned (authenticated).
     */
    public function mentions(Request $request)
    {
        $user = $request->user();

        $query = Post::whereHas('mentions', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })
        ->with(['user', 'images', 'mentions.user'])
        ->withCount(['likes', 'comments']);

        $this->applyGhostAndMuteFilter($query, $user);

        $posts = $query->latest()->paginate(15);

        $posts->getCollection()->transform(function ($post) use ($user) {
            return $this->formatPost($post, $user);
        });

        return response()->json($posts);
    }

    /**
     * Create a new post (authenticated).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'content'           => ['required_without_all:images,poll,video', 'nullable', 'string', 'max:50000'],
            'images'            => ['nullable', 'array', 'max:10'],
            'images.*'          => ['image', 'mimes:jpeg,png,jpg,webp,gif', 'max:51200'], // Up to 50 MB per image
            'video'             => ['nullable', 'file', 'max:1048576'], // Up to 1 GB video
            'video_duration'    => ['nullable', 'integer'],
            'video_thumbnail'   => ['nullable', 'file', 'max:51200'],
            'comments_enabled'  => ['nullable', 'boolean'],
            'scheduled_at'      => ['nullable', 'date'],
            'status'            => ['nullable', 'in:published,draft'],
            'community_id'      => ['nullable', 'exists:communities,id'],
            'quote_of_id'       => ['nullable', 'exists:posts,id'],
            'poll'              => ['nullable', 'array'],
            'poll.question'     => ['nullable', 'string', 'max:255'],
            'poll.options'      => ['required_with:poll', 'array', 'min:2', 'max:5'],
            'poll.options.*'    => ['required', 'string', 'max:150'],
            'poll.duration_days'=> ['nullable', 'integer', 'min:1', 'max:30'],
        ]);

        $status = $validated['status'] ?? 'published';
        $scheduledAt = !empty($validated['scheduled_at']) ? \Carbon\Carbon::parse($validated['scheduled_at']) : null;
        $isScheduled = $scheduledAt && $scheduledAt->isFuture() && $status !== 'draft';

        if ($status === 'draft') {
            $postStatus = 'draft';
        } elseif ($isScheduled) {
            $postStatus = 'scheduled';
        } else {
            $postStatus = 'published';
        }

        $communityId = $validated['community_id'] ?? null;
        if ($communityId) {
            $community = \App\Models\Community::find($communityId);
            if ($community && !$community->isMember($request->user()) && !$community->isAdmin($request->user())) {
                return response()->json(['message' => 'You must join this community before posting.'], 403);
            }
        }

        $categorizer = app(\App\Services\PostCategorizerService::class);
        $detectedCategory = $categorizer->categorize($validated['content'] ?? '');

        $post = Post::create([
            'user_id'          => $request->user()->id,
            'community_id'     => $communityId,
            'quote_of_id'      => $validated['quote_of_id'] ?? null,
            'content'          => $validated['content'] ?? '',
            'category'         => $detectedCategory,
            'comments_enabled' => $validated['comments_enabled'] ?? true,
            'status'           => $postStatus,
            'scheduled_at'     => $scheduledAt,
        ]);

        if ($communityId) {
            \App\Models\Community::where('id', $communityId)->increment('posts_count');
        }

        // Upload and store video
        if ($request->hasFile('video') && $request->file('video')->isValid()) {
            $videoFile = $request->file('video');
            $ext = $videoFile->getClientOriginalExtension() ?: 'mp4';
            $vName = 'vid_' . uniqid() . '_' . time() . '.' . $ext;
            $vPath = $videoFile->storeAs('posts_videos', $vName, 'public');
            
            $thumbPath = null;
            if ($request->hasFile('video_thumbnail') && $request->file('video_thumbnail')->isValid()) {
                $tPath = $request->file('video_thumbnail')->store('posts_videos', 'public');
                $thumbPath = '/storage/' . $tPath;
            }

            $post->update([
                'video_url' => '/storage/' . $vPath,
                'video_thumbnail' => $thumbPath,
                'video_duration' => $request->input('video_duration') ? (int) $request->input('video_duration') : null,
            ]);
        }

        // Upload and store images
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $order => $file) {
                $path = $file->store('posts', 'public');
                $post->images()->create([
                    'image_path' => $path,
                    'order'      => $order,
                ]);
            }
        }

        // Create Poll if provided
        if (!empty($validated['poll']) && !empty($validated['poll']['options'])) {
            $durationDays = (int) ($validated['poll']['duration_days'] ?? 1);
            $poll = \App\Models\Poll::create([
                'post_id'    => $post->id,
                'question'   => $validated['poll']['question'] ?? null,
                'expires_at' => now()->addDays(max(1, min(30, $durationDays))),
            ]);

            foreach ($validated['poll']['options'] as $idx => $optText) {
                if (trim($optText) !== '') {
                    $poll->options()->create([
                        'option_text' => trim($optText),
                        'order'       => $idx,
                        'votes_count' => 0,
                    ]);
                }
            }
        }

        // Extract and sync hashtags and mentions
        $this->syncHashtags($post, $validated['content'] ?? '');
        $this->syncMentions($post, $validated['content'] ?? '');

        // If quote of another post, send quote notification
        if (!empty($validated['quote_of_id'])) {
            $quotedPost = Post::find($validated['quote_of_id']);
            if ($quotedPost) {
                NotificationService::sendQuoteNotification($request->user(), $post, $quotedPost);
            }
        }

        // Check Milestone on publishing posts immediately (if not scheduled for future)
        if (!$isScheduled) {
            NotificationService::checkPostCountMilestone($request->user());
        }

        $post->load(['user', 'images', 'mentions.user', 'repostOf.user', 'repostOf.images', 'quoteOf.user', 'quoteOf.images', 'community', 'poll.options', 'poll.votes']);
        return response()->json([
            'message' => $isScheduled ? 'Post scheduled successfully' : 'Post created successfully',
            'post'    => $this->formatPost($post, $request->user()),
        ], 201);
    }

    /**
     * Toggle repost on a post (authenticated).
     */
    public function toggleRepost(Request $request, $id)
    {
        $user = $request->user();
        $targetPost = Post::find($id);

        if (!$targetPost || $user->hasBlockedOrIsBlockedBy($targetPost->user_id)) {
            return response()->json(['message' => 'Post not found'], 404);
        }

        // Enforce Repost rule 1: Community posts cannot be reposted
        if ($targetPost->community_id) {
            return response()->json(['message' => 'Community posts cannot be reposted.'], 422);
        }

        // Enforce Repost rule 2: Quote posts and pure reposts cannot be reposted
        if ($targetPost->quote_of_id || $targetPost->repost_of_id) {
            return response()->json(['message' => 'Quote posts and reposts cannot be reposted.'], 422);
        }

        $originalPost = $targetPost;

        $existingRepost = Post::where('user_id', $user->id)
            ->where('repost_of_id', $originalPost->id)
            ->first();

        if ($existingRepost) {
            $existingRepost->delete();
            $isReposted = false;
        } else {
            $repost = Post::create([
                'user_id'          => $user->id,
                'repost_of_id'     => $originalPost->id,
                'content'          => '',
                'status'           => 'published',
                'comments_enabled' => true,
            ]);
            $isReposted = true;
            NotificationService::sendRepostNotification($user, $originalPost);
        }

        $repostsCount = Post::where('repost_of_id', $originalPost->id)->count() + Post::where('quote_of_id', $originalPost->id)->count();

        return response()->json([
            'message'        => $isReposted ? 'Post reposted successfully' : 'Repost removed',
            'is_reposted'    => $isReposted,
            'reposts_count'  => $repostsCount,
        ]);
    }

    /**
     * Create a quote post (authenticated).
     */
    public function quote(Request $request, $id)
    {
        $user = $request->user();
        $targetPost = Post::find($id);

        if (!$targetPost || $user->hasBlockedOrIsBlockedBy($targetPost->user_id)) {
            return response()->json(['message' => 'Post not found'], 404);
        }

        // Enforce Quote rule 1: Community posts cannot be quoted
        if ($targetPost->community_id) {
            return response()->json(['message' => 'Community posts cannot be quoted.'], 422);
        }

        // Enforce Quote rule 2: Quote posts and reposts cannot be quoted
        if ($targetPost->quote_of_id || $targetPost->repost_of_id) {
            return response()->json(['message' => 'Quote posts and reposts cannot be quoted.'], 422);
        }

        $originalPost = $targetPost;

        $validated = $request->validate([
            'content'      => ['required', 'string', 'max:5000'],
            'images'       => ['nullable', 'array', 'max:10'],
            'images.*'     => ['image', 'mimes:jpeg,png,jpg,webp,gif', 'max:10240'],
            'community_id' => ['nullable', 'exists:communities,id'],
        ]);

        $categorizer = app(\App\Services\PostCategorizerService::class);
        $detectedCategory = $categorizer->categorize($validated['content'] ?? '');

        $post = Post::create([
            'user_id'          => $user->id,
            'quote_of_id'      => $originalPost->id,
            'community_id'     => $validated['community_id'] ?? null,
            'content'          => $validated['content'],
            'category'         => $detectedCategory,
            'status'           => 'published',
            'comments_enabled' => true,
        ]);

        if (!empty($validated['community_id'])) {
            \App\Models\Community::where('id', $validated['community_id'])->increment('posts_count');
        }

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $order => $file) {
                $path = $file->store('posts', 'public');
                $post->images()->create([
                    'image_path' => $path,
                    'order'      => $order,
                ]);
            }
        }

        $this->syncHashtags($post, $validated['content'] ?? '');
        $this->syncMentions($post, $validated['content'] ?? '');

        NotificationService::sendQuoteNotification($user, $post, $originalPost);
        NotificationService::checkPostCountMilestone($user);

        $post->load(['user', 'images', 'mentions.user', 'repostOf.user', 'repostOf.images', 'quoteOf.user', 'quoteOf.images', 'community']);
        $post->loadCount(['likes', 'comments']);

        return response()->json([
            'message' => 'Quote post published successfully',
            'post'    => $this->formatPost($post, $user),
        ], 201);
    }

    /**
     * Toggle pinned status of post (authenticated author only).
     */
    public function togglePin(Request $request, $id)
    {
        $user = $request->user();
        $post = Post::where('user_id', $user->id)->find($id);

        if (!$post) {
            return response()->json(['message' => 'Post not found or unauthorized'], 404);
        }

        $newPinnedState = !$post->is_pinned;

        if ($newPinnedState) {
            // Unpin all other posts of this user first
            Post::where('user_id', $user->id)->where('is_pinned', true)->update(['is_pinned' => false]);
        }

        $post->forceFill(['is_pinned' => $newPinnedState])->save();

        return response()->json([
            'message'   => $newPinnedState ? 'Post pinned to your profile' : 'Post unpinned from profile',
            'is_pinned' => $newPinnedState,
            'post'      => $this->formatPost($post->fresh(), $user),
        ]);
    }

    /**
     * Get user's upcoming scheduled posts (authenticated author only).
     */
    public function scheduled(Request $request)
    {
        $user = $request->user();

        $posts = Post::where('user_id', $user->id)
            ->scheduled()
            ->with(['user', 'images', 'mentions.user'])
            ->withCount(['likes', 'comments'])
            ->orderBy('scheduled_at', 'asc')
            ->paginate(15);

        $posts->getCollection()->transform(function ($post) use ($user) {
            return $this->formatPost($post, $user);
        });

        return response()->json($posts);
    }

    /**
     * Extract OpenGraph and metadata preview for any given URL with SSRF protection.
     */
    public function previewLink(Request $request)
    {
        $ip = $request->ip();
        $throttleKey = 'link_preview:' . $ip;

        if (RateLimiter::tooManyAttempts($throttleKey, 30)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'error' => "Too many requests. Please try again in {$seconds} seconds.",
                'retry_after' => $seconds,
            ], 429);
        }

        RateLimiter::hit($throttleKey, 60);

        $url = $request->query('url');
        if (!$url || !filter_var($url, FILTER_VALIDATE_URL)) {
            return response()->json(['error' => 'Invalid URL'], 422);
        }

        $parsed = parse_url($url);
        $scheme = strtolower($parsed['scheme'] ?? '');
        $host = strtolower($parsed['host'] ?? '');

        // Only allow http and https schemes
        if (!in_array($scheme, ['http', 'https'], true) || empty($host)) {
            return response()->json(['error' => 'Invalid URL scheme or host'], 422);
        }

        // Block localhost, internal hostnames, and metadata endpoints
        $blockedHosts = ['localhost', '127.0.0.1', '::1', '0.0.0.0', '169.254.169.254'];
        if (in_array($host, $blockedHosts, true) || str_ends_with($host, '.internal') || str_ends_with($host, '.local')) {
            return response()->json(['error' => 'URL target is not accessible'], 422);
        }

        // Resolve DNS and verify IP address is public
        $resolvedIps = @gethostbynamel($host);
        if (!$resolvedIps || empty($resolvedIps)) {
            return response()->json(['error' => 'Could not resolve host'], 422);
        }

        foreach ($resolvedIps as $ipAddress) {
            // Reject private and reserved IP ranges (SSRF defense)
            if (!filter_var($ipAddress, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return response()->json(['error' => 'Private and reserved addresses are not allowed'], 422);
            }
        }

        $cacheKey = 'link_preview_' . md5($url);
        $preview = cache()->remember($cacheKey, 86400, function () use ($url) {
            try {
                $response = \Illuminate\Support\Facades\Http::timeout(4)
                    ->withoutRedirecting() // Do not blindly follow redirects to internal networks
                    ->withHeaders(['User-Agent' => 'Mozilla/5.0 (compatible; BlogXBot/1.0; +http://blogx.com)'])
                    ->get($url);

                if (!$response->successful()) {
                    return null;
                }

                $html = $response->body();
                $doc = new \DOMDocument();
                @$doc->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));
                $xpath = new \DOMXPath($doc);

                $getTitle = function () use ($xpath, $doc) {
                    $nodes = $xpath->query('//meta[@property="og:title"]/@content');
                    if ($nodes->length > 0) return $nodes->item(0)->nodeValue;
                    $nodes = $xpath->query('//meta[@name="twitter:title"]/@content');
                    if ($nodes->length > 0) return $nodes->item(0)->nodeValue;
                    $titles = $doc->getElementsByTagName('title');
                    if ($titles->length > 0) return $titles->item(0)->nodeValue;
                    return null;
                };

                $getDescription = function () use ($xpath) {
                    $nodes = $xpath->query('//meta[@property="og:description"]/@content');
                    if ($nodes->length > 0) return $nodes->item(0)->nodeValue;
                    $nodes = $xpath->query('//meta[@name="twitter:description"]/@content');
                    if ($nodes->length > 0) return $nodes->item(0)->nodeValue;
                    $nodes = $xpath->query('//meta[@name="description"]/@content');
                    if ($nodes->length > 0) return $nodes->item(0)->nodeValue;
                    return null;
                };

                $getImage = function () use ($xpath, $url) {
                    $nodes = $xpath->query('//meta[@property="og:image"]/@content');
                    if ($nodes->length > 0) return $nodes->item(0)->nodeValue;
                    $nodes = $xpath->query('//meta[@name="twitter:image"]/@content');
                    if ($nodes->length > 0) return $nodes->item(0)->nodeValue;
                    return null;
                };

                $getSiteName = function () use ($xpath, $url) {
                    $nodes = $xpath->query('//meta[@property="og:site_name"]/@content');
                    if ($nodes->length > 0) return $nodes->item(0)->nodeValue;
                    return parse_url($url, PHP_URL_HOST);
                };

                $title = $getTitle();
                $description = $getDescription();
                $image = $getImage();
                $siteName = $getSiteName();

                if (!$title && !$description && !$image) {
                    return null;
                }

                return [
                    'url'         => $url,
                    'title'       => $title ? trim($title) : null,
                    'description' => $description ? trim($description) : null,
                    'image'       => $image ? trim($image) : null,
                    'site_name'   => $siteName ? trim($siteName) : parse_url($url, PHP_URL_HOST),
                    'domain'      => parse_url($url, PHP_URL_HOST),
                ];
            } catch (\Throwable $e) {
                return null;
            }
        });

        if (!$preview) {
            return response()->json(['message' => 'Could not fetch metadata for URL'], 404);
        }

        return response()->json($preview);
    }

    /**
     * Update an existing post (authenticated owner only).
     */
    public function update(Request $request, $id)
    {
        $post = Post::with(['user', 'images'])->find($id);

        if (!$post) {
            return response()->json(['message' => 'Post not found'], 404);
        }

        if ($post->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized: You can only edit your own posts.'], 403);
        }

        // Posts with polls cannot be edited
        if ($post->poll()->exists()) {
            return response()->json(['message' => 'Posts with polls cannot be edited.'], 422);
        }

        // Pure reposts cannot be edited
        if ($post->repost_of_id && empty($post->quote_of_id) && empty($post->content)) {
            return response()->json(['message' => 'Reposts cannot be edited.'], 422);
        }

        $validated = $request->validate([
            'content'          => ['nullable', 'string', 'max:50000'],
            'images'           => ['nullable', 'array', 'max:10'],
            'images.*'         => ['image', 'mimes:jpeg,png,jpg,webp,gif', 'max:51200'],
            'removed_images'   => ['nullable', 'array'],
            'removed_images.*' => ['string'],
            'video'            => ['nullable', 'file', 'max:1048576'],
            'video_thumbnail'  => ['nullable', 'file', 'max:51200'],
            'video_duration'   => ['nullable', 'numeric'],
            'remove_video'     => ['nullable'],
            'status'           => ['nullable', 'in:published,draft,scheduled'],
        ]);

        $updateData = [
            'content'   => $validated['content'] ?? '',
            'is_edited' => true,
        ];
        if (isset($validated['content'])) {
            $categorizer = app(\App\Services\PostCategorizerService::class);
            $updateData['category'] = $categorizer->categorize($validated['content']);
        }
        if (isset($validated['status'])) {
            $updateData['status'] = $validated['status'];
        }

        $post->update($updateData);

        // Handle video removal
        if ($request->boolean('remove_video') || $request->input('remove_video') === '1' || $request->input('remove_video') === 'true') {
            if ($post->video_url) {
                $cleanPath = str_replace('/storage/', '', $post->video_url);
                Storage::disk('public')->delete($cleanPath);
            }
            if ($post->video_thumbnail) {
                $cleanThumb = str_replace('/storage/', '', $post->video_thumbnail);
                Storage::disk('public')->delete($cleanThumb);
            }
            $post->update([
                'video_url'       => null,
                'video_thumbnail' => null,
                'video_duration'  => null,
            ]);
        }

        // Handle newly uploaded video
        if ($request->hasFile('video') && $request->file('video')->isValid()) {
            if ($post->video_url) {
                $cleanPath = str_replace('/storage/', '', $post->video_url);
                Storage::disk('public')->delete($cleanPath);
            }
            $videoFile = $request->file('video');
            $ext = $videoFile->getClientOriginalExtension() ?: 'mp4';
            $vName = 'vid_' . uniqid() . '_' . time() . '.' . $ext;
            $vPath = $videoFile->storeAs('posts_videos', $vName, 'public');

            $thumbPath = $post->video_thumbnail;
            if ($request->hasFile('video_thumbnail') && $request->file('video_thumbnail')->isValid()) {
                if ($post->video_thumbnail) {
                    $cleanThumb = str_replace('/storage/', '', $post->video_thumbnail);
                    Storage::disk('public')->delete($cleanThumb);
                }
                $tPath = $request->file('video_thumbnail')->store('posts_videos', 'public');
                $thumbPath = '/storage/' . $tPath;
            }

            $post->update([
                'video_url'       => '/storage/' . $vPath,
                'video_thumbnail' => $thumbPath,
                'video_duration'  => $request->filled('video_duration') ? (int) $request->input('video_duration') : null,
            ]);
        } elseif ($request->hasFile('video_thumbnail') && $request->file('video_thumbnail')->isValid()) {
            // Only updating thumbnail for existing video
            if ($post->video_thumbnail) {
                $cleanThumb = str_replace('/storage/', '', $post->video_thumbnail);
                Storage::disk('public')->delete($cleanThumb);
            }
            $tPath = $request->file('video_thumbnail')->store('posts_videos', 'public');
            $post->update([
                'video_thumbnail' => '/storage/' . $tPath,
            ]);
        }

        // Handle removed images
        if ($request->has('removed_images') && is_array($request->removed_images)) {
            foreach ($post->images as $img) {
                $fullUrl = str_starts_with($img->image_path, 'http')
                    ? $img->image_path
                    : config('app.url') . '/storage/' . ltrim($img->image_path, '/');

                if (in_array($fullUrl, $request->removed_images) || in_array($img->image_path, $request->removed_images)) {
                    Storage::disk('public')->delete($img->image_path);
                    $img->delete();
                }
            }
        }

        // Handle newly uploaded images
        if ($request->hasFile('images')) {
            $currentMaxOrder = $post->images()->max('order') ?? -1;
            foreach ($request->file('images') as $index => $file) {
                $path = $file->store('posts', 'public');
                $post->images()->create([
                    'image_path' => $path,
                    'order'      => $currentMaxOrder + 1 + $index,
                ]);
            }
        }

        // Extract and sync hashtags and mentions (re-sync on edit)
        $this->syncHashtags($post, $validated['content'] ?? '');
        $this->syncMentions($post, $validated['content'] ?? '');

        $post->load(['user', 'images', 'mentions.user', 'repostOf.user', 'repostOf.images', 'quoteOf.user', 'quoteOf.images', 'community']);
        $post->loadCount(['likes', 'comments']);

        return response()->json([
            'message' => 'Post updated successfully',
            'post'    => $this->formatPost($post, $request->user()),
        ]);
    }

    /**
     * Delete a post (authenticated owner or admin).
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $post = Post::with('images')->find($id);

        if (!$post) {
            return response()->json(['message' => 'Post not found'], 404);
        }

        if ($post->user_id !== $user->id && empty($user->is_admin)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        foreach ($post->images as $img) {
            Storage::disk('public')->delete($img->image_path);
            $img->delete();
        }

        if ($post->community_id) {
            \App\Models\Community::where('id', $post->community_id)->where('posts_count', '>', 0)->decrement('posts_count');
        }

        $post->delete();

        return response()->json([
            'message' => 'Post deleted successfully',
        ]);
    }

    /**
     * Record impression / view count for a post.
     */
    public function recordImpression(Request $request, $id)
    {
        $post = Post::find($id);

        if (!$post) {
            return response()->json(['message' => 'Post not found'], 404);
        }

        $post->increment('views_count');
        $updatedViews = (int) $post->fresh()->views_count;
        NotificationService::checkViewMilestone($post, $updatedViews);

        return response()->json([
            'message'     => 'Impression recorded',
            'views_count' => $updatedViews,
        ]);
    }

    /**
     * Batch record impressions for multiple post IDs when scrolled into view.
     */
    public function recordBatchImpressions(Request $request)
    {
        $validated = $request->validate([
            'ids'   => ['required', 'array'],
            'ids.*' => ['integer', 'exists:posts,id'],
        ]);

        Post::whereIn('id', $validated['ids'])->increment('views_count');

        $posts = Post::whereIn('id', $validated['ids'])->get();
        foreach ($posts as $p) {
            NotificationService::checkViewMilestone($p, (int) $p->views_count);
        }

        return response()->json([
            'message' => 'Batch impressions recorded',
        ]);
    }

    /**
     * Record a share on a post.
     */
    public function recordShare(Request $request, $id)
    {
        $post = Post::find($id);

        if (!$post) {
            return response()->json(['message' => 'Post not found'], 404);
        }

        $user = $request->user() ?? auth('sanctum')->user();
        $platform = $request->input('platform', 'link');

        NotificationService::sendShareNotification($user, $post, $platform);

        return response()->json([
            'message' => 'Share recorded successfully',
        ]);
    }

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------

    /**
     * Extract hashtags from content, upsert them, and sync with the post.
     */
    private function syncHashtags(Post $post, string $content): void
    {
        preg_match_all('/#([\p{L}\p{N}_]+)/u', $content, $matches);
        $tags = array_unique(array_map('mb_strtolower', $matches[1] ?? []));

        $hashtagIds = [];
        foreach ($tags as $tag) {
            $hashtag = Hashtag::firstOrCreate(
                ['tag' => $tag],
                ['usage_count' => 0]
            );
            // Increment only if this post didn't already have this tag
            if (!$post->hashtags()->where('hashtag_id', $hashtag->id)->exists()) {
                $hashtag->increment('usage_count');
            }
            $hashtagIds[] = $hashtag->id;
        }

        // Decrement usage_count for removed tags (on update)
        $oldTagIds = $post->hashtags()->pluck('hashtags.id')->toArray();
        $removedIds = array_diff($oldTagIds, $hashtagIds);
        foreach ($removedIds as $removedId) {
            Hashtag::where('id', $removedId)->decrement('usage_count');
        }

        // Sync the pivot
        $post->hashtags()->sync($hashtagIds);
    }

    /**
     * Extract @mentions from content and sync with the mentions table.
     */
    private function syncMentions(Post $post, string $content): void
    {
        preg_match_all('/@([a-zA-Z0-9_]+)/u', $content, $matches);
        $usernames = array_unique(array_map('strtolower', $matches[1] ?? []));

        if (empty($usernames)) {
            $post->mentions()->delete();
            return;
        }

        $userIds = User::whereIn('username', $usernames)->pluck('id')->toArray();
        $currentMentionUserIds = $post->mentions()->pluck('user_id')->toArray();

        $toAdd = array_diff($userIds, $currentMentionUserIds);
        $toRemove = array_diff($currentMentionUserIds, $userIds);

        if (!empty($toRemove)) {
            $post->mentions()->whereIn('user_id', $toRemove)->delete();
        }

        foreach ($toAdd as $userId) {
            $post->mentions()->firstOrCreate(['user_id' => $userId]);
            $mentionedUser = User::find($userId);
            if ($mentionedUser) {
                NotificationService::sendMentionNotification($post->user, $mentionedUser, $post);
            }
        }
    }

    public function formatPost(Post $post, $user, bool $includeNested = true): array
    {
        $avatarUrl = $post->user->avatar;
        if ($avatarUrl && !str_starts_with($avatarUrl, 'http')) {
            $avatarUrl = config('app.url') . $avatarUrl;
        }

        // Get array of valid mentioned usernames (lowercase)
        $mentions = $post->mentions->loadMissing('user')->map(function ($m) {
            return $m->user ? strtolower($m->user->username) : null;
        })->filter()->values()->toArray();

        // Repost of (nested)
        $repostOf = null;
        if ($includeNested && $post->repost_of_id && $post->repostOf) {
            if (!$user || !$user->hasBlockedOrIsBlockedBy($post->repostOf->user_id)) {
                $repostOf = $this->formatPost($post->repostOf, $user, false);
            }
        }

        // Quote of (nested)
        $quoteOf = null;
        if ($includeNested && $post->quote_of_id && $post->quoteOf) {
            if (!$user || !$user->hasBlockedOrIsBlockedBy($post->quoteOf->user_id)) {
                $quoteOf = $this->formatPost($post->quoteOf, $user, false);
            }
        }

        // Community
        $community = null;
        if ($post->community_id && $post->community) {
            $cAvatar = $post->community->avatar;
            if ($cAvatar && !str_starts_with($cAvatar, 'http')) {
                $cAvatar = config('app.url') . '/storage/' . ltrim($cAvatar, '/');
            }
            $community = [
                'id'     => $post->community->id,
                'name'   => $post->community->name,
                'slug'   => $post->community->slug,
                'avatar' => $cAvatar,
                'type'   => $post->community->type,
            ];
        }

        $repostsCount = $post->reposts_count ?? ($post->reposts()->count() + $post->quotes()->count());

        // Poll formatting
        $pollData = null;
        if ($post->relationLoaded('poll') ? $post->poll : $post->poll()->exists()) {
            $poll = $post->relationLoaded('poll') ? $post->poll : $post->poll()->with(['options', 'votes'])->first();
            if ($poll) {
                $pollController = new PollController();
                $pollData = $pollController->formatPoll($poll, $user);
            }
        }

        return [
            'id'              => $post->id,
            'content'         => $post->content,
            'category'        => $post->category ?? 'general',
            'created_at'      => $post->created_at,
            'likes_count'     => $post->likes_count ?? $post->likes()->count(),
            'comments_count'  => $post->comments_count ?? $post->comments()->count(),
            'reposts_count'   => (int) $repostsCount,
            'views_count'     => (int) ($post->views_count ?? 0),
            'is_edited'       => (bool) $post->is_edited,
            'is_pinned'       => (bool) $post->is_pinned,
            'status'          => $post->status ?? 'published',
            'scheduled_at'    => $post->scheduled_at ? $post->scheduled_at->toIso8601String() : null,
            'is_liked'        => $user ? $post->isLikedBy($user) : false,
            'is_bookmarked'   => $user ? $post->isBookmarkedBy($user) : false,
            'is_reposted'     => $user ? $post->isRepostedBy($user) : false,
            'repost_of_id'    => $post->repost_of_id,
            'quote_of_id'     => $post->quote_of_id,
            'repost_of'       => $repostOf,
            'quote_of'        => $quoteOf,
            'community_id'    => $post->community_id,
            'community'       => $community,
            'mentions'        => $mentions,
            'poll'            => $pollData,
            'video'           => $post->video_url ? [
                'url'       => str_starts_with($post->video_url, 'http') ? $post->video_url : config('app.url') . $post->video_url,
                'thumbnail' => $post->video_thumbnail ? (str_starts_with($post->video_thumbnail, 'http') ? $post->video_thumbnail : config('app.url') . $post->video_thumbnail) : null,
                'duration'  => $post->video_duration,
            ] : null,
            'images'          => $post->images->map(function ($img) {
                $path = $img->image_path;
                if ($path && !str_starts_with($path, 'http')) {
                    return config('app.url') . '/storage/' . ltrim($path, '/');
                }
                return $path;
            })->values(),
            'author' => [
                'id'              => $post->user->id,
                'name'            => $post->user->name,
                'username'        => $post->user->username,
                'avatar'          => $avatarUrl,
                'verified'        => (bool) $post->user->verified,
                'equipped_badges' => $post->user->equipped_badges ?? [],
            ],
        ];
    }

    private function formatComment($comment, $user): array
    {
        $avatarUrl = $comment->user->avatar;
        if ($avatarUrl && !str_starts_with($avatarUrl, 'http')) {
            $avatarUrl = config('app.url') . $avatarUrl;
        }

        // Extract valid mentioned usernames for this comment
        preg_match_all('/@([a-zA-Z0-9_]+)/u', $comment->content, $cMatches);
        $commentUsernames = array_unique(array_map('strtolower', $cMatches[1] ?? []));
        $validCommentMentions = !empty($commentUsernames)
            ? User::whereIn('username', $commentUsernames)->pluck('username')->map(fn($u) => strtolower($u))->values()->toArray()
            : [];

        return [
            'id'               => $comment->id,
            'content'          => $comment->content,
            'image_url'        => $comment->image_url ? (str_starts_with($comment->image_url, 'http') ? $comment->image_url : config('app.url') . $comment->image_url) : null,
            'is_pinned'        => (bool) $comment->is_pinned,
            'is_edited'        => (bool) $comment->is_edited,
            'is_creator_liked' => (bool) $comment->is_creator_liked,
            'created_at'       => $comment->created_at,
            'likes_count'      => $comment->likes_count ?? $comment->likes()->count(),
            'is_liked'         => $user ? $comment->isLikedBy($user) : false,
            'mentions'         => $validCommentMentions,
            'author' => [
                'id'              => $comment->user->id,
                'name'            => $comment->user->name,
                'username'        => $comment->user->username,
                'avatar'          => $avatarUrl,
                'verified'        => (bool) $comment->user->verified,
                'equipped_badges' => $comment->user->equipped_badges ?? [],
            ],
            'replies' => $comment->replies ? $comment->replies->map(function ($reply) use ($user) {
                return $this->formatComment($reply, $user);
            }) : [],
        ];
    }

    /**
     * Filter query to exclude blocked users, muted users, and muted keywords.
     */
    private function applyGhostAndMuteFilter($query, $user)
    {
        if (!$user) {
            return;
        }

        // 1. Exclude blocked users (both ways)
        $blockedUserIds = $user->blockedUsers()->pluck('users.id')
            ->merge($user->blockedByUsers()->pluck('users.id'))
            ->unique()
            ->toArray();

        // 2. Exclude muted users
        $mutedUserIds = $user->mutedUsers()->pluck('users.id')->toArray();

        $excludedUserIds = array_unique(array_merge($blockedUserIds, $mutedUserIds));

        if (!empty($excludedUserIds)) {
            $query->whereNotIn('user_id', $excludedUserIds);
        }

        // 3. Exclude muted keywords
        $mutedKeywords = $user->mutedKeywords()
            ->where(function ($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            })
            ->pluck('keyword')
            ->toArray();

        if (!empty($mutedKeywords)) {
            foreach ($mutedKeywords as $kw) {
                $kwClean = trim($kw);
                if (!empty($kwClean)) {
                    $query->where('content', 'NOT LIKE', '%' . $kwClean . '%');
                }
            }
        }
    }
}

