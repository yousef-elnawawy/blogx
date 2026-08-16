<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BadgeService;
use Illuminate\Http\Request;

class BadgeController extends Controller
{
    /**
     * Get list of all platform badges with user lock/equipped status.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $isVerified = (bool) ($user?->verified);
        $userEquipped = $user?->equipped_badges ?? [];

        $badges = collect(BadgeService::getAvailableBadges())->map(function ($badge) use ($isVerified, $userEquipped) {
            $isLocked = $badge['requires_verified'] && !$isVerified;
            $isEquipped = in_array($badge['id'], $userEquipped, true);

            return array_merge($badge, [
                'is_locked'   => $isLocked,
                'is_equipped' => $isEquipped,
            ]);
        });

        return response()->json([
            'badges'          => $badges,
            'is_verified'     => $isVerified,
            'equipped_badges' => $userEquipped,
        ]);
    }

    /**
     * Update equipped badges for authenticated user.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'badges'   => ['present', 'array', 'max:5'],
            'badges.*' => ['string', 'max:50'],
        ]);

        $sanitized = BadgeService::sanitizeEquippedBadges($validated['badges'], (bool) $user->verified);

        $user->update([
            'equipped_badges' => $sanitized,
        ]);

        return response()->json([
            'message'         => 'Badges updated successfully.',
            'equipped_badges' => $sanitized,
        ]);
    }
}
