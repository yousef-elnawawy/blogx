<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Mute extends Model
{
    use HasFactory;

    protected $fillable = [
        'muter_id',
        'muted_id',
    ];

    public function muter()
    {
        return $this->belongsTo(User::class, 'muter_id');
    }

    public function muted()
    {
        return $this->belongsTo(User::class, 'muted_id');
    }
}
