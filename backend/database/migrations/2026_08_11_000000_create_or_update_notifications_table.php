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
        if (Schema::hasTable('notifications')) {
            Schema::table('notifications', function (Blueprint $table) {
                if (!Schema::hasColumn('notifications', 'actor_id')) {
                    $table->foreignId('actor_id')->nullable()->after('user_id')->constrained('users')->nullOnDelete();
                }
                if (!Schema::hasColumn('notifications', 'data')) {
                    $table->json('data')->nullable()->after('message');
                }
            });
        } else {
            Schema::create('notifications', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('type', 60)->index();
                $table->string('title');
                $table->text('message');
                $table->json('data')->nullable();
                $table->timestamp('read_at')->nullable()->index();
                $table->timestamps();

                $table->index(['user_id', 'created_at']);
                $table->index(['user_id', 'read_at']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('notifications')) {
            Schema::table('notifications', function (Blueprint $table) {
                if (Schema::hasColumn('notifications', 'actor_id')) {
                    $table->dropForeign(['actor_id']);
                    $table->dropColumn('actor_id');
                }
                if (Schema::hasColumn('notifications', 'data')) {
                    $table->dropColumn('data');
                }
            });
        }
    }
};
