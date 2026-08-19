<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'community_id',
        'repost_of_id',
        'quote_of_id',
        'content',
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
}
