<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->string('audio_url')->nullable()->after('images');
            $table->unsignedSmallInteger('audio_duration')->nullable()->after('audio_url'); // Duration in seconds
            $table->json('shared_data')->nullable()->after('audio_duration'); // Shared post, blog, video, or snippet
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['audio_url', 'audio_duration', 'shared_data']);
        });
    }
};
