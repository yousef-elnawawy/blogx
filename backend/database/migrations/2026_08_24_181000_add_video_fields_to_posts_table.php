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
        Schema::table('posts', function (Blueprint $table) {
            $table->string('video_url')->nullable()->after('content');
            $table->string('video_thumbnail')->nullable()->after('video_url');
            $table->unsignedSmallInteger('video_duration')->nullable()->after('video_thumbnail'); // Duration in seconds
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn(['video_url', 'video_thumbnail', 'video_duration']);
        });
    }
};
