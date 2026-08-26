<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Crypt;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_one_id',
        'user_two_id',
        'last_message_text',
        'last_message_at',
        'user_one_pinned',
        'user_two_pinned',
        'pinned_message_id',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
        'user_one_pinned' => 'boolean',
        'user_two_pinned' => 'boolean',
        'pinned_message_id' => 'integer',
    ];

    /**
     * Transparently encrypt last message text at rest.
     */
    protected function lastMessageText(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (empty($value)) return '';
                try {
                    return Crypt::decryptString($value);
                } catch (\Exception $e) {
                    return $value;
                }
            },
            set: function ($value) {
                if (empty($value)) return '';
                return Crypt::encryptString($value);
            }
        );
    }

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

    public function pinnedMessage(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'pinned_message_id');
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
        if ((int) $this->user_one_id === (int) $currentUserId) {
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
     * Check if this conversation is pinned by the given user.
     */
    public function isPinnedFor(int $userId): bool
    {
        if ((int) $this->user_one_id === (int) $userId) {
            return (bool) $this->user_one_pinned;
        }
        if ((int) $this->user_two_id === (int) $userId) {
            return (bool) $this->user_two_pinned;
        }
        return false;
    }

    /**
     * Toggle pinned status for the given user.
     */
    public function togglePinFor(int $userId): bool
    {
        if ((int) $this->user_one_id === (int) $userId) {
            $this->user_one_pinned = !$this->user_one_pinned;
            $this->save();
            return (bool) $this->user_one_pinned;
        }
        if ((int) $this->user_two_id === (int) $userId) {
            $this->user_two_pinned = !$this->user_two_pinned;
            $this->save();
            return (bool) $this->user_two_pinned;
        }
        return false;
    }

    /**
     * Format conversation for frontend JSON response.
     */
    public function format(int $currentUserId): array
    {
        $otherUser = $this->getOtherUser($currentUserId);
        $latestMsg = $this->latestMessage;

        $customNickname = null;
        if ($otherUser && $currentUserId) {
            $customNickname = ContactNickname::where('user_id', $currentUserId)
                ->where('contact_id', $otherUser->id)
                ->value('nickname');
        }

        $avatarUrl = $otherUser?->avatar;
        if ($avatarUrl && !str_starts_with($avatarUrl, 'http')) {
            $avatarUrl = config('app.url') . $avatarUrl;
        }

        $coverUrl = $otherUser?->cover;
        if ($coverUrl && !str_starts_with($coverUrl, 'http')) {
            $coverUrl = config('app.url') . $coverUrl;
        }

        $pinnedMsgFormatted = null;
        if ($this->pinned_message_id) {
            $pinned = $this->relationLoaded('pinnedMessage') ? $this->pinnedMessage : $this->pinnedMessage()->with('sender')->first();
            if ($pinned) {
                $pinnedMsgFormatted = $pinned->format($currentUserId);
            }
        }

        return [
            'id' => $this->id,
            'is_pinned' => $this->isPinnedFor($currentUserId),
            'pinned_message' => $pinnedMsgFormatted,
            'user' => $otherUser ? [
                'id' => $otherUser->id,
                'name' => $otherUser->name,
                'custom_nickname' => $customNickname,
                'display_name' => $customNickname ?: $otherUser->name,
                'username' => $otherUser->username,
                'avatar' => $avatarUrl,
                'cover' => $coverUrl,
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
                'text' => !empty($latestMsg->text)
                    ? $latestMsg->text
                    : (!empty($latestMsg->audio_url)
                        ? '🎙️ Voice message'
                        : (!empty($latestMsg->file_url)
                            ? '📎 ' . ($latestMsg->file_name ?: 'File')
                            : (!empty($latestMsg->video_url)
                                ? '🎥 Video'
                                : (!empty($latestMsg->shared_data)
                                    ? '🔗 Shared ' . ($latestMsg->shared_data['type'] ?? 'content')
                                    : (count($latestMsg->images ?? []) > 0 ? '📷 Image' : ''))))),
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
