<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class NotificationController extends Controller
{
    /**
     * Get paginated notifications list for authenticated user.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $filter = $request->query('filter', 'all');
        $blockedIds = $user->allBlockedUserIds();

        $query = Notification::where('user_id', $user->id)
            ->with(['actor' => function ($q) {
                $q->select('id', 'name', 'username', 'avatar', 'verified');
            }])
            ->filterCategory($filter);

        if (!empty($blockedIds)) {
            $query->whereNotIn('actor_id', $blockedIds);
        }

        $notifications = $query->latest()->paginate(20);

        $unreadCountQuery = Notification::where('user_id', $user->id)->unread();
        if (!empty($blockedIds)) {
            $unreadCountQuery->whereNotIn('actor_id', $blockedIds);
        }
        $unreadCount = $unreadCountQuery->count();

        $notifications->getCollection()->transform(function ($notification) {
            return $notification->format();
        });

        return response()->json([
            'notifications' => $notifications,
            'unread_count'  => $unreadCount,
        ]);
    }

    /**
     * Get unread notifications count.
     */
    public function unreadCount(Request $request)
    {
        $user = $request->user();

        $count = Notification::where('user_id', $user->id)
            ->unread()
            ->count();

        return response()->json([
            'unread_count' => $count,
        ]);
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(Request $request, $id)
    {
        $user = $request->user();
        $notification = Notification::where('user_id', $user->id)->find($id);

        if (!$notification) {
            return response()->json(['message' => 'Notification not found'], 404);
        }

        $notification->markAsRead();

        $unreadCount = Notification::where('user_id', $user->id)
            ->unread()
            ->count();

        return response()->json([
            'message'      => 'Notification marked as read',
            'notification' => $notification->format(),
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Mark all user's notifications as read.
     */
    public function markAllAsRead(Request $request)
    {
        $user = $request->user();

        Notification::where('user_id', $user->id)
            ->unread()
            ->update(['read_at' => now()]);

        return response()->json([
            'message'      => 'All notifications marked as read',
            'unread_count' => 0,
        ]);
    }

    /**
     * Delete a single notification.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $notification = Notification::where('user_id', $user->id)->find($id);

        if (!$notification) {
            return response()->json(['message' => 'Notification not found'], 404);
        }

        $notification->delete();

        $unreadCount = Notification::where('user_id', $user->id)
            ->unread()
            ->count();

        return response()->json([
            'message'      => 'Notification deleted successfully',
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Clear all notifications for user.
     */
    public function clearAll(Request $request)
    {
        $user = $request->user();

        Notification::where('user_id', $user->id)->delete();

        return response()->json([
            'message'      => 'All notifications cleared',
            'unread_count' => 0,
        ]);
    }

    /**
     * Ultra-fast non-blocking poll endpoint.
     * Responds in ~1-2ms with unread count and any new notifications after after_id.
     */
    public function poll(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['unread_count' => 0, 'recent' => []]);
        }

        $lastId = (int) $request->query('after_id', 0);
        $blockedIds = $user->allBlockedUserIds();

        $unreadCountQuery = Notification::where('user_id', $user->id)->unread();
        if (!empty($blockedIds)) {
            $unreadCountQuery->whereNotIn('actor_id', $blockedIds);
        }
        $unreadCount = $unreadCountQuery->count();

        $recent = [];
        if ($lastId > 0) {
            $recentQuery = Notification::where('user_id', $user->id)
                ->where('id', '>', $lastId);

            if (!empty($blockedIds)) {
                $recentQuery->whereNotIn('actor_id', $blockedIds);
            }

            $recent = $recentQuery
                ->with(['actor' => function ($q) {
                    $q->select('id', 'name', 'username', 'avatar', 'verified');
                }])
                ->latest()
                ->take(5)
                ->get()
                ->map(fn($n) => $n->format());
        }

        return response()->json([
            'unread_count' => $unreadCount,
            'recent'       => $recent,
        ]);
    }

    /**
     * Get user notification preferences.
     */
    public function getPreferences(Request $request)
    {
        $user = $request->user();

        $defaults = [
            'likes'      => true,
            'comments'   => true,
            'follows'    => true,
            'mentions'   => true,
            'shares'     => true,
            'milestones' => true,
        ];

        $preferences = array_merge($defaults, $user->notification_preferences ?? []);

        return response()->json([
            'preferences' => $preferences,
        ]);
    }

    /**
     * Update user notification preferences.
     */
    public function updatePreferences(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'likes'      => 'nullable|boolean',
            'comments'   => 'nullable|boolean',
            'follows'    => 'nullable|boolean',
            'mentions'   => 'nullable|boolean',
            'shares'     => 'nullable|boolean',
            'milestones' => 'nullable|boolean',
        ]);

        $defaults = [
            'likes'      => true,
            'comments'   => true,
            'follows'    => true,
            'mentions'   => true,
            'shares'     => true,
            'milestones' => true,
        ];

        $current = array_merge($defaults, $user->notification_preferences ?? []);
        $updated = array_merge($current, array_filter($validated, fn($v) => !is_null($v)));

        $user->forceFill([
            'notification_preferences' => $updated,
        ])->save();

        return response()->json([
            'message'     => 'Notification preferences updated successfully',
            'preferences' => $updated,
        ]);
    }
}
