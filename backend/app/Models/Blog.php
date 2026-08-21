<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Blog extends Model
{
    use HasFactory;

    protected $table = 'blogs';

    protected $fillable = [
        'user_id',
        'title',
        'slug',
        'content',
        'excerpt',
        'cover_image',
        'tags',
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
}
