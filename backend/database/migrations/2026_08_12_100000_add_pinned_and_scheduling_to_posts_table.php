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
            $table->boolean('is_pinned')->default(false)->after('is_edited');
            $table->string('status')->default('published')->after('is_pinned');
            $table->timestamp('scheduled_at')->nullable()->after('status');

            $table->index('is_pinned');
            $table->index('status');
            $table->index('scheduled_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropIndex(['is_pinned']);
            $table->dropIndex(['status']);
            $table->dropIndex(['scheduled_at']);
            $table->dropColumn(['is_pinned', 'status', 'scheduled_at']);
        });
    }
};
