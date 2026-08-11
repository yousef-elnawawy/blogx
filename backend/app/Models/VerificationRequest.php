<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VerificationRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'category',
        'reason',
        'document_path',
        'status',
        'admin_notes',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
