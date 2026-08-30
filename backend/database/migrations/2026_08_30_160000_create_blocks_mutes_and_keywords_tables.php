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
        // 1. Blocks table
        Schema::create('blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blocker_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('blocked_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['blocker_id', 'blocked_id']);
            $table->index('blocker_id');
            $table->index('blocked_id');
        });

        // 2. Mutes table
        Schema::create('mutes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('muter_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('muted_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['muter_id', 'muted_id']);
            $table->index('muter_id');
            $table->index('muted_id');
        });

        // 3. Muted keywords & phrases
        Schema::create('muted_keywords', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('keyword');
            $table->string('mute_type')->default('all'); // all, posts, comments
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'keyword']);
        });

        // 4. Add preferences column to users table if not exists
        if (!Schema::hasColumn('users', 'preferences')) {
            Schema::table('users', function (Blueprint $table) {
                $table->json('preferences')->nullable()->after('equipped_badges');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('muted_keywords');
        Schema::dropIfExists('mutes');
        Schema::dropIfExists('blocks');

        if (Schema::hasColumn('users', 'preferences')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('preferences');
            });
        }
    }
};
