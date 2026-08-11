<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Comment extends Model
{
    use HasFactory;

    protected $fillable = [
        'post_id',
        'user_id',
        'parent_id',
        'content',
        'is_pinned',
    ];

    protected $casts = [
        'is_pinned' => 'boolean',
    ];

    // Relationships
    public function post()
    {
        return $this->belongsTo(Post::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function parent()
    {
        return $this->belongsTo(Comment::class, 'parent_id');
    }

    public function replies()
    {
        return $this->hasMany(Comment::class, 'parent_id');
    }

    public function likes()
    {
        return $this->morphMany(Like::class, 'likeable');
    }

    // Helper Methods
    public function isLikedBy(User $user)
    {
        return $this->likes()->where('user_id', $user->id)->exists();
    }

    public function getLikeCountAttribute()
    {
        return $this->likes()->count();
    }

    public function getReplyCountAttribute()
    {
        return $this->replies()->count();
    }
}
