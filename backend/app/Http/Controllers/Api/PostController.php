<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Hashtag;
use App\Models\Post;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
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
            ->with(['user', 'images', 'mentions.user'])
            ->withCount(['likes', 'comments']);

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
     * Return a single post by ID with comments (public).
     */
    public function show(Request $request, $id)
    {
        $user = $request->user() ?? auth('sanctum')->user();

        $post = Post::with([
            'user',
            'images',
            'mentions.user',
            'comments' => function ($query) {
                $query->whereNull('parent_id')
                    ->with(['user', 'replies.user', 'likes'])
                    ->withCount('likes')
                    ->latest();
            }
        ])
        ->withCount(['likes', 'comments'])
        ->find($id);

        if (!$post) {
            return response()->json(['message' => 'Post not found'], 404);
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

        if (!$post) {
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

        if (!$post) {
            return response()->json(['message' => 'Post not found'], 404);
        }

        $validated = $request->validate([
            'content'   => ['required', 'string', 'max:2000'],
            'parent_id' => ['nullable', 'exists:comments,id'],
        ]);

        $comment = $post->comments()->create([
            'user_id'   => $request->user()->id,
            'content'   => $validated['content'],
            'parent_id' => $validated['parent_id'] ?? null,
        ]);

        NotificationService::sendCommentNotification($request->user(), $comment, $post);

        // Mentions in comment
        preg_match_all('/@([a-zA-Z0-9_]+)/u', $validated['content'], $cMatches);
        $commentUsernames = array_unique(array_map('strtolower', $cMatches[1] ?? []));
        if (!empty($commentUsernames)) {
            $mentionedUsers = User::whereIn('username', $commentUsernames)->get();
            foreach ($mentionedUsers as $mUser) {
                NotificationService::sendMentionNotification($request->user(), $mUser, $post);
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

        if (!$post) {
            return response()->json(['message' => 'Post not found'], 404);
        }

        $comment = $post->comments()->find($commentId);

        if (!$comment) {
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
     * Toggle bookmark on a post (authenticated).
     */
    public function toggleBookmark(Request $request, $id)
    {
        $user = $request->user();
        $post = Post::find($id);

        if (!$post) {
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

        $posts = Post::whereHas('bookmarks', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })
        ->with(['user', 'images', 'mentions.user'])
        ->withCount(['likes', 'comments'])
        ->latest()
        ->paginate(15);

        $posts->getCollection()->transform(function ($post) use ($user) {
            return $this->formatPost($post, $user);
        });

        return response()->json($posts);
    }

    /**
     * Get user's liked posts (authenticated).
     */
    public function likedPosts(Request $request)
    {
        $user = $request->user();

        $posts = Post::whereHas('likes', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })
        ->with(['user', 'images', 'mentions.user'])
        ->withCount(['likes', 'comments'])
        ->latest()
        ->paginate(15);

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

        $posts = Post::whereIn('user_id', $followingIds)
            ->published()
            ->with(['user', 'images', 'mentions.user'])
            ->withCount(['likes', 'comments'])
            ->latest()
            ->paginate(15);

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

        $posts = Post::whereHas('mentions', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })
        ->with(['user', 'images', 'mentions.user'])
        ->withCount(['likes', 'comments'])
        ->latest()
        ->paginate(15);

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
            'content'           => ['required_without:images', 'nullable', 'string', 'max:5000'],
            'images'            => ['nullable', 'array', 'max:10'],
            'images.*'          => ['image', 'max:102400'], // Up to 100 MB per image
            'comments_enabled'  => ['nullable', 'boolean'],
            'scheduled_at'      => ['nullable', 'date'],
            'status'            => ['nullable', 'in:published,draft'],
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

        $post = Post::create([
            'user_id'          => $request->user()->id,
            'content'          => $validated['content'] ?? '',
            'comments_enabled' => $validated['comments_enabled'] ?? true,
            'status'           => $postStatus,
            'scheduled_at'     => $scheduledAt,
        ]);

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

        // Extract and sync hashtags and mentions
        $this->syncHashtags($post, $validated['content'] ?? '');
        $this->syncMentions($post, $validated['content'] ?? '');

        // Check Milestone on publishing posts immediately (if not scheduled for future)
        if (!$isScheduled) {
            NotificationService::checkPostCountMilestone($request->user());
        }

        $post->load(['user', 'images']);
        $post->loadCount(['likes', 'comments']);

        return response()->json([
            'message' => $isScheduled ? 'Post scheduled successfully' : 'Post created successfully',
            'post'    => $this->formatPost($post, $request->user()),
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
     * Extract OpenGraph and metadata preview for any given URL.
     */
    public function previewLink(Request $request)
    {
        $url = $request->query('url');
        if (!$url || !filter_var($url, FILTER_VALIDATE_URL)) {
            return response()->json(['error' => 'Invalid URL'], 422);
        }

        $cacheKey = 'link_preview_' . md5($url);
        $preview = cache()->remember($cacheKey, 86400, function () use ($url) {
            try {
                $response = \Illuminate\Support\Facades\Http::timeout(5)
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
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'content'          => ['nullable', 'string', 'max:5000'],
            'images'           => ['nullable', 'array', 'max:10'],
            'images.*'         => ['image', 'max:102400'], // Up to 100 MB per image
            'removed_images'   => ['nullable', 'array'],
            'removed_images.*' => ['string'],
            'status'           => ['nullable', 'in:published,draft,scheduled'],
        ]);

        $updateData = [
            'content'   => $validated['content'] ?? '',
            'is_edited' => true,
        ];
        if (isset($validated['status'])) {
            $updateData['status'] = $validated['status'];
        }

        $post->update($updateData);

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

        $post->load(['user', 'images']);
        $post->loadCount(['likes', 'comments']);

        return response()->json([
            'message' => 'Post updated successfully',
            'post'    => $this->formatPost($post, $request->user()),
        ]);
    }

    /**
     * Delete a post (authenticated owner only).
     */
    public function destroy(Request $request, $id)
    {
        $post = Post::with('images')->find($id);

        if (!$post) {
            return response()->json(['message' => 'Post not found'], 404);
        }

        if ($post->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        foreach ($post->images as $img) {
            Storage::disk('public')->delete($img->image_path);
            $img->delete();
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

    public function formatPost(Post $post, $user): array
    {
        $avatarUrl = $post->user->avatar;
        if ($avatarUrl && !str_starts_with($avatarUrl, 'http')) {
            $avatarUrl = config('app.url') . $avatarUrl;
        }

        // Get array of valid mentioned usernames (lowercase)
        $mentions = $post->mentions->loadMissing('user')->map(function ($m) {
            return $m->user ? strtolower($m->user->username) : null;
        })->filter()->values()->toArray();

        return [
            'id'              => $post->id,
            'content'         => $post->content,
            'created_at'      => $post->created_at,
            'likes_count'     => $post->likes_count ?? $post->likes()->count(),
            'comments_count'  => $post->comments_count ?? $post->comments()->count(),
            'views_count'     => (int) ($post->views_count ?? 0),
            'is_edited'       => (bool) $post->is_edited,
            'is_pinned'       => (bool) $post->is_pinned,
            'status'          => $post->status ?? 'published',
            'scheduled_at'    => $post->scheduled_at ? $post->scheduled_at->toIso8601String() : null,
            'is_liked'        => $user ? $post->isLikedBy($user) : false,
            'is_bookmarked'   => $user ? $post->isBookmarkedBy($user) : false,
            'mentions'        => $mentions,
            'images'          => $post->images->map(function ($img) {
                $path = $img->image_path;
                if ($path && !str_starts_with($path, 'http')) {
                    return config('app.url') . '/storage/' . ltrim($path, '/');
                }
                return $path;
            })->values(),
            'author' => [
                'id'       => $post->user->id,
                'name'     => $post->user->name,
                'username' => $post->user->username,
                'avatar'   => $avatarUrl,
                'verified' => (bool) $post->user->verified,
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
            'id'          => $comment->id,
            'content'     => $comment->content,
            'created_at'  => $comment->created_at,
            'likes_count' => $comment->likes_count ?? $comment->likes()->count(),
            'is_liked'    => $user ? $comment->isLikedBy($user) : false,
            'mentions'    => $validCommentMentions,
            'author' => [
                'id'       => $comment->user->id,
                'name'     => $comment->user->name,
                'username' => $comment->user->username,
                'avatar'   => $avatarUrl,
                'verified' => (bool) $comment->user->verified,
            ],
            'replies' => $comment->replies ? $comment->replies->map(function ($reply) use ($user) {
                return $this->formatComment($reply, $user);
            }) : [],
        ];
    }
}

