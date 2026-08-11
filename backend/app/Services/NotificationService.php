<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Post;
use App\Models\User;

class NotificationService
{
    // ─── Milestone thresholds ────────────────────────────────────────────────

    private static array $postMilestones      = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
    private static array $viewMilestones      = [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000];
    private static array $followerMilestones  = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000, 10000];
    private static array $likesMilestones     = [1, 5, 10, 25, 50, 100, 250, 500, 1000];

    // ─── Dedup window (seconds) ─────────────────────────────────────────────

    private static int $dedupWindow = 86400; // 24 hours

    // ─── Guard: prevent duplicate notifications ──────────────────────────────

    private static function isDuplicate(
        int    $userId,
        string $type,
        ?int   $actorId = null,
        array  $dataMatch = []
    ): bool {
        $query = Notification::where('user_id', $userId)
            ->where('type', $type)
            ->where('created_at', '>=', now()->subSeconds(self::$dedupWindow));

        if ($actorId !== null) {
            $query->where('actor_id', $actorId);
        }

        // Extra JSON field matching (e.g. same post_id)
        foreach ($dataMatch as $key => $value) {
            $query->whereJsonContains('data->' . $key, $value);
        }

        return $query->exists();
    }

    // ─── Public API ──────────────────────────────────────────────────────────

    /**
     * Someone followed the target user.
     */
    public static function sendFollowNotification(User $actor, User $target): void
    {
        if ($actor->id === $target->id) return;

        if (self::isDuplicate($target->id, 'follow', $actor->id)) return;

        Notification::create([
            'user_id'  => $target->id,
            'actor_id' => $actor->id,
            'type'     => 'follow',
            'title'    => 'New Follower',
            'message'  => "{$actor->name} started following you.",
            'data'     => [
                'follower_id'       => $actor->id,
                'follower_name'     => $actor->name,
                'follower_username' => $actor->username,
            ],
        ]);

        // Milestone: check if target just hit a followers milestone
        $followersCount = $target->followers()->count();
        if (in_array($followersCount, self::$followerMilestones, true)) {
            self::sendFollowersMilestone($target, $followersCount);
        }
    }

    /**
     * Someone liked a post.
     */
    public static function sendLikePostNotification(User $actor, Post $post): void
    {
        if ($actor->id === $post->user_id) return;

        if (self::isDuplicate($post->user_id, 'like_post', $actor->id, ['post_id' => $post->id])) return;

        $snippet = self::truncate($post->content, 80);

        Notification::create([
            'user_id'  => $post->user_id,
            'actor_id' => $actor->id,
            'type'     => 'like_post',
            'title'    => 'Post Liked',
            'message'  => "{$actor->name} liked your post.",
            'data'     => [
                'post_id'      => $post->id,
                'post_content' => $snippet,
            ],
        ]);
    }

    /**
     * Someone liked a comment.
     */
    public static function sendLikeCommentNotification(User $actor, $comment, Post $post): void
    {
        if ($actor->id === $comment->user_id) return;

        if (self::isDuplicate($comment->user_id, 'like_comment', $actor->id, ['comment_id' => $comment->id])) return;

        $snippet = self::truncate($comment->content, 80);

        Notification::create([
            'user_id'  => $comment->user_id,
            'actor_id' => $actor->id,
            'type'     => 'like_comment',
            'title'    => 'Comment Liked',
            'message'  => "{$actor->name} liked your comment.",
            'data'     => [
                'post_id'        => $post->id,
                'comment_id'     => $comment->id,
                'post_content'   => self::truncate($post->content, 60),
                'comment_content'=> $snippet,
            ],
        ]);
    }

    /**
     * Someone commented on a post (or replied to a comment).
     */
    public static function sendCommentNotification(User $actor, $comment, Post $post): void
    {
        $targetId = $comment->parent_id
            ? optional($comment->parent)->user_id   // reply → notify parent comment author
            : $post->user_id;                        // top-level → notify post author

        if (!$targetId || $actor->id === $targetId) return;

        $type    = $comment->parent_id ? 'comment_reply' : 'comment';
        $title   = $comment->parent_id ? 'New Reply'     : 'New Comment';
        $message = $comment->parent_id
            ? "{$actor->name} replied to your comment."
            : "{$actor->name} commented on your post.";

        if (self::isDuplicate($targetId, $type, $actor->id, ['post_id' => $post->id])) return;

        Notification::create([
            'user_id'  => $targetId,
            'actor_id' => $actor->id,
            'type'     => $type,
            'title'    => $title,
            'message'  => $message,
            'data'     => [
                'post_id'         => $post->id,
                'comment_id'      => $comment->id,
                'post_content'    => self::truncate($post->content, 60),
                'comment_content' => self::truncate($comment->content, 80),
            ],
        ]);
    }

    /**
     * Someone mentioned a user in a post or comment.
     */
    public static function sendMentionNotification(User $actor, User $mentioned, Post $post): void
    {
        if ($actor->id === $mentioned->id) return;
        if ($mentioned->id === $post->user_id) return; // already gets comment notif

        if (self::isDuplicate($mentioned->id, 'mention', $actor->id, ['post_id' => $post->id])) return;

        Notification::create([
            'user_id'  => $mentioned->id,
            'actor_id' => $actor->id,
            'type'     => 'mention',
            'title'    => 'You were mentioned',
            'message'  => "{$actor->name} mentioned you in a post.",
            'data'     => [
                'post_id'      => $post->id,
                'post_content' => self::truncate($post->content, 80),
            ],
        ]);
    }

    /**
     * Someone shared a post.
     */
    public static function sendShareNotification(?User $actor, Post $post, string $platform = 'link'): void
    {
        $actorId   = $actor?->id;
        $actorName = $actor?->name ?? 'Someone';

        if ($actorId && $actorId === $post->user_id) return;

        Notification::create([
            'user_id'  => $post->user_id,
            'actor_id' => $actorId,
            'type'     => 'share_post',
            'title'    => 'Post Shared',
            'message'  => "{$actorName} shared your post via {$platform}.",
            'data'     => [
                'post_id'      => $post->id,
                'post_content' => self::truncate($post->content, 60),
                'platform'     => $platform,
            ],
        ]);
    }

    // ─── Milestone helpers ────────────────────────────────────────────────────

    /**
     * Check if publishing this post hit a milestone for the user.
     */
    public static function checkPostCountMilestone(User $user): void
    {
        $count = Post::where('user_id', $user->id)->count();

        if (!in_array($count, self::$postMilestones, true)) return;

        // Only fire once per exact count
        $alreadySent = Notification::where('user_id', $user->id)
            ->where('type', 'milestone_post')
            ->whereJsonContains('data->post_count', $count)
            ->exists();

        if ($alreadySent) return;

        Notification::create([
            'user_id'  => $user->id,
            'actor_id' => null,
            'type'     => 'milestone_post',
            'title'    => "🎉 {$count} Post" . ($count === 1 ? '' : 's') . " Published!",
            'message'  => "Congratulations! You've published {$count} " . ($count === 1 ? 'post' : 'posts') . " on BlogX. Keep creating!",
            'data'     => [
                'milestone_type'  => 'posts',
                'milestone_count' => $count,
                'post_count'      => $count,
            ],
        ]);
    }

    /**
     * Check if a post just hit a view milestone.
     */
    public static function checkViewMilestone(Post $post, int $views): void
    {
        if (!in_array($views, self::$viewMilestones, true)) return;

        $alreadySent = Notification::where('user_id', $post->user_id)
            ->where('type', 'view_milestone')
            ->whereJsonContains('data->post_id', $post->id)
            ->whereJsonContains('data->milestone_count', $views)
            ->exists();

        if ($alreadySent) return;

        $formatted = self::formatNumber($views);

        Notification::create([
            'user_id'  => $post->user_id,
            'actor_id' => null,
            'type'     => 'view_milestone',
            'title'    => "👁️ {$formatted} Views Milestone!",
            'message'  => "Your post just reached {$formatted} views. Amazing reach!",
            'data'     => [
                'milestone_type'  => 'views',
                'milestone_count' => $views,
                'post_id'         => $post->id,
                'post_content'    => self::truncate($post->content, 60),
            ],
        ]);
    }

    /**
     * Followers count milestone (called internally from sendFollowNotification).
     */
    private static function sendFollowersMilestone(User $user, int $count): void
    {
        $alreadySent = Notification::where('user_id', $user->id)
            ->where('type', 'milestone_followers')
            ->whereJsonContains('data->follower_count', $count)
            ->exists();

        if ($alreadySent) return;

        $formatted = self::formatNumber($count);

        Notification::create([
            'user_id'  => $user->id,
            'actor_id' => null,
            'type'     => 'milestone_followers',
            'title'    => "🎊 {$formatted} Followers Milestone!",
            'message'  => "You just hit {$formatted} followers on BlogX. Your community is growing!",
            'data'     => [
                'milestone_type'  => 'followers',
                'milestone_count' => $count,
                'follower_count'  => $count,
            ],
        ]);
    }

    // ─── Utility helpers ─────────────────────────────────────────────────────

    private static function truncate(?string $text, int $limit = 80): string
    {
        if (!$text) return '';
        $text = strip_tags($text);
        return mb_strlen($text) <= $limit ? $text : mb_substr($text, 0, $limit) . '…';
    }

    private static function formatNumber(int $n): string
    {
        if ($n >= 1_000_000) return round($n / 1_000_000, 1) . 'M';
        if ($n >= 1_000)     return round($n / 1_000, 1) . 'K';
        return (string) $n;
    }
}
