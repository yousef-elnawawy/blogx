<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mute;
use App\Models\User;
use Illuminate\Http\Request;

class MuteController extends Controller
{
    /**
     * List all users muted by the authenticated user.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $mutedUsers = $user->mutedUsers()->get()->map(function ($mutedUser) {
            $avatarUrl = $mutedUser->avatar;
            if ($avatarUrl && !str_starts_with($avatarUrl, 'http')) {
                $avatarUrl = config('app.url') . $avatarUrl;
            }
            return [
                'id'       => $mutedUser->id,
                'name'     => $mutedUser->name,
                'username' => $mutedUser->username,
                'avatar'   => $avatarUrl,
                'bio'      => $mutedUser->bio,
                'verified' => (bool) $mutedUser->verified,
                'muted_at' => $mutedUser->pivot->created_at ? $mutedUser->pivot->created_at->toIso8601String() : null,
            ];
        });

        return response()->json(['users' => $mutedUsers]);
    }

    /**
     * Mute a user.
     */
    public function mute(Request $request, $id)
    {
        $authUser = $request->user();
        $targetUser = User::find($id);

        if (!$targetUser) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($authUser->id === $targetUser->id) {
            return response()->json(['message' => 'You cannot mute yourself'], 422);
        }

        Mute::firstOrCreate([
            'muter_id' => $authUser->id,
            'muted_id' => $targetUser->id,
        ]);

        return response()->json([
            'message' => 'User muted successfully',
            'is_muted' => true,
        ]);
    }

    /**
     * Unmute a user.
     */
    public function unmute(Request $request, $id)
    {
        $authUser = $request->user();

        Mute::where('muter_id', $authUser->id)
            ->where('muted_id', $id)
            ->delete();

        return response()->json([
            'message' => 'User unmuted successfully',
            'is_muted' => false,
        ]);
    }
}
