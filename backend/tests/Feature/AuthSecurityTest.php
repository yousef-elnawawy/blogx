<?php

namespace Tests\Feature;

use App\Models\AuthTicket;
use App\Models\User;
use App\Models\UserDevice;
use App\Services\TotpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_with_strong_password(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'John Doe',
            'username' => 'johndoe',
            'email' => 'john@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'user' => ['id', 'name', 'username', 'email'],
                'token',
            ]);

        $this->assertDatabaseHas('users', [
            'username' => 'johndoe',
            'email' => 'john@example.com',
        ]);

        $this->assertDatabaseHas('user_devices', [
            'user_id' => $response->json('user.id'),
        ]);
    }

    public function test_login_requires_valid_credentials_and_tracks_attempts(): void
    {
        $user = User::factory()->create([
            'email' => 'jane@example.com',
            'username' => 'janedoe',
            'password' => Hash::make('Secret123!'),
        ]);

        $response = $this->postJson('/api/login', [
            'login' => 'jane@example.com',
            'password' => 'WrongPassword',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['login']);

        $successResponse = $this->postJson('/api/login', [
            'login' => 'janedoe',
            'password' => 'Secret123!',
            'remember' => true,
        ]);

        $successResponse->assertStatus(200)
            ->assertJsonStructure(['message', 'user', 'token']);
    }

    public function test_multi_device_sessions_are_preserved_and_can_be_managed(): void
    {
        $user = User::factory()->create([
            'email' => 'multi@example.com',
            'password' => Hash::make('Secret123!'),
        ]);

        // Login from Device 1
        $login1 = $this->withServerVariables(['REMOTE_ADDR' => '1.1.1.1', 'HTTP_USER_AGENT' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0'])
            ->postJson('/api/login', [
                'login' => 'multi@example.com',
                'password' => 'Secret123!',
            ]);
        $login1->assertStatus(200);

        // Login from Device 2
        $login2 = $this->withServerVariables(['REMOTE_ADDR' => '2.2.2.2', 'HTTP_USER_AGENT' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile'])
            ->postJson('/api/login', [
                'login' => 'multi@example.com',
                'password' => 'Secret123!',
            ]);
        $login2->assertStatus(200);

        $token2 = $login2->json('token');

        // Check active sessions endpoint
        $sessionsResponse = $this->withHeader('Authorization', 'Bearer ' . $token2)
            ->getJson('/api/user/devices');

        $sessionsResponse->assertStatus(200)
            ->assertJsonCount(2, 'devices');

        // Logout other devices
        $logoutOthersResponse = $this->withHeader('Authorization', 'Bearer ' . $token2)
            ->postJson('/api/logout-others');
        $logoutOthersResponse->assertStatus(200);

        // Current device should still be valid
        $userCheck = $this->withHeader('Authorization', 'Bearer ' . $token2)
            ->getJson('/api/user');
        $userCheck->assertStatus(200);
    }

    public function test_two_factor_authentication_flow(): void
    {
        $user = User::factory()->create([
            'email' => 'twofa@example.com',
            'password' => Hash::make('Secret123!'),
        ]);

        $token = $user->createToken('test-token')->plainTextToken;

        // 1. Enable 2FA
        $enableResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/2fa/enable');

        $enableResponse->assertStatus(200)
            ->assertJsonStructure(['secret', 'qr_uri']);

        $secret = $enableResponse->json('secret');
        $validCode = TotpService::calculateCode($secret);

        // 2. Confirm 2FA
        $confirmResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/2fa/confirm', [
                'code' => $validCode,
            ]);

        $confirmResponse->assertStatus(200)
            ->assertJsonStructure(['message', 'recovery_codes']);

        $recoveryCodes = $confirmResponse->json('recovery_codes');
        $this->assertCount(8, $recoveryCodes);

        // 3. Login when 2FA is active returns a challenge ticket
        $loginChallenge = $this->postJson('/api/login', [
            'login' => 'twofa@example.com',
            'password' => 'Secret123!',
        ]);

        $loginChallenge->assertStatus(200)
            ->assertJson([
                'requires_2fa' => true,
            ]);

        $ticket = $loginChallenge->json('ticket');

        // 4. Verify 2FA challenge code
        $verifyChallenge = $this->postJson('/api/2fa/verify-login', [
            'ticket' => $ticket,
            'code' => TotpService::calculateCode($secret),
        ]);

        $verifyChallenge->assertStatus(200)
            ->assertJsonStructure(['message', 'user', 'token']);
    }

    public function test_google_oauth_ticket_exchange_prevents_url_token_leakage(): void
    {
        $user = User::factory()->create([
            'email' => 'oauth@example.com',
        ]);

        $ticket = AuthTicket::create([
            'user_id' => $user->id,
            'ticket' => Str::random(64),
            'type' => 'oauth',
            'expires_at' => now()->addSeconds(60),
        ]);

        // Exchange single-use ticket
        $exchangeResponse = $this->postJson('/api/auth/google/exchange', [
            'ticket' => $ticket->ticket,
        ]);

        $exchangeResponse->assertStatus(200)
            ->assertJsonStructure(['message', 'user', 'token']);

        // Ticket should be consumed immediately
        $this->assertDatabaseMissing('auth_tickets', [
            'id' => $ticket->id,
        ]);

        // Second attempt with same ticket must fail
        $secondAttempt = $this->postJson('/api/auth/google/exchange', [
            'ticket' => $ticket->ticket,
        ]);

        $secondAttempt->assertStatus(401);
    }

    public function test_forgot_and_reset_password_flow(): void
    {
        $user = User::factory()->create([
            'email' => 'reset@example.com',
            'password' => Hash::make('OldPassword123!'),
        ]);

        // Request reset
        $forgotResponse = $this->postJson('/api/forgot-password', [
            'email' => 'reset@example.com',
        ]);
        $forgotResponse->assertStatus(200);

        $record = \Illuminate\Support\Facades\DB::table('password_reset_tokens')
            ->where('email', 'reset@example.com')
            ->first();
        $this->assertNotNull($record);

        // We simulate a known token
        $rawToken = 'sample_raw_reset_token_64_chars_long_random_string_here_1234567890123';
        \Illuminate\Support\Facades\DB::table('password_reset_tokens')
            ->where('email', 'reset@example.com')
            ->update([
                'token' => Hash::make($rawToken),
                'created_at' => now(),
            ]);

        // Reset password
        $resetResponse = $this->postJson('/api/reset-password', [
            'email' => 'reset@example.com',
            'token' => $rawToken,
            'password' => 'NewSecurePassword123!',
            'password_confirmation' => 'NewSecurePassword123!',
        ]);

        $resetResponse->assertStatus(200)
            ->assertJsonStructure(['message', 'user', 'token']);

        // Old password no longer works
        $loginOld = $this->postJson('/api/login', [
            'login' => 'reset@example.com',
            'password' => 'OldPassword123!',
        ]);
        $loginOld->assertStatus(422);

        // New password works
        $loginNew = $this->postJson('/api/login', [
            'login' => 'reset@example.com',
            'password' => 'NewSecurePassword123!',
        ]);
        $loginNew->assertStatus(200);
    }
}
