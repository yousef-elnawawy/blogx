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
            $table->foreignId('repost_of_id')->nullable()->constrained('posts')->nullOnDelete()->after('user_id');
            $table->foreignId('quote_of_id')->nullable()->constrained('posts')->nullOnDelete()->after('repost_of_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropForeign(['repost_of_id']);
            $table->dropForeign(['quote_of_id']);
            $table->dropColumn(['repost_of_id', 'quote_of_id']);
        });
    }
};
