<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_one_id',
        'user_two_id',
        'last_message_text',
        'last_message_at',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
    ];

    public function userOne(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_one_id');
    }

    public function userTwo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_two_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'conversation_id')->orderBy('created_at', 'asc');
    }

    public function latestMessage(): HasOne
    {
        return $this->hasOne(Message::class, 'conversation_id')->latestOfMany();
    }

    /**
     * Scope to conversations involving the given user ID.
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_one_id', $userId)
                     ->orWhere('user_two_id', $userId);
    }

    /**
     * Get or create a conversation between two users.
     */
    public static function findOrCreateBetween(int $userId1, int $userId2): self
    {
        $userOne = min($userId1, $userId2);
        $userTwo = max($userId1, $userId2);

        return self::firstOrCreate(
            ['user_one_id' => $userOne, 'user_two_id' => $userTwo],
            ['last_message_at' => now()]
        );
    }

    /**
     * Get the participant who is NOT the current user.
     */
    public function getOtherUser(int $currentUserId): ?User
    {
        if ($this->user_one_id === $currentUserId) {
            return $this->userTwo;
        }
        return $this->userOne;
    }

    /**
     * Count unread messages for a specific user in this conversation.
     */
    public function unreadCountFor(int $userId): int
    {
        return $this->messages()
            ->where('recipient_id', $userId)
            ->where('is_seen', false)
            ->count();
    }

    /**
     * Format conversation for frontend JSON response.
     */
    public function format(int $currentUserId): array
    {
        $otherUser = $this->getOtherUser($currentUserId);
        $latestMsg = $this->latestMessage;

        return [
            'id' => $this->id,
            'user' => $otherUser ? [
                'id' => $otherUser->id,
                'name' => $otherUser->name,
                'username' => $otherUser->username,
                'avatar' => $otherUser->avatar,
                'cover' => $otherUser->cover,
                'bio' => $otherUser->bio,
                'location' => $otherUser->location,
                'website' => $otherUser->website,
                'verified' => (bool) $otherUser->verified,
                'badges' => $otherUser->equipped_badges ?? $otherUser->badges ?? [],
                'is_online' => false,
                'last_seen' => $otherUser->updated_at ? $otherUser->updated_at->diffForHumans() : '',
                'followers_count' => $otherUser->followers()->count(),
                'following_count' => $otherUser->following()->count(),
                'posts_count' => $otherUser->posts()->count(),
                'created_at' => $otherUser->created_at?->toIso8601String(),
            ] : null,
            'last_message' => $latestMsg ? [
                'id' => $latestMsg->id,
                'text' => $latestMsg->text ?? (count($latestMsg->images ?? []) > 0 ? '📷 Image' : ''),
                'created_at' => $latestMsg->created_at->diffForHumans(),
                'created_at_iso' => $latestMsg->created_at->toIso8601String(),
                'is_seen' => (bool) $latestMsg->is_seen,
                'sender_id' => $latestMsg->sender_id,
            ] : null,
            'unread_count' => $this->unreadCountFor($currentUserId),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
