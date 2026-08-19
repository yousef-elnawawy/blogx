<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    /**
     * Return public profile data for any user by username along with their posts.
     */
    public function show(Request $request, string $username)
    {
        $authUser = $request->user() ?? auth('sanctum')->user();
        $cleanUsername = trim(ltrim(urldecode($username), '@'));

        $user = User::where('username', $cleanUsername)
            ->orWhereRaw('LOWER(username) = ?', [strtolower($cleanUsername)])
            ->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $query = Post::where('user_id', $user->id)->published();

        // If viewing someone else's profile, only show public posts or joined community posts
        if (!$authUser || $authUser->id !== $user->id) {
            if ($authUser) {
                $joinedCommunityIds = \App\Models\CommunityMember::where('user_id', $authUser->id)
                    ->where('status', 'approved')
                    ->pluck('community_id');

                $publicCommunityIds = \App\Models\Community::where('type', 'public')->pluck('id');
                $allowedCommunityIds = $joinedCommunityIds->merge($publicCommunityIds)->unique();

                $query->where(function ($q) use ($allowedCommunityIds) {
                    $q->whereNull('community_id')
                      ->orWhereIn('community_id', $allowedCommunityIds);
                });
            } else {
                $publicCommunityIds = \App\Models\Community::where('type', 'public')->pluck('id');
                $query->where(function ($q) use ($publicCommunityIds) {
                    $q->whereNull('community_id')
                      ->orWhereIn('community_id', $publicCommunityIds);
                });
            }
        }

        $posts = $query->with(['user', 'images', 'mentions.user', 'repostOf.user', 'repostOf.images', 'quoteOf.user', 'quoteOf.images', 'community'])
            ->withCount(['likes', 'comments'])
            ->orderBy('is_pinned', 'desc')
            ->latest()
            ->paginate(15);

        $postController = new PostController();
        $posts->getCollection()->transform(function ($post) use ($authUser, $postController) {
            return $postController->formatPost($post, $authUser);
        });

        $avatarUrl = $user->avatar;
        if ($avatarUrl && !str_starts_with($avatarUrl, 'http')) {
            $avatarUrl = config('app.url') . $avatarUrl;
        }

        $coverUrl = $user->cover;
        if ($coverUrl && !str_starts_with($coverUrl, 'http')) {
            $coverUrl = config('app.url') . $coverUrl;
        }

        $userData = [
            'id'              => $user->id,
            'name'            => $user->name,
            'username'        => $user->username,
            'avatar'          => $avatarUrl,
            'cover'           => $coverUrl,
            'bio'             => $user->bio,
            'location'        => $user->location,
            'website'         => $user->website,
            'social_links'    => $user->social_links ?? [],
            'equipped_badges' => $user->equipped_badges ?? [],
            'verified'        => $user->verified,
            'created_at'      => $user->created_at ? $user->created_at->toIso8601String() : null,
            'posts_count'     => Post::where('user_id', $user->id)->count(),
            'followers_count' => $user->followers()->count(),
            'following_count' => $user->following()->count(),
            'is_following'    => $authUser ? $authUser->isFollowing($user) : false,
        ];

        return response()->json([
            'user'  => $userData,
            'posts' => $posts,
        ]);
    }

    /**
     * Get list of users that follow this user.
     */
    public function followersList(Request $request, string $username)
    {
        $authUser = $request->user() ?? auth('sanctum')->user();
        $cleanUsername = ltrim(strtolower(urldecode($username)), '@');
        $user = User::where('username', $cleanUsername)->firstOrFail();

        $followers = $user->followers()->get()->map(function ($fUser) use ($authUser) {
            $avatarUrl = $fUser->avatar;
            if ($avatarUrl && !str_starts_with($avatarUrl, 'http')) {
                $avatarUrl = config('app.url') . $avatarUrl;
            }
            return [
                'id'           => $fUser->id,
                'name'         => $fUser->name,
                'username'     => $fUser->username,
                'avatar'       => $avatarUrl,
                'bio'          => $fUser->bio,
                'verified'     => (bool) $fUser->verified,
                'is_following' => $authUser ? $authUser->isFollowing($fUser) : false,
            ];
        });

        return response()->json(['users' => $followers]);
    }

    /**
     * Get list of users that this user is following.
     */
    public function followingList(Request $request, string $username)
    {
        $authUser = $request->user() ?? auth('sanctum')->user();
        $cleanUsername = ltrim(strtolower(urldecode($username)), '@');
        $user = User::where('username', $cleanUsername)->firstOrFail();

        $following = $user->following()->get()->map(function ($fUser) use ($authUser) {
            $avatarUrl = $fUser->avatar;
            if ($avatarUrl && !str_starts_with($avatarUrl, 'http')) {
                $avatarUrl = config('app.url') . $avatarUrl;
            }
            return [
                'id'           => $fUser->id,
                'name'         => $fUser->name,
                'username'     => $fUser->username,
                'avatar'       => $avatarUrl,
                'bio'          => $fUser->bio,
                'verified'     => (bool) $fUser->verified,
                'is_following' => $authUser ? $authUser->isFollowing($fUser) : false,
            ];
        });

        return response()->json(['users' => $following]);
    }

    /**
     * Get list of users that the authenticated user is following.
     */
    public function myFollowingList(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['users' => []]);
        }

        $following = $user->following()->get()->map(function ($fUser) {
            $avatarUrl = $fUser->avatar;
            if ($avatarUrl && !str_starts_with($avatarUrl, 'http')) {
                $avatarUrl = config('app.url') . $avatarUrl;
            }
            return [
                'id'           => $fUser->id,
                'name'         => $fUser->name,
                'username'     => $fUser->username,
                'avatar'       => $avatarUrl,
                'bio'          => $fUser->bio,
                'verified'     => (bool) $fUser->verified,
                'is_following' => true,
            ];
        });

        return response()->json(['users' => $following]);
    }

    /**
     * Toggle follow/unfollow on a target user.
     */
    public function toggleFollow(Request $request, $id)
    {
        $authUser = $request->user();
        $targetUser = User::find($id);

        if (!$targetUser) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($authUser->id === $targetUser->id) {
            return response()->json(['message' => 'You cannot follow yourself'], 400);
        }

        $isFollowing = $authUser->isFollowing($targetUser);

        if ($isFollowing) {
            $authUser->unfollow($targetUser);
            $isFollowing = false;
        } else {
            $authUser->follow($targetUser);
            $isFollowing = true;
            NotificationService::sendFollowNotification($authUser, $targetUser);
        }

        return response()->json([
            'message'         => $isFollowing ? 'User followed' : 'User unfollowed',
            'is_following'    => $isFollowing,
            'followers_count' => $targetUser->followers()->count(),
        ]);
    }

    /**
     * Get suggested users to follow.
     */
    public function suggestions(Request $request)
    {
        $authUser = $request->user() ?? auth('sanctum')->user();
        $limit = min((int) $request->get('limit', 6), 20);

        $query = User::query();

        if ($authUser) {
            $followingIds = $authUser->following()->pluck('users.id')->push($authUser->id);
            $query->whereNotIn('id', $followingIds);
        }

        $users = $query->inRandomOrder()->take($limit)->get()->map(function ($user) use ($authUser) {
            $avatarUrl = $user->avatar;
            if ($avatarUrl && !str_starts_with($avatarUrl, 'http')) {
                $avatarUrl = config('app.url') . $avatarUrl;
            }
            $coverUrl = $user->cover;
            if ($coverUrl && !str_starts_with($coverUrl, 'http')) {
                $coverUrl = config('app.url') . $coverUrl;
            }
            return [
                'id'              => $user->id,
                'name'            => $user->name,
                'username'        => $user->username,
                'avatar'          => $avatarUrl,
                'cover'           => $coverUrl,
                'bio'             => $user->bio,
                'location'        => $user->location,
                'website'         => $user->website,
                'verified'        => (bool) $user->verified,
                'followers_count' => $user->followers()->count(),
                'following_count' => $user->following()->count(),
                'posts_count'     => Post::where('user_id', $user->id)->published()->count(),
                'is_following'    => $authUser ? $authUser->isFollowing($user) : false,
            ];
        });

        return response()->json(['users' => $users]);
    }

    /**
     * Get all media uploaded by this user (post images, article covers).
     */
    public function media(Request $request, string $username)
    {
        $cleanUsername = ltrim(strtolower(urldecode($username)), '@');
        $user = User::where('username', $cleanUsername)->firstOrFail();

        // 1. Post images
        $postImages = \App\Models\PostImage::whereHas('post', function ($q) use ($user) {
            $q->where('user_id', $user->id)->published();
        })->with('post')->latest()->get()->map(function ($img) {
            $url = $img->image_path;
            if ($url && !str_starts_with($url, 'http')) {
                $url = config('app.url') . '/storage/' . ltrim($url, '/');
            }
            return [
                'id'         => 'post_img_' . $img->id,
                'type'       => 'post_image',
                'url'        => $url,
                'post_id'    => $img->post_id,
                'title'      => $img->post ? \Illuminate\Support\Str::limit($img->post->content, 60) : '',
                'created_at' => $img->created_at ? $img->created_at->toIso8601String() : null,
            ];
        });

        // 2. Blog covers
        $blogCovers = \App\Models\Blog::where('user_id', $user->id)
            ->published()
            ->whereNotNull('cover_image')
            ->where('cover_image', '!=', '')
            ->latest('published_at')
            ->get()
            ->map(function ($blog) {
                $url = $blog->cover_image;
                if ($url && !str_starts_with($url, 'http')) {
                    $url = config('app.url') . '/storage/' . ltrim($url, '/');
                }
                return [
                    'id'           => 'blog_cover_' . $blog->id,
                    'type'         => 'blog_cover',
                    'url'          => $url,
                    'blog_id'      => $blog->id,
                    'blog_slug'    => $blog->slug,
                    'article_slug' => $blog->slug, // backward compatibility
                    'title'        => $blog->title,
                    'created_at'   => $blog->published_at ? $blog->published_at->toIso8601String() : null,
                ];
            });

        $allMedia = $postImages->concat($blogCovers)->sortByDesc('created_at')->values();

        return response()->json(['media' => $allMedia]);
    }

    /**
     * Get posts and blogs liked by this user.
     */
    public function likes(Request $request, string $username)
    {
        $authUser = $request->user() ?? auth('sanctum')->user();
        $cleanUsername = ltrim(strtolower(urldecode($username)), '@');
        $user = User::where('username', $cleanUsername)->firstOrFail();

        // 1. Liked posts
        $postController = new PostController();
        $likedPosts = Post::whereHas('likes', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })
        ->published()
        ->with(['user', 'images', 'mentions.user'])
        ->withCount(['likes', 'comments'])
        ->latest()
        ->get()
        ->map(function ($post) use ($authUser, $postController) {
            $formatted = $postController->formatPost($post, $authUser);
            $formatted['item_type'] = 'post';
            return $formatted;
        });

        // 2. Liked blogs
        $blogController = new BlogController();
        $likedBlogs = \App\Models\Blog::whereHas('likes', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })
        ->published()
        ->with('user')
        ->withCount('likes')
        ->latest('published_at')
        ->get()
        ->map(function ($blog) use ($authUser, $blogController) {
            $formatted = $blogController->formatBlog($blog, $authUser);
            $formatted['item_type'] = 'blog';
            return $formatted;
        });

        return response()->json([
            'posts'    => $likedPosts,
            'blogs'    => $likedBlogs,
            'articles' => $likedBlogs,
        ]);
    }
}
