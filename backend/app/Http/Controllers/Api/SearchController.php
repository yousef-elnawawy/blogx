<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Hashtag;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class SearchController extends Controller
{
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
                'people'   => [],
                'hashtags' => [],
            ]);
        }

        $postController = new PostController();
        $result         = [];

        if (in_array($type, ['all', 'posts'])) {
            $posts = Post::with(['user', 'images'])
                ->withCount(['likes', 'comments'])
                ->where('content', 'like', "%{$q}%")
                ->latest()
                ->take(20)
                ->get()
                ->map(fn($post) => $postController->formatPost($post, $user));

            $result['posts'] = $posts->values();
        }

        if (in_array($type, ['all', 'blogs'])) {
            $blogController = new BlogController();
            $cleanQ = ltrim($q, '#');
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
                ->take(20)
                ->get()
                ->map(fn($b) => $blogController->formatBlog($b, $user));

            $result['blogs'] = $blogs->values();
        }

        if (in_array($type, ['all', 'people'])) {
            $peopleLimit = ($type === 'all') ? 6 : 30;
            $people = User::where(function ($query) use ($q) {
                $query->where('name', 'like', "%{$q}%")
                    ->orWhere('username', 'like', "%{$q}%")
                    ->orWhere('bio', 'like', "%{$q}%");
            })
            ->withCount(['followers', 'following', 'posts' => function ($p) {
                $p->published();
            }])
            ->take($peopleLimit)
            ->get()
            ->map(function ($u) use ($user) {
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
        }

        if (in_array($type, ['all', 'hashtags'])) {
            // Strip leading # if user typed it
            $cleanQ = ltrim($q, '#');

            $hashtags = Hashtag::where('tag', 'like', "%{$cleanQ}%")
                ->orderByDesc('usage_count')
                ->take(20)
                ->get()
                ->map(fn($h) => [
                    'tag'         => $h->tag,
                    'usage_count' => $h->usage_count,
                ]);

            $result['hashtags'] = $hashtags->values();
        }

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

        if (!$hashtag) {
            return response()->json([
                'hashtag'     => ['tag' => $cleanTag, 'usage_count' => count($blogs)],
                'posts'       => [],
                'blogs'       => $blogs,
                'total'       => count($blogs),
            ]);
        }

        $posts = $hashtag->posts()
            ->with(['user', 'images'])
            ->withCount(['likes', 'comments'])
            ->latest()
            ->paginate(15);

        $posts->getCollection()->transform(
            fn($post) => $postController->formatPost($post, $user)
        );

        return response()->json([
            'hashtag' => [
                'tag'         => $hashtag->tag,
                'usage_count' => $hashtag->usage_count,
            ],
            'posts' => $posts,
            'blogs' => $blogs,
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
