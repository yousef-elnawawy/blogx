<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Story extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'media_url',
        'caption',
        'background_style',
        'overlay_data',
        'expires_at',
    ];

    protected $casts = [
        'background_style' => 'array',
        'overlay_data' => 'array',
        'expires_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function views()
    {
        return $this->hasMany(StoryView::class);
    }

    public function viewers()
    {
        return $this->belongsToMany(User::class, 'story_views')->withTimestamps();
    }

    public function scopeActive($query)
    {
        return $query->where('expires_at', '>', now());
    }

    public function isViewedBy(?User $user): bool
    {
        if (!$user) return false;
        return $this->views()->where('user_id', $user->id)->exists();
    }
}
