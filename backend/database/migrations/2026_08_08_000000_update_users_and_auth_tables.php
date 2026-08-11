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
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'email_verified_at')) {
                $table->timestamp('email_verified_at')->nullable()->after('email');
            }
            if (!Schema::hasColumn('users', 'remember_token')) {
                $table->rememberToken()->after('password');
            }
            if (!Schema::hasColumn('users', 'two_factor_secret')) {
                $table->text('two_factor_secret')->nullable()->after('remember_token');
            }
            if (!Schema::hasColumn('users', 'two_factor_recovery_codes')) {
                $table->text('two_factor_recovery_codes')->nullable()->after('two_factor_secret');
            }
            if (!Schema::hasColumn('users', 'two_factor_confirmed_at')) {
                $table->timestamp('two_factor_confirmed_at')->nullable()->after('two_factor_recovery_codes');
            }
        });

        if (!Schema::hasTable('auth_tickets')) {
            Schema::create('auth_tickets', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('ticket', 64)->unique();
                $table->string('type', 32)->default('oauth'); // 'oauth', '2fa', 'reset'
                $table->json('payload')->nullable();
                $table->timestamp('expires_at');
                $table->timestamps();
                $table->index(['ticket', 'expires_at']);
            });
        }

        if (!Schema::hasTable('user_devices')) {
            Schema::create('user_devices', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('token_id')->nullable()->index();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->string('device_type')->nullable(); // 'desktop', 'mobile', 'tablet'
                $table->string('browser')->nullable();
                $table->string('platform')->nullable();
                $table->string('city')->nullable();
                $table->timestamp('last_active_at')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_devices');
        Schema::dropIfExists('auth_tickets');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'email_verified_at',
                'remember_token',
                'two_factor_secret',
                'two_factor_recovery_codes',
                'two_factor_confirmed_at',
            ]);
        });
    }
};
