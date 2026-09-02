<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Block;
use App\Models\User;
use Illuminate\Http\Request;

class BlockController extends Controller
{
    /**
     * List all users blocked by the authenticated user.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $blockedUsers = $user->blockedUsers()->get()->map(function ($blockedUser) {
            $avatarUrl = $blockedUser->avatar;
            if ($avatarUrl && !str_starts_with($avatarUrl, 'http')) {
                $avatarUrl = config('app.url') . $avatarUrl;
            }
            return [
                'id'         => $blockedUser->id,
                'name'       => $blockedUser->name,
                'username'   => $blockedUser->username,
                'avatar'     => $avatarUrl,
                'bio'        => $blockedUser->bio,
                'verified'   => (bool) $blockedUser->verified,
                'blocked_at' => $blockedUser->pivot->created_at ? $blockedUser->pivot->created_at->toIso8601String() : null,
            ];
        });

        return response()->json(['users' => $blockedUsers]);
    }

    /**
     * Block a user.
     */
    public function block(Request $request, $id)
    {
        $authUser = $request->user();
        $targetUser = User::find($id);

        if (!$targetUser) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($authUser->id === $targetUser->id) {
            return response()->json(['message' => 'You cannot block yourself'], 422);
        }

        // Create block
        Block::firstOrCreate([
            'blocker_id' => $authUser->id,
            'blocked_id' => $targetUser->id,
        ]);

        // Break mutual following relationships
        $authUser->unfollow($targetUser);
        $targetUser->unfollow($authUser);

        // Clean up any mutual notifications
        \App\Models\Notification::where(function ($q) use ($authUser, $targetUser) {
            $q->where('user_id', $authUser->id)->where('actor_id', $targetUser->id);
        })->orWhere(function ($q) use ($authUser, $targetUser) {
            $q->where('user_id', $targetUser->id)->where('actor_id', $authUser->id);
        })->delete();

        return response()->json([
            'message' => 'User blocked successfully',
            'is_blocked' => true,
        ]);
    }

    /**
     * Unblock a user.
     */
    public function unblock(Request $request, $id)
    {
        $authUser = $request->user();

        Block::where('blocker_id', $authUser->id)
            ->where('blocked_id', $id)
            ->delete();

        return response()->json([
            'message' => 'User unblocked successfully',
            'is_blocked' => false,
        ]);
    }
}
