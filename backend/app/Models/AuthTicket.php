<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuthTicket extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'ticket',
        'type',
        'payload',
        'expires_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'expires_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}
