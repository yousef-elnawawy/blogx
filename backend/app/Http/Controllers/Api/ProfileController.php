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
        $cleanUsername = ltrim(strtolower(urldecode($username)), '@');
        $user = User::where('username', $cleanUsername)->firstOrFail();

        $posts = Post::where('user_id', $user->id)
            ->with(['user', 'images'])
            ->withCount(['likes', 'comments'])
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

        $userData = [
            'id'              => $user->id,
            'name'            => $user->name,
            'username'        => $user->username,
            'avatar'          => $avatarUrl,
            'bio'             => $user->bio,
            'location'        => $user->location,
            'website'         => $user->website,
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

        $query = User::query();

        if ($authUser) {
            $followingIds = $authUser->following()->pluck('users.id')->push($authUser->id);
            $query->whereNotIn('id', $followingIds);
        }

        $users = $query->inRandomOrder()->take(5)->get()->map(function ($user) use ($authUser) {
            $avatarUrl = $user->avatar;
            if ($avatarUrl && !str_starts_with($avatarUrl, 'http')) {
                $avatarUrl = config('app.url') . $avatarUrl;
            }
            return [
                'id'           => $user->id,
                'name'         => $user->name,
                'username'     => $user->username,
                'avatar'       => $avatarUrl,
                'bio'          => $user->bio,
                'verified'     => (bool) $user->verified,
                'is_following' => $authUser ? $authUser->isFollowing($user) : false,
            ];
        });

        return response()->json(['users' => $users]);
    }
}
