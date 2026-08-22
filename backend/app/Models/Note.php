<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Note extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'text',
        'emoji',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    /**
     * The user that owns the note.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope query to only include active (non-expired) notes.
     */
    public function scopeActive($query)
    {
        return $query->where('expires_at', '>', now());
    }

    /**
     * Format note for API response.
     */
    public function format(?int $currentUserId = null): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'is_mine' => $currentUserId !== null && $this->user_id === $currentUserId,
            'text' => $this->text,
            'emoji' => $this->emoji,
            'created_at' => $this->created_at->toIso8601String(),
            'expires_at' => $this->expires_at->toIso8601String(),
            'created_at_human' => $this->created_at->diffForHumans(),
            'remaining_hours' => (int) max(0, floor(now()->diffInSeconds($this->expires_at, false) / 3600)),
            'remaining_minutes' => (int) max(0, floor(now()->diffInSeconds($this->expires_at, false) / 60)),
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'username' => $this->user->username,
                'avatar' => $this->user->avatar,
                'verified' => (bool) $this->user->verified,
                'badges' => $this->user->badges ?? [],
            ],
        ];
    }
}
