<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BlogAnnotation extends Model
{
    use HasFactory;

    protected $table = 'blog_annotations';

    protected $fillable = [
        'blog_id',
        'user_id',
        'highlighted_text',
        'surrounding_text',
        'note',
        'color',
        'is_private',
    ];

    protected $casts = [
        'is_private' => 'boolean',
    ];

    public function blog(): BelongsTo
    {
        return $this->belongsTo(Blog::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Format annotation for JSON response.
     */
    public function format(?User $authUser = null): array
    {
        $authorAvatar = $this->user ? $this->user->avatar : null;
        if ($authorAvatar && !str_starts_with($authorAvatar, 'http')) {
            $authorAvatar = config('app.url') . $authorAvatar;
        }

        return [
            'id'               => $this->id,
            'blog_id'          => $this->blog_id,
            'user_id'          => $this->user_id,
            'highlighted_text' => $this->highlighted_text,
            'surrounding_text' => $this->surrounding_text,
            'note'             => $this->note,
            'color'            => $this->color ?: 'amber',
            'is_private'       => (bool) $this->is_private,
            'is_mine'          => $authUser ? ($this->user_id === $authUser->id) : false,
            'created_at'       => $this->created_at ? $this->created_at->toIso8601String() : null,
            'created_at_human' => $this->created_at ? $this->created_at->diffForHumans() : null,
            'user'             => [
                'id'              => $this->user ? $this->user->id : null,
                'name'            => $this->user ? $this->user->name : 'Unknown User',
                'username'        => $this->user ? $this->user->username : 'user',
                'avatar'          => $authorAvatar,
                'verified'        => (bool) ($this->user ? $this->user->verified : false),
                'equipped_badges' => $this->user ? ($this->user->equipped_badges ?? []) : [],
            ],
        ];
    }
}
