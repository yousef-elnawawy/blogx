<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\VerificationRequest;
use App\Services\BadgeService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AdminController extends Controller
{
    /**
     * List all platform users with search, filter, and pagination (Admin only).
     */
    public function indexUsers(Request $request)
    {
        $admin = $request->user();
        if (!$admin->is_admin) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $query = User::query();

        // Search by name, username, email
        if ($search = $request->get('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('username', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Status filter: all | verified | unverified | admins
        $filter = $request->get('filter', 'all');
        if ($filter === 'verified') {
            $query->where('verified', true);
        } elseif ($filter === 'unverified') {
            $query->where('verified', false);
        } elseif ($filter === 'admins') {
            $query->where('is_admin', true);
        }

        $users = $query->withCount(['posts', 'followers', 'following'])
            ->latest('created_at')
            ->paginate(20);

        return response()->json($users);
    }

    /**
     * Toggle or explicitly set verification status for any user (Admin only).
     */
    public function toggleVerification(Request $request, $id)
    {
        $admin = $request->user();
        if (!$admin->is_admin) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        $explicitStatus = $request->has('verified') ? $request->boolean('verified') : !$user->verified;

        if ($explicitStatus) {
            // Granting verification
            $user->update([
                'verified' => true,
            ]);

            // Automatically approve any pending request
            VerificationRequest::where('user_id', $user->id)
                ->where('status', 'pending')
                ->update([
                    'status'      => 'approved',
                    'reviewed_by' => $admin->id,
                    'reviewed_at' => now(),
                    'admin_notes' => 'Directly verified by admin.',
                ]);

            // Dispatch notification to user
            NotificationService::sendVerificationGrantedNotification($user, $admin);

            $message = "Verification granted to @{$user->username}. Notification sent.";
        } else {
            // Revoking verification
            // Strip any verified-only badges
            $strippedBadges = BadgeService::sanitizeEquippedBadges($user->equipped_badges ?? [], false);

            $user->update([
                'verified'        => false,
                'equipped_badges' => $strippedBadges,
            ]);

            $message = "Verification revoked from @{$user->username}. Verified perks and badges stripped.";
        }

        return response()->json([
            'message' => $message,
            'user'    => $user->fresh(),
        ]);
    }

    /**
     * Delete any user account and associated assets (Admin only).
     */
    public function deleteUser(Request $request, $id)
    {
        $admin = $request->user();
        if (!$admin->is_admin) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        if ($user->id === $admin->id) {
            return response()->json(['message' => 'You cannot delete your own admin account.'], 400);
        }

        DB::transaction(function () use ($user) {
            // Delete avatar & cover from storage
            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }
            if ($user->cover && Storage::disk('public')->exists($user->cover)) {
                Storage::disk('public')->delete($user->cover);
            }

            // Delete post images
            foreach ($user->posts as $post) {
                foreach ($post->images as $postImage) {
                    if ($postImage->image_path && Storage::disk('public')->exists($postImage->image_path)) {
                        Storage::disk('public')->delete($postImage->image_path);
                    }
                }
            }

            // Delete verification documents
            $docs = VerificationRequest::where('user_id', $user->id)->pluck('document_path');
            foreach ($docs as $doc) {
                if ($doc && Storage::disk('public')->exists($doc)) {
                    Storage::disk('public')->delete($doc);
                }
            }

            // Clean up associations
            $user->tokens()->delete();
            $user->posts()->delete();
            $user->delete();
        });

        return response()->json([
            'message' => "User @{$user->username} and all associated data have been permanently deleted.",
        ]);
    }
}
