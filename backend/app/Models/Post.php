<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Laravel\Scout\Searchable;

class Post extends Model
{
    use HasFactory, Searchable;

    protected $fillable = [
        'user_id',
        'community_id',
        'repost_of_id',
        'quote_of_id',
        'content',
        'category',
        'video_url',
        'video_thumbnail',
        'video_duration',
        'comments_enabled',
        'views_count',
        'is_edited',
        'is_pinned',
        'status',
        'scheduled_at',
    ];

    protected $casts = [
        'comments_enabled' => 'boolean',
        'views_count'      => 'integer',
        'video_duration'   => 'integer',
        'is_edited'        => 'boolean',
        'is_pinned'        => 'boolean',
        'scheduled_at'     => 'datetime',
    ];

    // Scopes
    public function scopePublished($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('scheduled_at')
              ->orWhere('scheduled_at', '<=', now());
        })->where('status', '!=', 'draft');
    }

    public function scopeScheduled($query)
    {
        return $query->whereNotNull('scheduled_at')
                     ->where('scheduled_at', '>', now());
    }

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function community()
    {
        return $this->belongsTo(Community::class);
    }

    public function repostOf()
    {
        return $this->belongsTo(Post::class, 'repost_of_id');
    }

    public function quoteOf()
    {
        return $this->belongsTo(Post::class, 'quote_of_id');
    }

    public function reposts()
    {
        return $this->hasMany(Post::class, 'repost_of_id');
    }

    public function quotes()
    {
        return $this->hasMany(Post::class, 'quote_of_id');
    }

    public function images()
    {
        return $this->hasMany(PostImage::class)->orderBy('order');
    }

    public function poll()
    {
        return $this->hasOne(Poll::class);
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function likes()
    {
        return $this->morphMany(Like::class, 'likeable');
    }

    public function hashtags()
    {
        return $this->belongsToMany(Hashtag::class, 'post_hashtags');
    }

    public function mentions()
    {
        return $this->hasMany(Mention::class);
    }

    public function mentionedUsers()
    {
        return $this->belongsToMany(User::class, 'mentions');
    }

    public function bookmarks()
    {
        return $this->hasMany(Bookmark::class);
    }

    // Helper Methods
    public function isLikedBy(?User $user)
    {
        if (!$user) return false;
        return $this->likes()->where('user_id', $user->id)->exists();
    }

    public function isBookmarkedBy(?User $user)
    {
        if (!$user) return false;
        return $this->bookmarks()->where('user_id', $user->id)->exists();
    }

    public function isRepostedBy(?User $user)
    {
        if (!$user) return false;
        return $this->reposts()->where('user_id', $user->id)->exists();
    }

    public function getLikeCountAttribute()
    {
        return $this->likes()->count();
    }

    public function getCommentCountAttribute()
    {
        return $this->comments()->count();
    }

    public function getRepostCountAttribute()
    {
        return $this->reposts()->count() + $this->quotes()->count();
    }

    /**
     * Get the indexable data array for the model.
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => (int) $this->id,
            'content' => (string) $this->content,
            'category' => (string) ($this->category ?? 'general'),
            'author_name' => (string) ($this->user?->name ?? ''),
            'author_username' => (string) ($this->user?->username ?? ''),
            'author_avatar' => (string) ($this->user?->avatar ?? ''),
            'author_verified' => (bool) ($this->user?->verified ?? false),
            'video_url' => (string) ($this->video_url ?? ''),
            'video_thumbnail' => (string) ($this->video_thumbnail ?? ''),
            'hashtags' => $this->hashtags->pluck('tag')->toArray(),
            'likes_count' => (int) ($this->likes()->count()),
            'comments_count' => (int) ($this->comments()->count()),
            'views_count' => (int) ($this->views_count ?? 0),
            'created_at' => (int) ($this->created_at?->timestamp ?? time()),
        ];
    }

    /**
     * Determine if the model should be searchable.
     */
    public function shouldBeSearchable(): bool
    {
        return $this->status !== 'draft' && ($this->scheduled_at === null || $this->scheduled_at <= now());
    }
}
