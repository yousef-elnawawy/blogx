<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Blog;
use App\Models\Hashtag;
use App\Models\Post;
use App\Models\Series;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class SearchController extends Controller
{
    /**
     * Helper to format Series for search results.
     */
    private function formatSeries(Series $item): array
    {
        $totalReadTime = $item->publishedBlogs ? $item->publishedBlogs->sum('read_time') : 0;

        $coverUrl = $item->cover_image;
        if ($coverUrl && !str_starts_with($coverUrl, 'http')) {
            $clean = ltrim($coverUrl, '/');
            if (str_starts_with($clean, 'storage/')) {
                $clean = substr($clean, 8);
            }
            $coverUrl = config('app.url') . '/storage/' . ltrim($clean, '/');
        }

        $avatarUrl = $item->user?->avatar;
        if ($avatarUrl && !str_starts_with($avatarUrl, 'http')) {
            $avatarUrl = config('app.url') . $avatarUrl;
        }

        return [
            'id'              => $item->id,
            'title'           => $item->title,
            'slug'            => $item->slug,
            'description'     => $item->description,
            'cover_image'     => $coverUrl,
            'views_count'     => (int) $item->views_count,
            'blogs_count'     => (int) ($item->published_blogs_count ?? ($item->publishedBlogs ? $item->publishedBlogs->count() : 0)),
            'total_read_time' => (int) ($totalReadTime ?: 1),
            'created_at'      => $item->created_at?->toIso8601String(),
            'author'          => [
                'id'              => $item->user?->id,
                'name'            => $item->user?->name ?? 'Unknown',
                'username'        => $item->user?->username ?? 'unknown',
                'avatar'          => $avatarUrl,
                'verified'        => (bool) ($item->user?->verified ?? false),
                'equipped_badges' => $item->user?->equipped_badges ?? [],
            ],
        ];
    }

    /**
     * Global search: posts, users, hashtags.
     */
    public function search(Request $request)
    {
        $ip = $request->ip();
        $throttleKey = 'search:' . $ip;

        if (RateLimiter::tooManyAttempts($throttleKey, 60)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => "Too many search requests. Please wait {$seconds} seconds.",
                'retry_after' => $seconds,
            ], 429);
        }

        RateLimiter::hit($throttleKey, 60);

        $q    = trim($request->get('q', ''));
        $type = $request->get('type', 'all'); // all | posts | people | hashtags
        $user = $request->user() ?? auth('sanctum')->user();

        if ($q === '') {
            return response()->json([
                'posts'    => [],
                'blogs'    => [],
                'series'   => [],
                'people'   => [],
                'hashtags' => [],
            ]);
        }

        $page    = max((int) $request->get('page', 1), 1);
        $perPage = min(max((int) $request->get('per_page', 15), 5), 50);

        $postController = new PostController();
        $blogController = new BlogController();
        $communityController = new CommunityController();
        $result = [];

        // Single tab paginated search: posts
        if ($type === 'posts') {
            try {
                $paginator = Post::search($q)->paginate($perPage, 'page', $page);
                $paginator->getCollection()->load(['user', 'images'])->loadCount(['likes', 'comments']);
                $posts = $paginator->getCollection()->map(fn($post) => $postController->formatPost($post, $user));
                return response()->json([
                    'posts'        => $posts->values(),
                    'has_more'     => $paginator->hasMorePages(),
                    'current_page' => $paginator->currentPage(),
                    'total'        => $paginator->total(),
                ]);
            } catch (\Throwable $e) {
                $paginator = Post::with(['user', 'images'])
                    ->withCount(['likes', 'comments'])
                    ->where('content', 'like', "%{$q}%")
                    ->latest()
                    ->paginate($perPage, ['*'], 'page', $page);
                $posts = $paginator->getCollection()->map(fn($post) => $postController->formatPost($post, $user));
                return response()->json([
                    'posts'        => $posts->values(),
                    'has_more'     => $paginator->hasMorePages(),
                    'current_page' => $paginator->currentPage(),
                    'total'        => $paginator->total(),
                ]);
            }
        }

        // Single tab paginated search: blogs & series
        if ($type === 'blogs') {
            $cleanQ = ltrim($q, '#');
            try {
                $paginator = Blog::search($cleanQ ?: $q)->paginate($perPage, 'page', $page);
                $paginator->getCollection()->load('user')->loadCount('likes');
                $blogs = $paginator->getCollection()->map(fn($b) => $blogController->formatBlog($b, $user));
            } catch (\Throwable $e) {
                $paginator = Blog::published()
                    ->with('user')
                    ->withCount('likes')
                    ->where(function ($w) use ($q, $cleanQ) {
                        $w->where('title', 'like', "%{$q}%")
                          ->orWhere('content', 'like', "%{$q}%")
                          ->orWhere('excerpt', 'like', "%{$q}%")
                          ->orWhereJsonContains('tags', $cleanQ)
                          ->orWhereJsonContains('tags', $q);
                    })
                    ->latest('published_at')
                    ->paginate($perPage, ['*'], 'page', $page);
                $blogs = $paginator->getCollection()->map(fn($b) => $blogController->formatBlog($b, $user));
            }

            // Search Series / Stories
            $seriesList = Series::where('is_published', true)
                ->where(function ($w) use ($q, $cleanQ) {
                    $w->where('title', 'like', "%{$q}%")
                      ->orWhere('title', 'like', "%{$cleanQ}%")
                      ->orWhere('description', 'like', "%{$q}%")
                      ->orWhere('description', 'like', "%{$cleanQ}%");
                })
                ->with(['user', 'publishedBlogs' => function ($sq) {
                    $sq->select('id', 'series_id', 'title', 'slug', 'read_time', 'views_count', 'published_at')
                      ->orderBy('series_order', 'asc');
                }])
                ->withCount('publishedBlogs')
                ->latest()
                ->take(10)
                ->get()
                ->map(fn($s) => $this->formatSeries($s));

            return response()->json([
                'blogs'        => $blogs->values(),
                'series'       => $seriesList->values(),
                'has_more'     => $paginator->hasMorePages(),
                'current_page' => $paginator->currentPage(),
                'total'        => $paginator->total() + $seriesList->count(),
            ]);
        }

        // Single tab paginated search: people
        if ($type === 'people') {
            try {
                $paginator = User::search($q)->paginate($perPage, 'page', $page);
                $paginator->getCollection()->loadCount(['followers', 'following', 'posts' => fn($p) => $p->published()]);
                $rawPeople = $paginator->getCollection();
                $hasMore = $paginator->hasMorePages();
                $total = $paginator->total();
            } catch (\Throwable $e) {
                $paginator = User::where(function ($query) use ($q) {
                    $query->where('name', 'like', "%{$q}%")
                        ->orWhere('username', 'like', "%{$q}%")
                        ->orWhere('bio', 'like', "%{$q}%");
                })
                ->withCount(['followers', 'following', 'posts' => fn($p) => $p->published()])
                ->paginate($perPage, ['*'], 'page', $page);
                $rawPeople = $paginator->getCollection();
                $hasMore = $paginator->hasMorePages();
                $total = $paginator->total();
            }

            $people = $rawPeople->map(function ($u) use ($user) {
                $avatarUrl = $u->avatar;
                if ($avatarUrl && !str_starts_with($avatarUrl, 'http')) {
                    $avatarUrl = config('app.url') . $avatarUrl;
                }
                $coverUrl = $u->cover;
                if ($coverUrl && !str_starts_with($coverUrl, 'http')) {
                    $coverUrl = config('app.url') . $coverUrl;
                }
                return [
                    'id'              => $u->id,
                    'name'            => $u->name,
                    'username'        => $u->username,
                    'avatar'          => $avatarUrl,
                    'cover'           => $coverUrl,
                    'bio'             => $u->bio,
                    'location'        => $u->location,
                    'website'         => $u->website,
                    'verified'        => (bool) $u->verified,
                    'followers_count' => (int) $u->followers_count,
                    'following_count' => (int) $u->following_count,
                    'posts_count'     => (int) $u->posts_count,
                    'is_following'    => $user ? $user->isFollowing($u) : false,
                ];
            });

            return response()->json([
                'people'       => $people->values(),
                'has_more'     => $hasMore,
                'current_page' => $page,
                'total'        => $total,
            ]);
        }

        // Single tab paginated search: communities
        if ($type === 'communities') {
            $cleanQ = ltrim($q, 'c/');
            try {
                $paginator = \App\Models\Community::search($cleanQ ?: $q)->paginate($perPage, 'page', $page);
                $paginator->getCollection()->load(['creator:id,name,username,avatar,verified'])
                    ->loadCount(['approvedMembers as members_count', 'posts as posts_count']);
                $communities = $paginator->getCollection()->map(fn($c) => $communityController->formatCommunity($c, $user));
                return response()->json([
                    'communities'  => $communities->values(),
                    'has_more'     => $paginator->hasMorePages(),
                    'current_page' => $paginator->currentPage(),
                    'total'        => $paginator->total(),
                ]);
            } catch (\Throwable $e) {
                $paginator = \App\Models\Community::with(['creator:id,name,username,avatar,verified'])
                    ->withCount(['approvedMembers as members_count', 'posts as posts_count'])
                    ->where(function ($w) use ($q, $cleanQ) {
                        $w->where('name', 'like', "%{$q}%")
                          ->orWhere('name', 'like', "%{$cleanQ}%")
                          ->orWhere('slug', 'like', "%{$q}%")
                          ->orWhere('slug', 'like', "%{$cleanQ}%")
                          ->orWhere('description', 'like', "%{$q}%");
                    })
                    ->orderByDesc('members_count')
                    ->paginate($perPage, ['*'], 'page', $page);
                $communities = $paginator->getCollection()->map(fn($c) => $communityController->formatCommunity($c, $user));
                return response()->json([
                    'communities'  => $communities->values(),
                    'has_more'     => $paginator->hasMorePages(),
                    'current_page' => $paginator->currentPage(),
                    'total'        => $paginator->total(),
                ]);
            }
        }

        // Single tab paginated search: hashtags
        if ($type === 'hashtags') {
            $cleanQ = ltrim($q, '#');
            $paginator = Hashtag::where('tag', 'like', "%{$cleanQ}%")
                ->orderByDesc('usage_count')
                ->paginate($perPage, ['*'], 'page', $page);

            $hashtags = $paginator->getCollection()->map(fn($h) => [
                'tag'         => $h->tag,
                'usage_count' => $h->usage_count,
            ]);

            return response()->json([
                'hashtags'     => $hashtags->values(),
                'has_more'     => $paginator->hasMorePages(),
                'current_page' => $paginator->currentPage(),
                'total'        => $paginator->total(),
            ]);
        }

        // Type 'all': Top results across all models (Algolia Powered)
        try {
            $posts = Post::search($q)
                ->take(6)
                ->get()
                ->load(['user', 'images'])
                ->loadCount(['likes', 'comments'])
                ->map(fn($post) => $postController->formatPost($post, $user));
        } catch (\Throwable $e) {
            $posts = Post::with(['user', 'images'])
                ->withCount(['likes', 'comments'])
                ->where('content', 'like', "%{$q}%")
                ->latest()
                ->take(6)
                ->get()
                ->map(fn($post) => $postController->formatPost($post, $user));
        }
        $result['posts'] = $posts->values();

        $cleanQ = ltrim($q, '#');
        try {
            $blogs = \App\Models\Blog::search($cleanQ ?: $q)
                ->take(6)
                ->get()
                ->filter(fn($b) => $b->status === 'published')
                ->load('user')
                ->loadCount('likes')
                ->map(fn($b) => $blogController->formatBlog($b, $user));
        } catch (\Throwable $e) {
            $blogs = \App\Models\Blog::published()
                ->with('user')
                ->withCount('likes')
                ->where(function ($w) use ($q, $cleanQ) {
                    $w->where('title', 'like', "%{$q}%")
                      ->orWhere('content', 'like', "%{$q}%")
                      ->orWhere('excerpt', 'like', "%{$q}%")
                      ->orWhereJsonContains('tags', $cleanQ)
                      ->orWhereJsonContains('tags', $q);
                })
                ->latest('published_at')
                ->take(6)
                ->get()
                ->map(fn($b) => $blogController->formatBlog($b, $user));
        }
        $result['blogs'] = $blogs->values();

        // Series / Stories
        $series = Series::where('is_published', true)
            ->where(function ($w) use ($q, $cleanQ) {
                $w->where('title', 'like', "%{$q}%")
                  ->orWhere('title', 'like', "%{$cleanQ}%")
                  ->orWhere('description', 'like', "%{$q}%")
                  ->orWhere('description', 'like', "%{$cleanQ}%");
            })
            ->with(['user', 'publishedBlogs' => function ($sq) {
                $sq->select('id', 'series_id', 'title', 'slug', 'read_time', 'views_count', 'published_at')
                  ->orderBy('series_order', 'asc');
            }])
            ->withCount('publishedBlogs')
            ->latest()
            ->take(4)
            ->get()
            ->map(fn($s) => $this->formatSeries($s));
        $result['series'] = $series->values();

        try {
            $rawPeople = User::search($q)
                ->take(6)
                ->get()
                ->loadCount(['followers', 'following', 'posts' => fn($p) => $p->published()]);
        } catch (\Throwable $e) {
            $rawPeople = User::where(function ($query) use ($q) {
                $query->where('name', 'like', "%{$q}%")
                    ->orWhere('username', 'like', "%{$q}%")
                    ->orWhere('bio', 'like', "%{$q}%");
            })
            ->withCount(['followers', 'following', 'posts' => fn($p) => $p->published()])
            ->take(6)
            ->get();
        }
        $people = $rawPeople->map(function ($u) use ($user) {
            $avatarUrl = $u->avatar;
            if ($avatarUrl && !str_starts_with($avatarUrl, 'http')) {
                $avatarUrl = config('app.url') . $avatarUrl;
            }
            $coverUrl = $u->cover;
            if ($coverUrl && !str_starts_with($coverUrl, 'http')) {
                $coverUrl = config('app.url') . $coverUrl;
            }
            return [
                'id'              => $u->id,
                'name'            => $u->name,
                'username'        => $u->username,
                'avatar'          => $avatarUrl,
                'cover'           => $coverUrl,
                'bio'             => $u->bio,
                'location'        => $u->location,
                'website'         => $u->website,
                'verified'        => (bool) $u->verified,
                'followers_count' => (int) $u->followers_count,
                'following_count' => (int) $u->following_count,
                'posts_count'     => (int) $u->posts_count,
                'is_following'    => $user ? $user->isFollowing($u) : false,
            ];
        });
        $result['people'] = $people->values();

        $cleanQComm = ltrim($q, 'c/');
        try {
            $communities = \App\Models\Community::search($cleanQComm ?: $q)
                ->take(6)
                ->get()
                ->load(['creator:id,name,username,avatar,verified'])
                ->loadCount(['approvedMembers as members_count', 'posts as posts_count'])
                ->map(fn($c) => $communityController->formatCommunity($c, $user));
        } catch (\Throwable $e) {
            $communities = \App\Models\Community::with(['creator:id,name,username,avatar,verified'])
                ->withCount(['approvedMembers as members_count', 'posts as posts_count'])
                ->where(function ($w) use ($q, $cleanQComm) {
                    $w->where('name', 'like', "%{$q}%")
                      ->orWhere('name', 'like', "%{$cleanQComm}%")
                      ->orWhere('slug', 'like', "%{$q}%")
                      ->orWhere('slug', 'like', "%{$cleanQComm}%")
                      ->orWhere('description', 'like', "%{$q}%");
                })
                ->orderByDesc('members_count')
                ->take(6)
                ->get()
                ->map(fn($c) => $communityController->formatCommunity($c, $user));
        }
        $result['communities'] = $communities->values();

        $hashtags = Hashtag::where('tag', 'like', "%{$cleanQ}%")
            ->orderByDesc('usage_count')
            ->take(6)
            ->get()
            ->map(fn($h) => [
                'tag'         => $h->tag,
                'usage_count' => $h->usage_count,
            ]);
        $result['hashtags'] = $hashtags->values();

        return response()->json($result);
    }

    /**
     * Return top trending hashtags ordered by usage_count.
     */
    public function trending(Request $request)
    {
        $limit = min((int) $request->get('limit', 10), 50);

        $hashtags = Hashtag::orderByDesc('usage_count')
            ->take($limit)
            ->get()
            ->map(fn($h) => [
                'tag'         => $h->tag,
                'usage_count' => $h->usage_count,
            ]);

        return response()->json(['hashtags' => $hashtags]);
    }

    /**
     * Return paginated posts and blogs for a specific hashtag.
     */
    public function hashtagPosts(Request $request, string $tag)
    {
        $user    = $request->user() ?? auth('sanctum')->user();
        $cleanTag = mb_strtolower(ltrim($tag, '#'));

        $hashtag = Hashtag::where('tag', $cleanTag)->first();
        $postController = new PostController();
        $blogController = new BlogController();

        $blogs = \App\Models\Blog::published()
            ->with('user')
            ->withCount('likes')
            ->where(function ($w) use ($cleanTag) {
                $w->whereJsonContains('tags', $cleanTag)
                  ->orWhere('title', 'like', "%#{$cleanTag}%")
                  ->orWhere('content', 'like', "%#{$cleanTag}%");
            })
            ->latest('published_at')
            ->take(20)
            ->get()
            ->map(fn($b) => $blogController->formatBlog($b, $user));

        $postIds = [];
        if ($hashtag) {
            $postIds = $hashtag->posts()->pluck('posts.id')->toArray();
        }

        $postsQuery = Post::published()
            ->where(function ($q) use ($postIds, $cleanTag) {
                if (!empty($postIds)) {
                    $q->whereIn('id', $postIds);
                }
                $q->orWhere('content', 'like', "%#{$cleanTag}%");
            })
            ->with(['user', 'images', 'mentions.user', 'repostOf.user', 'repostOf.images', 'quoteOf.user', 'quoteOf.images', 'community', 'poll.options', 'poll.votes'])
            ->withCount(['likes', 'comments'])
            ->latest();

        $posts = $postsQuery->paginate(15);
        $posts->getCollection()->transform(
            fn($post) => $postController->formatPost($post, $user)
        );

        $totalItems = $posts->total() + count($blogs);
        $usageCount = $hashtag ? max($hashtag->usage_count, $totalItems) : $totalItems;

        return response()->json([
            'hashtag' => [
                'tag'         => $cleanTag,
                'usage_count' => $usageCount,
            ],
            'posts' => $posts,
            'blogs' => $blogs,
            'total' => $totalItems,
        ]);
    }

    /**
     * Autocomplete hashtag suggestions while typing.
     */
    public function suggest(Request $request)
    {
        $q = ltrim(trim($request->get('q', '')), '#');

        if ($q === '') {
            // Return top popular hashtags when nothing typed yet
            $hashtags = Hashtag::orderByDesc('usage_count')
                ->take(8)
                ->get()
                ->map(fn($h) => [
                    'tag'         => $h->tag,
                    'usage_count' => $h->usage_count,
                ]);

            return response()->json(['hashtags' => $hashtags]);
        }

        $hashtags = Hashtag::where('tag', 'like', "{$q}%")
            ->orWhere('tag', 'like', "%{$q}%")
            ->orderByDesc('usage_count')
            ->take(8)
            ->get()
            ->map(fn($h) => [
                'tag'         => $h->tag,
                'usage_count' => $h->usage_count,
            ]);

        return response()->json(['hashtags' => $hashtags]);
    }

    /**
     * Autocomplete user / mention suggestions while typing '@'.
     */
    public function suggestUsers(Request $request)
    {
        $q = ltrim(trim($request->get('q', '')), '@');

        $query = User::query();

        if ($q !== '') {
            $query->where(function ($sub) use ($q) {
                $sub->where('username', 'like', "{$q}%")
                    ->orWhere('name', 'like', "{$q}%")
                    ->orWhere('username', 'like', "%{$q}%");
            });
        }

        $users = $query->take(6)
            ->get()
            ->map(function ($u) {
                $avatarUrl = $u->avatar;
                if ($avatarUrl && !str_starts_with($avatarUrl, 'http')) {
                    $avatarUrl = config('app.url') . $avatarUrl;
                }
                return [
                    'id'       => $u->id,
                    'name'     => $u->name,
                    'username' => $u->username,
                    'avatar'   => $avatarUrl,
                    'verified' => (bool) $u->verified,
                ];
            });

        return response()->json(['users' => $users]);
    }
}
