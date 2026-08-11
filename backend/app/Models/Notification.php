<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'actor_id',
        'type',
        'title',
        'message',
        'data',
        'read_at',
    ];

    protected $casts = [
        'data'    => 'array',
        'read_at' => 'datetime',
    ];

    /**
     * The recipient user.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * The actor user (who triggered the notification, nullable for system milestones).
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    /**
     * Scope to only unread notifications.
     */
    public function scopeUnread($query)
    {
        return $query->whereNull('read_at');
    }

    /**
     * Scope to filter by general category.
     */
    public function scopeFilterCategory($query, string $category)
    {
        return match ($category) {
            'likes'      => $query->whereIn('type', ['like_post', 'like_comment']),
            'comments'   => $query->whereIn('type', ['comment', 'comment_reply']),
            'mentions'   => $query->where('type', 'mention'),
            'follows'    => $query->where('type', 'follow'),
            'shares'     => $query->where('type', 'share_post'),
            'milestone'  => $query->whereIn('type', ['milestone_post', 'milestone_likes', 'milestone_followers', 'view_milestone']),
            'milestones' => $query->whereIn('type', ['milestone_post', 'milestone_likes', 'milestone_followers', 'view_milestone']),
            default      => $query,
        };
    }

    /**
     * Mark this notification as read.
     */
    public function markAsRead(): bool
    {
        if (is_null($this->read_at)) {
            $this->forceFill(['read_at' => now()])->save();
            return true;
        }
        return false;
    }

    /**
     * Format notification for JSON responses.
     */
    public function format(): array
    {
        $actorData = null;
        if ($this->actor) {
            $avatarUrl = $this->actor->avatar;
            if ($avatarUrl && !str_starts_with($avatarUrl, 'http')) {
                $avatarUrl = config('app.url') . $avatarUrl;
            }
            $actorData = [
                'id'       => $this->actor->id,
                'name'     => $this->actor->name,
                'username' => $this->actor->username,
                'avatar'   => $avatarUrl,
                'verified' => (bool) $this->actor->verified,
            ];
        }

        return [
            'id'         => $this->id,
            'user_id'    => $this->user_id,
            'actor_id'   => $this->actor_id,
            'type'       => $this->type,
            'title'      => $this->title,
            'message'    => $this->message,
            'data'       => $this->data ?? [],
            'read_at'    => $this->read_at ? $this->read_at->toIso8601String() : null,
            'is_read'    => !is_null($this->read_at),
            'created_at' => $this->created_at ? $this->created_at->toIso8601String() : null,
            'actor'      => $actorData,
        ];
    }
}
