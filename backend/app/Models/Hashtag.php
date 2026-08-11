<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Hashtag extends Model
{
    use HasFactory;

    protected $fillable = [
        'tag',
        'usage_count',
    ];

    // Relationships
    public function posts()
    {
        return $this->belongsToMany(Post::class, 'post_hashtags');
    }

    // Helper Methods
    public function incrementUsageCount()
    {
        $this->increment('usage_count');
    }

    public function decrementUsageCount()
    {
        $this->decrement('usage_count');
    }
}
