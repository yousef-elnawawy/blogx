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
        // 1. Custom Contact Nicknames (User-private aliases)
        if (!Schema::hasTable('contact_nicknames')) {
            Schema::create('contact_nicknames', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->foreignId('contact_id')->constrained('users')->onDelete('cascade');
                $table->string('nickname', 100);
                $table->timestamps();

                $table->unique(['user_id', 'contact_id']);
                $table->index('user_id');
            });
        }

        // 2. Starred Messages (Bookmarked per-user)
        if (!Schema::hasTable('starred_messages')) {
            Schema::create('starred_messages', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->foreignId('message_id')->constrained('messages')->onDelete('cascade');
                $table->timestamps();

                $table->unique(['user_id', 'message_id']);
                $table->index('user_id');
            });
        }

        // 3. Add edit, file and video fields to messages table
        Schema::table('messages', function (Blueprint $table) {
            if (!Schema::hasColumn('messages', 'is_edited')) {
                $table->boolean('is_edited')->default(false)->after('reactions');
            }
            if (!Schema::hasColumn('messages', 'edited_at')) {
                $table->timestamp('edited_at')->nullable()->after('is_edited');
            }
            if (!Schema::hasColumn('messages', 'file_url')) {
                $table->string('file_url')->nullable()->after('audio_duration');
            }
            if (!Schema::hasColumn('messages', 'file_name')) {
                $table->string('file_name')->nullable()->after('file_url');
            }
            if (!Schema::hasColumn('messages', 'file_size')) {
                $table->unsignedBigInteger('file_size')->nullable()->after('file_name');
            }
            if (!Schema::hasColumn('messages', 'file_type')) {
                $table->string('file_type', 50)->nullable()->after('file_size');
            }
            if (!Schema::hasColumn('messages', 'video_url')) {
                $table->string('video_url')->nullable()->after('file_type');
            }
        });

        // 4. Add pinned message to conversation
        Schema::table('conversations', function (Blueprint $table) {
            if (!Schema::hasColumn('conversations', 'pinned_message_id')) {
                $table->foreignId('pinned_message_id')->nullable()->constrained('messages')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            if (Schema::hasColumn('conversations', 'pinned_message_id')) {
                $table->dropForeign(['pinned_message_id']);
                $table->dropColumn('pinned_message_id');
            }
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn([
                'is_edited',
                'edited_at',
                'file_url',
                'file_name',
                'file_size',
                'file_type',
                'video_url',
            ]);
        });

        Schema::dropIfExists('starred_messages');
        Schema::dropIfExists('contact_nicknames');
    }
};
