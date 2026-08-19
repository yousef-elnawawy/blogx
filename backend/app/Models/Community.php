<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Community extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'avatar',
        'cover',
        'creator_id',
        'type',
        'rules',
        'members_count',
        'posts_count',
    ];

    protected $casts = [
        'rules'         => 'array',
        'members_count' => 'integer',
        'posts_count'   => 'integer',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function members()
    {
        return $this->hasMany(CommunityMember::class);
    }

    public function approvedMembers()
    {
        return $this->hasMany(CommunityMember::class)->where('status', 'approved');
    }

    public function pendingMembers()
    {
        return $this->hasMany(CommunityMember::class)->where('status', 'pending');
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'community_members')
            ->wherePivot('status', 'approved')
            ->withPivot('role', 'status', 'created_at')
            ->withTimestamps();
    }

    public function posts()
    {
        return $this->hasMany(Post::class);
    }

    public function isMember(?User $user): bool
    {
        if (!$user) return false;
        return $this->members()->where('user_id', $user->id)->where('status', 'approved')->exists();
    }

    public function isPending(?User $user): bool
    {
        if (!$user) return false;
        return $this->members()->where('user_id', $user->id)->where('status', 'pending')->exists();
    }

    public function isAdmin(?User $user): bool
    {
        if (!$user) return false;
        if ($this->creator_id === $user->id) return true;
        return $this->members()->where('user_id', $user->id)->where('role', 'admin')->where('status', 'approved')->exists();
    }

    public function getMemberStatus(?User $user): string
    {
        if (!$user) return 'guest';
        if ($this->creator_id === $user->id) return 'admin';

        $member = $this->members()->where('user_id', $user->id)->first();
        if (!$member) return 'none';
        if ($member->status === 'pending') return 'pending';
        if ($member->status === 'approved') return $member->role;
        return 'none';
    }
}
