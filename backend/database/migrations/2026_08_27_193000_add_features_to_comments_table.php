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
        Schema::table('comments', function (Blueprint $table) {
            $table->boolean('is_edited')->default(false)->after('content');
            $table->boolean('is_creator_liked')->default(false)->after('is_pinned');
            $table->string('image_url')->nullable()->after('content');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('comments', function (Blueprint $table) {
            $table->dropColumn(['is_edited', 'is_creator_liked', 'image_url']);
        });
    }
};
