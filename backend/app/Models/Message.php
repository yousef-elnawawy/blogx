<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'sender_id',
        'recipient_id',
        'reply_to_id',
        'text',
        'images',
        'audio_url',
        'audio_duration',
        'shared_data',
        'reactions',
        'is_seen',
        'seen_at',
    ];

    protected $casts = [
        'images' => 'array',
        'shared_data' => 'array',
        'reactions' => 'array',
        'audio_duration' => 'integer',
        'is_seen' => 'boolean',
        'seen_at' => 'datetime',
    ];

    /**
     * Transparently encrypt message text at rest (AES-256).
     * Decrypts gracefully when fetched.
     */
    protected function text(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (empty($value)) return '';
                try {
                    return Crypt::decryptString($value);
                } catch (\Exception $e) {
                    return $value; // Return original if not encrypted
                }
            },
            set: function ($value) {
                if (empty($value)) return '';
                return Crypt::encryptString($value);
            }
        );
    }

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

    public function replyTo(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'reply_to_id');
    }

    /**
     * Format message for frontend JSON response.
     */
    public function format(?int $currentUserId = null): array
    {
        $images = $this->images ?? [];
        $formattedImages = array_map(function ($img) {
            if ($img && !str_starts_with($img, 'http')) {
                return config('app.url') . $img;
            }
            return $img;
        }, $images);

        $senderAvatar = $this->relationLoaded('sender') && $this->sender ? $this->sender->avatar : null;
        if ($senderAvatar && !str_starts_with($senderAvatar, 'http')) {
            $senderAvatar = config('app.url') . $senderAvatar;
        }

        // Format replied message snippet
        $replyData = null;
        if ($this->reply_to_id) {
            $parentMsg = $this->relationLoaded('replyTo') ? $this->replyTo : $this->replyTo()->with('sender')->first();
            if ($parentMsg) {
                $parentSender = $parentMsg->relationLoaded('sender') ? $parentMsg->sender : $parentMsg->sender()->first();
                $replyData = [
                    'id' => $parentMsg->id,
                    'sender_id' => $parentMsg->sender_id,
                    'sender_name' => $parentSender?->name ?? 'User',
                    'text' => $parentMsg->text ?: (count($parentMsg->images ?? []) > 0 ? '📷 Image' : ''),
                ];
            }
        }

        // Format reactions
        $reactionsRaw = $this->reactions ?? [];
        $reactionsSummary = [];
        foreach ($reactionsRaw as $r) {
            $emoji = $r['emoji'] ?? '';
            $userId = (int) ($r['user_id'] ?? 0);
            if (!$emoji || !$userId) continue;

            if (!isset($reactionsSummary[$emoji])) {
                $reactionsSummary[$emoji] = [
                    'emoji' => $emoji,
                    'count' => 0,
                    'users' => [],
                    'has_reacted' => false,
                ];
            }
            $reactionsSummary[$emoji]['count']++;
            $reactionsSummary[$emoji]['users'][] = $userId;
            if ($currentUserId && $userId === (int) $currentUserId) {
                $reactionsSummary[$emoji]['has_reacted'] = true;
            }
        }

        $audioUrl = $this->audio_url;
        if ($audioUrl && !str_starts_with($audioUrl, 'http')) {
            $audioUrl = config('app.url') . $audioUrl;
        }

        return [
            'id' => $this->id,
            'conversation_id' => $this->conversation_id,
            'sender_id' => $this->sender_id,
            'recipient_id' => $this->recipient_id,
            'reply_to_id' => $this->reply_to_id,
            'reply_to' => $replyData,
            'text' => $this->text ?? '',
            'image' => !empty($formattedImages) ? $formattedImages[0] : null,
            'images' => $formattedImages,
            'audio_url' => $audioUrl,
            'audio_duration' => $this->audio_duration,
            'shared_data' => $this->shared_data,
            'reactions' => array_values($reactionsSummary),
            'is_seen' => (bool) $this->is_seen,
            'seen_at' => $this->seen_at?->toIso8601String(),
            'created_at' => $this->created_at ? $this->created_at->toIso8601String() : now()->toIso8601String(),
            'created_at_human' => $this->created_at ? $this->created_at->diffForHumans() : '',
            'sender' => $this->relationLoaded('sender') && $this->sender ? [
                'id' => $this->sender->id,
                'name' => $this->sender->name,
                'username' => $this->sender->username,
                'avatar' => $senderAvatar,
                'verified' => (bool) $this->sender->verified,
            ] : null,
        ];
    }
}
