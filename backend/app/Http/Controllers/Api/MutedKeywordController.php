<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MutedKeyword;
use Illuminate\Http\Request;

class MutedKeywordController extends Controller
{
    /**
     * List all muted keywords for the authenticated user.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $keywords = $user->mutedKeywords()
            ->latest()
            ->get()
            ->map(function ($k) {
                return [
                    'id'         => $k->id,
                    'keyword'    => $k->keyword,
                    'mute_type'  => $k->mute_type,
                    'expires_at' => $k->expires_at ? $k->expires_at->toIso8601String() : null,
                    'created_at' => $k->created_at ? $k->created_at->toIso8601String() : null,
                ];
            });

        return response()->json(['keywords' => $keywords]);
    }

    /**
     * Add a new muted keyword or phrase.
     */
    public function store(Request $request)
    {
        $request->validate([
            'keyword'   => 'required|string|max:100',
            'mute_type' => 'nullable|in:all,posts,comments',
            'duration'  => 'nullable|string|in:7_days,30_days,forever',
        ]);

        $user = $request->user();
        $keyword = trim(mb_strtolower($request->keyword));

        $expiresAt = null;
        if ($request->duration === '7_days') {
            $expiresAt = now()->addDays(7);
        } elseif ($request->duration === '30_days') {
            $expiresAt = now()->addDays(30);
        }

        $mutedKeyword = MutedKeyword::updateOrCreate(
            [
                'user_id' => $user->id,
                'keyword' => $keyword,
            ],
            [
                'mute_type'  => $request->mute_type ?? 'all',
                'expires_at' => $expiresAt,
            ]
        );

        return response()->json([
            'message' => 'Keyword muted successfully',
            'keyword' => [
                'id'         => $mutedKeyword->id,
                'keyword'    => $mutedKeyword->keyword,
                'mute_type'  => $mutedKeyword->mute_type,
                'expires_at' => $mutedKeyword->expires_at ? $mutedKeyword->expires_at->toIso8601String() : null,
            ],
        ], 201);
    }

    /**
     * Remove a muted keyword.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        $deleted = MutedKeyword::where('user_id', $user->id)
            ->where('id', $id)
            ->delete();

        if (!$deleted) {
            return response()->json(['message' => 'Keyword not found'], 404);
        }

        return response()->json(['message' => 'Keyword unmuted successfully']);
    }
}
