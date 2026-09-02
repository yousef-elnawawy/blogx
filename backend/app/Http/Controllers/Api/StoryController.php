<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Story;
use App\Models\StoryView;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StoryController extends Controller
{
    /**
     * Get active stories feed grouped by user.
     */
    public function feed(Request $request)
    {
        $authUser = $request->user() ?? auth('sanctum')->user();

        // Get blocked user IDs to filter out completely
        $blockedUserIds = [];
        if ($authUser) {
            $blockedUserIds = $authUser->blockedUsers()->pluck('users.id')
                ->merge($authUser->blockedByUsers()->pluck('users.id'))
                ->unique()
                ->toArray();
        }

        // Active stories query
        $query = Story::active()
            ->with(['user', 'views'])
            ->whereNotIn('user_id', $blockedUserIds)
            ->latest();

        $allStories = $query->get();

        // Group by user
        $groupedByUser = $allStories->groupBy('user_id');

        $result = [];

        // If auth user has stories, put them first
        if ($authUser && $groupedByUser->has($authUser->id)) {
            $myStories = $groupedByUser->get($authUser->id);
            $result[] = $this->formatUserStoriesGroup($authUser, $myStories, $authUser);
            $groupedByUser->forget($authUser->id);
        }

        // Following users next
        $followingIds = $authUser ? $authUser->following()->pluck('users.id')->toArray() : [];

        $followingGroups = [];
        $otherGroups = [];

        foreach ($groupedByUser as $userId => $stories) {
            $storyUser = $stories->first()->user;
            if (!$storyUser) continue;

            $group = $this->formatUserStoriesGroup($storyUser, $stories, $authUser);

            if (in_array($userId, $followingIds)) {
                $followingGroups[] = $group;
            } else {
                $otherGroups[] = $group;
            }
        }

        // Sort within groups: unviewed stories first
        usort($followingGroups, function ($a, $b) {
            if ($a['has_unseen'] === $b['has_unseen']) return 0;
            return $a['has_unseen'] ? -1 : 1;
        });

        usort($otherGroups, function ($a, $b) {
            if ($a['has_unseen'] === $b['has_unseen']) return 0;
            return $a['has_unseen'] ? -1 : 1;
        });

        $finalFeed = array_merge($result, $followingGroups, $otherGroups);

        return response()->json([
            'stories' => $finalFeed,
            'has_my_story' => $authUser ? Story::where('user_id', $authUser->id)->active()->exists() : false,
        ]);
    }

    /**
     * Create a new story.
     */
    public function store(Request $request)
    {
        $request->validate([
            'type'             => 'required|in:text,image,video',
            'media'            => 'nullable|file|mimes:jpeg,png,jpg,gif,webp,mp4,mov,webm|max:51200',
            'caption'          => 'nullable|string|max:1000',
            'background_style' => 'nullable',
            'overlay_data'     => 'nullable',
        ]);

        $user = $request->user();
        $mediaUrl = null;

        if ($request->hasFile('media')) {
            $path = $request->file('media')->store('stories', 'public');
            $mediaUrl = Storage::url($path);
        }

        $backgroundStyle = is_string($request->background_style)
            ? json_decode($request->background_style, true)
            : $request->background_style;

        $overlayData = is_string($request->overlay_data)
            ? json_decode($request->overlay_data, true)
            : $request->overlay_data;

        $story = Story::create([
            'user_id'          => $user->id,
            'type'             => $request->type,
            'media_url'        => $mediaUrl,
            'caption'          => $request->caption,
            'background_style' => $backgroundStyle,
            'overlay_data'     => $overlayData,
            'expires_at'       => now()->addHours(24),
        ]);

        return response()->json([
            'message' => 'Story published successfully',
            'story'   => $this->formatSingleStory($story, $user),
        ], 201);
    }

    /**
     * Mark a story as viewed.
     */
    public function markAsViewed(Request $request, $id)
    {
        $user = $request->user();
        $story = Story::find($id);

        if (!$story) {
            return response()->json(['message' => 'Story not found'], 404);
        }

        if ($user->id !== $story->user_id) {
            StoryView::firstOrCreate([
                'story_id' => $story->id,
                'user_id'  => $user->id,
            ]);
        }

        return response()->json([
            'message' => 'Story marked as viewed',
            'views_count' => $story->views()->count(),
        ]);
    }

    /**
     * Get list of viewers for a story (Owner only).
     */
    public function viewers(Request $request, $id)
    {
        $user = $request->user();
        $story = Story::where('id', $id)->where('user_id', $user->id)->firstOrFail();
        $blockedIds = $user->allBlockedUserIds();

        $query = $story->views()->with('user');
        if (!empty($blockedIds)) {
            $query->whereNotIn('user_id', $blockedIds);
        }

        $viewers = $query->latest()->get()->map(function ($view) {
            $viewer = $view->user;
            $avatarUrl = $viewer->avatar;
            if ($avatarUrl && !str_starts_with($avatarUrl, 'http')) {
                $avatarUrl = config('app.url') . $avatarUrl;
            }
            return [
                'id'         => $viewer->id,
                'name'       => $viewer->name,
                'username'   => $viewer->username,
                'avatar'     => $avatarUrl,
                'verified'   => (bool) $viewer->verified,
                'viewed_at'  => $view->created_at ? $view->created_at->toIso8601String() : null,
            ];
        });

        return response()->json([
            'views_count' => $viewers->count(),
            'viewers'     => $viewers,
        ]);
    }

    /**
     * Delete a story (Owner only).
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $story = Story::where('id', $id)->where('user_id', $user->id)->first();

        if (!$story) {
            return response()->json(['message' => 'Story not found or unauthorized'], 404);
        }

        if ($story->media_url) {
            $filePath = str_replace('/storage/', '', $story->media_url);
            Storage::disk('public')->delete($filePath);
        }

        $story->delete();

        return response()->json(['message' => 'Story deleted successfully']);
    }

    /**
     * Helper to format a user's grouped stories.
     */
    private function formatUserStoriesGroup($user, $stories, $authUser)
    {
        $avatarUrl = $user->avatar;
        if ($avatarUrl && !str_starts_with($avatarUrl, 'http')) {
            $avatarUrl = config('app.url') . $avatarUrl;
        }

        // Chronological order: oldest active story first, newest last
        $sortedStories = $stories->sortBy('created_at')->values();

        $formattedStories = $sortedStories->map(function ($story) use ($authUser) {
            return $this->formatSingleStory($story, $authUser);
        })->values();

        $hasUnseen = false;
        if ($authUser && $authUser->id !== $user->id) {
            $hasUnseen = $formattedStories->contains('is_viewed', false);
        }

        return [
            'user' => [
                'id'       => $user->id,
                'name'     => $user->name,
                'username' => $user->username,
                'avatar'   => $avatarUrl,
                'verified' => (bool) $user->verified,
            ],
            'has_unseen' => $hasUnseen,
            'stories'    => $formattedStories,
        ];
    }

    /**
     * Helper to format a single story item.
     */
    private function formatSingleStory($story, $authUser)
    {
        $mediaUrl = $story->media_url;
        if ($mediaUrl && !str_starts_with($mediaUrl, 'http')) {
            $mediaUrl = config('app.url') . $mediaUrl;
        }

        $isViewed = false;
        if ($authUser) {
            $isViewed = $authUser->id === $story->user_id || $story->views->contains('user_id', $authUser->id);
        }

        return [
            'id'               => $story->id,
            'user_id'          => $story->user_id,
            'type'             => $story->type,
            'media_url'        => $mediaUrl,
            'caption'          => $story->caption,
            'background_style' => $story->background_style,
            'overlay_data'     => $story->overlay_data,
            'created_at'       => $story->created_at ? $story->created_at->toIso8601String() : null,
            'expires_at'       => $story->expires_at ? $story->expires_at->toIso8601String() : null,
            'views_count'      => $story->views ? $story->views->count() : 0,
            'is_viewed'        => $isViewed,
            'is_mine'          => $authUser ? $authUser->id === $story->user_id : false,
        ];
    }
}
