<?php

namespace App\Models;

use App\Services\TotpService;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;
use Laravel\Scout\Searchable;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasFactory, Notifiable, HasApiTokens, Searchable;

    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'google_id',
        'bio',
        'avatar',
        'cover',
        'website',
        'location',
        'verified',
        'is_admin',
        'email_verified_at',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'two_factor_confirmed_at',
        'notification_preferences',
        'social_links',
        'equipped_badges',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    protected $casts = [
        'verified' => 'boolean',
        'is_admin' => 'boolean',
        'email_verified_at' => 'datetime',
        'two_factor_confirmed_at' => 'datetime',
        'notification_preferences' => 'array',
        'social_links' => 'array',
        'equipped_badges' => 'array',
    ];

    protected $appends = [
        'has_2fa',
        'is_email_verified',
    ];

    public function allowsNotification(string $type): bool
    {
        $prefs = $this->notification_preferences;
        if (!is_array($prefs)) {
            return true;
        }

        $key = match ($type) {
            'like_post', 'like_comment' => 'likes',
            'comment', 'comment_reply' => 'comments',
            'follow' => 'follows',
            'mention' => 'mentions',
            'share_post' => 'shares',
            'milestone_post', 'milestone_likes', 'milestone_followers', 'view_milestone' => 'milestones',
            default => $type,
        };

        return (bool) ($prefs[$key] ?? true);
    }

    public function getHas2faAttribute(): bool
    {
        return $this->hasTwoFactorEnabled();
    }

    public function getIsEmailVerifiedAttribute(): bool
    {
        return !is_null($this->email_verified_at);
    }

    public function hasTwoFactorEnabled(): bool
    {
        return !is_null($this->two_factor_secret) && !is_null($this->two_factor_confirmed_at);
    }

    public function generateTwoFactorSecret(): string
    {
        $secret = TotpService::generateSecret();
        $this->forceFill([
            'two_factor_secret' => encrypt($secret),
            'two_factor_confirmed_at' => null,
        ])->save();

        return $secret;
    }

    public function getDecryptedTwoFactorSecret(): ?string
    {
        if (!$this->two_factor_secret) {
            return null;
        }
        try {
            return decrypt($this->two_factor_secret);
        } catch (\Exception $e) {
            return null;
        }
    }

    public function verifyTwoFactorCode(string $code): bool
    {
        $secret = $this->getDecryptedTwoFactorSecret();
        if (!$secret) {
            return false;
        }
        return TotpService::verifyCode($secret, $code);
    }

    public function generateRecoveryCodes(): array
    {
        $codes = [];
        for ($i = 0; $i < 8; $i++) {
            $codes[] = Str::random(10) . '-' . Str::random(10);
        }

        $this->forceFill([
            'two_factor_recovery_codes' => encrypt(json_encode($codes)),
        ])->save();

        return $codes;
    }

    public function getRecoveryCodes(): array
    {
        if (!$this->two_factor_recovery_codes) {
            return [];
        }
        try {
            return json_decode(decrypt($this->two_factor_recovery_codes), true) ?? [];
        } catch (\Exception $e) {
            return [];
        }
    }

    public function verifyAndConsumeRecoveryCode(string $code): bool
    {
        $codes = $this->getRecoveryCodes();
        $code = trim($code);

        foreach ($codes as $key => $savedCode) {
            if (hash_equals($savedCode, $code)) {
                unset($codes[$key]);
                $this->forceFill([
                    'two_factor_recovery_codes' => encrypt(json_encode(array_values($codes))),
                ])->save();
                return true;
            }
        }

        return false;
    }

    // Relationships
    public function devices()
    {
        return $this->hasMany(UserDevice::class);
    }

    public function authTickets()
    {
        return $this->hasMany(AuthTicket::class);
    }

    public function posts()
    {
        return $this->hasMany(Post::class);
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function likes()
    {
        return $this->hasMany(Like::class);
    }

    public function mentions()
    {
        return $this->hasMany(Mention::class);
    }

    public function bookmarks()
    {
        return $this->hasMany(Bookmark::class);
    }

    public function bookmarkCollections()
    {
        return $this->hasMany(BookmarkCollection::class);
    }

    public function bookmarkedPosts()
    {
        return $this->belongsToMany(Post::class, 'bookmarks');
    }

    public function following()
    {
        return $this->belongsToMany(User::class, 'follows', 'follower_id', 'following_id')->withTimestamps();
    }

    public function followers()
    {
        return $this->belongsToMany(User::class, 'follows', 'following_id', 'follower_id')->withTimestamps();
    }

    public function isFollowing(User $user): bool
    {
        return $this->following()->where('following_id', $user->id)->exists();
    }

    public function follow(User $user)
    {
        if ($this->id === $user->id) return;
        return $this->following()->syncWithoutDetaching([$user->id]);
    }

    public function unfollow(User $user)
    {
        return $this->following()->detach($user->id);
    }

    public function verificationRequests()
    {
        return $this->hasMany(VerificationRequest::class);
    }

    public function latestVerificationRequest()
    {
        return $this->hasOne(VerificationRequest::class)->latestOfMany();
    }

    public function appNotifications()
    {
        return $this->hasMany(Notification::class, 'user_id');
    }

    public function notes()
    {
        return $this->hasMany(Note::class);
    }

    public function activeNote()
    {
        return $this->hasOne(Note::class)->where('expires_at', '>', now())->latestOfMany();
    }

    public function conversations()
    {
        return Conversation::forUser($this->id);
    }

    public function sentMessages()
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    public function receivedMessages()
    {
        return $this->hasMany(Message::class, 'recipient_id');
    }

    public function contactNicknames()
    {
        return $this->hasMany(ContactNickname::class, 'user_id');
    }

    public function starredMessages()
    {
        return $this->hasMany(StarredMessage::class, 'user_id');
    }

    /**
     * Get the indexable data array for the model.
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => (int) $this->id,
            'name' => (string) $this->name,
            'username' => (string) $this->username,
            'avatar' => (string) ($this->avatar ?? ''),
            'cover' => (string) ($this->cover ?? ''),
            'bio' => (string) ($this->bio ?? ''),
            'location' => (string) ($this->location ?? ''),
            'website' => (string) ($this->website ?? ''),
            'verified' => (bool) $this->verified,
            'followers_count' => (int) $this->followers()->count(),
            'posts_count' => (int) $this->posts()->published()->count(),
        ];
    }
}
