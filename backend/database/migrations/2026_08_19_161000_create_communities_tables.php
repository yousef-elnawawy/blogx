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
        Schema::create('communities', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('avatar')->nullable();
            $table->string('cover')->nullable();
            $table->foreignId('creator_id')->constrained('users')->cascadeOnDelete();
            $table->enum('type', ['public', 'restricted', 'private'])->default('public');
            $table->json('rules')->nullable();
            $table->unsignedInteger('members_count')->default(1);
            $table->unsignedInteger('posts_count')->default(0);
            $table->timestamps();
        });

        Schema::create('community_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('community_id')->constrained('communities')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('role', ['admin', 'moderator', 'member'])->default('member');
            $table->enum('status', ['approved', 'pending', 'rejected'])->default('approved');
            $table->timestamps();

            $table->unique(['community_id', 'user_id']);
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->foreignId('community_id')->nullable()->constrained('communities')->nullOnDelete()->after('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropForeign(['community_id']);
            $table->dropColumn(['community_id']);
        });

        Schema::dropIfExists('community_members');
        Schema::dropIfExists('communities');
    }
};
