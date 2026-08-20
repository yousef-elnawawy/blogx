<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Poll extends Model
{
    use HasFactory;

    protected $fillable = [
        'post_id',
        'question',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    public function post()
    {
        return $this->belongsTo(Post::class);
    }

    public function options()
    {
        return $this->hasMany(PollOption::class)->orderBy('order');
    }

    public function votes()
    {
        return $this->hasMany(PollVote::class);
    }

    public function getTotalVotesAttribute(): int
    {
        return (int) $this->options()->sum('votes_count');
    }

    public function hasEnded(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function userVotedOptionId(?User $user): ?int
    {
        if (!$user) return null;
        $vote = $this->votes()->where('user_id', $user->id)->first();
        return $vote ? $vote->poll_option_id : null;
    }
}
