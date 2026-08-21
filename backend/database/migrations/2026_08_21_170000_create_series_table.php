<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('series', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('cover_image')->nullable();
            $table->unsignedBigInteger('views_count')->default(0);
            $table->boolean('is_published')->default(true);
            $table->timestamps();

            $table->index('user_id');
            $table->index('slug');
        });

        // Add series_id and series_order to blogs table
        Schema::table('blogs', function (Blueprint $table) {
            $table->foreignId('series_id')->nullable()->constrained('series')->nullOnDelete();
            $table->unsignedInteger('series_order')->nullable()->default(1);
            $table->index(['series_id', 'series_order']);
        });
    }

    public function down(): void
    {
        Schema::table('blogs', function (Blueprint $table) {
            $table->dropForeign(['series_id']);
            $table->dropColumn(['series_id', 'series_order']);
        });

        Schema::dropIfExists('series');
    }
};
