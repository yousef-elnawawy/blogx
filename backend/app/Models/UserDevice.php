<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserDevice extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'token_id',
        'ip_address',
        'user_agent',
        'device_type',
        'browser',
        'platform',
        'city',
        'last_active_at',
    ];

    protected $casts = [
        'last_active_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
