<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Laravel\Scout\Searchable;

class Blog extends Model
{
    use HasFactory, Searchable;

    protected $table = 'blogs';

    protected $fillable = [
        'user_id',
        'title',
        'slug',
        'content',
        'excerpt',
        'cover_image',
        'tags',
        'category',
        'read_time',
        'status',
        'views_count',
        'is_pinned',
        'published_at',
        'series_id',
        'series_order',
    ];

    protected $casts = [
        'tags'         => 'array',
        'read_time'    => 'integer',
        'views_count'  => 'integer',
        'is_pinned'    => 'boolean',
        'published_at' => 'datetime',
        'series_id'    => 'integer',
        'series_order' => 'integer',
    ];

    // Scopes
    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function likes()
    {
        return $this->morphMany(Like::class, 'likeable');
    }

    public function bookmarks()
    {
        return $this->hasMany(Bookmark::class);
    }

    public function series()
    {
        return $this->belongsTo(Series::class);
    }

    // Helpers
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

    /**
     * Get the indexable data array for the model.
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => (int) $this->id,
            'title' => (string) $this->title,
            'slug' => (string) $this->slug,
            'excerpt' => (string) ($this->excerpt ?? ''),
            'content' => (string) strip_tags($this->content ?? ''),
            'cover_image' => (string) ($this->cover_image ?? ''),
            'category' => (string) ($this->category ?? 'general'),
            'read_time' => (int) ($this->read_time ?? 1),
            'tags' => is_array($this->tags) ? $this->tags : [],
            'author_name' => (string) ($this->user?->name ?? ''),
            'author_username' => (string) ($this->user?->username ?? ''),
            'author_avatar' => (string) ($this->user?->avatar ?? ''),
            'author_verified' => (bool) ($this->user?->verified ?? false),
            'views_count' => (int) ($this->views_count ?? 0),
            'published_at' => (int) ($this->published_at?->timestamp ?? 0),
        ];
    }

    /**
     * Determine if the model should be searchable.
     */
    public function shouldBeSearchable(): bool
    {
        return $this->status === 'published';
    }
}
