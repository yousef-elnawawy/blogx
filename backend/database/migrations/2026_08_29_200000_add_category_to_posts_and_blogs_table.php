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
            if (!Schema::hasColumn('posts', 'category')) {
                $table->string('category', 50)->nullable()->default('general')->after('content')->index();
            }
        });

        Schema::table('blogs', function (Blueprint $table) {
            if (!Schema::hasColumn('blogs', 'category')) {
                $table->string('category', 50)->nullable()->default('general')->after('tags')->index();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            if (Schema::hasColumn('posts', 'category')) {
                $table->dropColumn('category');
            }
        });

        Schema::table('blogs', function (Blueprint $table) {
            if (Schema::hasColumn('blogs', 'category')) {
                $table->dropColumn('category');
            }
        });
    }
};
