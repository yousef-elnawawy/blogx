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

        $query = Notification::where('user_id', $user->id)
            ->with(['actor' => function ($q) {
                $q->select('id', 'name', 'username', 'avatar', 'verified');
            }])
            ->filterCategory($filter)
            ->latest();

        $notifications = $query->paginate(20);

        $unreadCount = Notification::where('user_id', $user->id)
            ->unread()
            ->count();

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

        $unreadCount = Notification::where('user_id', $user->id)
            ->unread()
            ->count();

        $recent = [];
        if ($lastId > 0) {
            $recent = Notification::where('user_id', $user->id)
                ->where('id', '>', $lastId)
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
     * Lightweight stream endpoint (non-blocking).
     */
    public function stream(Request $request): StreamedResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();

        if (!$user && $request->has('api_token')) {
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($request->query('api_token'));
            if ($accessToken) {
                $user = $accessToken->tokenable;
            }
        }

        if (!$user) {
            abort(401, 'Unauthorized');
        }

        $response = new StreamedResponse(function () use ($user) {
            if (ob_get_level() > 0) {
                ob_end_clean();
            }

            $unreadCount = Notification::where('user_id', $user->id)->unread()->count();
            echo "event: init\n";
            echo "data: " . json_encode(['unread_count' => $unreadCount]) . "\n\n";
            flush();
        });

        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache, no-store, must-revalidate');
        $response->headers->set('Connection', 'close');
        $response->headers->set('X-Accel-Buffering', 'no');

        return $response;
    }
}
