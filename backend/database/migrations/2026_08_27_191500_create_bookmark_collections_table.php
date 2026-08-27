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
        Schema::create('bookmark_collections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('color')->default('blue'); // amber, blue, emerald, purple, rose, cyan
            $table->string('icon')->default('folder');
            $table->timestamps();
        });

        Schema::table('bookmarks', function (Blueprint $table) {
            $table->foreignId('collection_id')->nullable()->after('blog_id')->constrained('bookmark_collections')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookmarks', function (Blueprint $table) {
            $table->dropForeign(['collection_id']);
            $table->dropColumn('collection_id');
        });

        Schema::dropIfExists('bookmark_collections');
    }
};
