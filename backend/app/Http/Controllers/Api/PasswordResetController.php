<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserDevice;
use App\Services\DeviceDetector;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    /**
     * Send password reset token to user's email.
     */
    public function forgotPassword(Request $request)
    {
        $ip = $request->ip();
        $email = strtolower(trim($request->input('email', '')));
        $throttleKey = 'forgot_password:' . $ip . '|' . $email;

        if (RateLimiter::tooManyAttempts($throttleKey, 3)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => "Too many reset requests. Please try again in {$seconds} seconds.",
                'retry_after' => $seconds,
            ], 429);
        }

        RateLimiter::hit($throttleKey, 60);

        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::where('email', $email)->first();

        if ($user) {
            // Invalidate old tokens for this email
            DB::table('password_reset_tokens')->where('email', $email)->delete();

            // Generate secure 64-char token
            $rawToken = Str::random(64);
            $hashedToken = Hash::make($rawToken);

            DB::table('password_reset_tokens')->insert([
                'email' => $email,
                'token' => $hashedToken,
                'created_at' => now(),
            ]);

            $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
            $resetUrl = $frontendUrl . '/reset-password?token=' . $rawToken . '&email=' . urlencode($email);

            // Log the reset URL for local testing & development
            Log::info("Password Reset Link for {$email}: {$resetUrl}");

            defer(function () use ($user, $resetUrl, $email) {
                try {
                    // Try sending email if configured
                    Mail::raw("Hello {$user->name},\n\nYou requested a password reset for your BlogX account. Click the link below to set a new password:\n\n{$resetUrl}\n\nThis link will expire in 60 minutes.\n\nIf you did not request this, please ignore this email.", function ($message) use ($user) {
                        $message->to($user->email)->subject('Reset Your BlogX Password');
                    });
                } catch (\Exception $e) {
                    Log::warning("Could not send reset email to {$email}: " . $e->getMessage());
                }
            });
        }

        // Always return a generic success message to prevent user enumeration attacks
        return response()->json([
            'message' => 'If an account exists with that email, we have sent password reset instructions.',
        ]);
    }

    /**
     * Reset the user's password with the given token.
     */
    public function resetPassword(Request $request)
    {
        $ip = $request->ip();
        $throttleKey = 'reset_password:' . $ip;

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => "Too many attempts. Please try again in {$seconds} seconds.",
                'retry_after' => $seconds,
            ], 429);
        }

        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => [
                'required',
                'confirmed',
                Password::min(8)
                    ->letters()
                    ->numbers(),
            ],
        ]);

        $email = strtolower(trim($validated['email']));

        $record = DB::table('password_reset_tokens')
            ->where('email', $email)
            ->first();

        if (!$record || !Hash::check($validated['token'], $record->token)) {
            RateLimiter::hit($throttleKey, 60);
            throw ValidationException::withMessages([
                'email' => ['This password reset token is invalid or has expired.'],
            ]);
        }

        // Check token expiration (60 minutes)
        if (now()->subMinutes(60)->greaterThan($record->created_at)) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            throw ValidationException::withMessages([
                'email' => ['This password reset token has expired. Please request a new one.'],
            ]);
        }

        $user = User::where('email', $email)->firstOrFail();

        $user->forceFill([
            'password' => Hash::make($validated['password']),
        ])->save();

        // Delete used token
        DB::table('password_reset_tokens')->where('email', $email)->delete();

        // Revoke all existing sessions & tokens for security
        $user->tokens()->delete();
        UserDevice::where('user_id', $user->id)->delete();

        // Auto-login user with fresh token
        $token = $user->createToken('auth-token')->plainTextToken;

        try {
            $userAgent = $request->userAgent();
            $detected = DeviceDetector::detect($userAgent);

            UserDevice::create([
                'user_id' => $user->id,
                'token_id' => explode('|', $token)[0] ?? null,
                'ip_address' => $ip,
                'user_agent' => $userAgent,
                'device_type' => $detected['device_type'],
                'browser' => $detected['browser'],
                'platform' => $detected['platform'],
                'last_active_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::warning('Failed to record device after password reset: ' . $e->getMessage());
        }

        RateLimiter::clear($throttleKey);

        return response()->json([
            'message' => 'Your password has been reset successfully.',
            'user' => $user->fresh(),
            'token' => $token,
        ]);
    }
}
