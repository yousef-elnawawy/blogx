<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'sender_id',
        'recipient_id',
        'text',
        'images',
        'is_seen',
        'seen_at',
    ];

    protected $casts = [
        'images' => 'array',
        'is_seen' => 'boolean',
        'seen_at' => 'datetime',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    /**
     * Format message for frontend JSON response.
     */
    public function format(?int $currentUserId = null): array
    {
        $images = $this->images ?? [];

        return [
            'id' => $this->id,
            'conversation_id' => $this->conversation_id,
            'sender_id' => $this->sender_id,
            'recipient_id' => $this->recipient_id,
            'text' => $this->text ?? '',
            'image' => !empty($images) ? $images[0] : null,
            'images' => $images,
            'is_seen' => (bool) $this->is_seen,
            'seen_at' => $this->seen_at?->toIso8601String(),
            'created_at' => $this->created_at ? $this->created_at->toIso8601String() : now()->toIso8601String(),
            'created_at_human' => $this->created_at ? $this->created_at->diffForHumans() : '',
            'sender' => $this->relationLoaded('sender') && $this->sender ? [
                'id' => $this->sender->id,
                'name' => $this->sender->name,
                'username' => $this->sender->username,
                'avatar' => $this->sender->avatar,
                'verified' => (bool) $this->sender->verified,
            ] : null,
        ];
    }
}
