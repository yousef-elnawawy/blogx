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
        Schema::create('blog_annotations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blog_id')->constrained('blogs')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('highlighted_text');
            $table->text('surrounding_text')->nullable();
            $table->text('note')->nullable();
            $table->string('color', 30)->default('amber'); // amber, emerald, sky, rose
            $table->boolean('is_private')->default(false);
            $table->timestamps();

            $table->index(['blog_id', 'created_at']);
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('blog_annotations');
    }
};
