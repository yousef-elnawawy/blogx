<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Series extends Model
{
    use HasFactory;

    protected $table = 'series';

    protected $fillable = [
        'user_id',
        'title',
        'slug',
        'description',
        'cover_image',
        'views_count',
        'is_published',
    ];

    protected $casts = [
        'views_count'  => 'integer',
        'is_published' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function blogs()
    {
        return $this->hasMany(Blog::class)->orderBy('series_order', 'asc');
    }

    public function publishedBlogs()
    {
        return $this->hasMany(Blog::class)
            ->where('status', 'published')
            ->orderBy('series_order', 'asc');
    }
}
