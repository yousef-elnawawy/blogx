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
        // Add is_admin to users table if not already present
        if (!Schema::hasColumn('users', 'is_admin')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('is_admin')->default(false)->after('verified');
            });
        }

        // Create verification_requests table
        if (!Schema::hasTable('verification_requests')) {
            Schema::create('verification_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->string('category'); // e.g. "Creator", "Journalist", "Business", "Public Figure", "Other"
                $table->text('reason');
                $table->string('document_path')->nullable();
                $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
                $table->text('admin_notes')->nullable();
                $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('reviewed_at')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('verification_requests');

        if (Schema::hasColumn('users', 'is_admin')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('is_admin');
            });
        }
    }
};
