<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class EmailVerificationController extends Controller
{
    /**
     * Mark the authenticated user's email address as verified.
     */
    public function verify(Request $request, $id, $hash)
    {
        $user = User::findOrFail($id);
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');

        if (!hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            if ($request->wantsJson()) {
                throw ValidationException::withMessages([
                    'email' => ['Invalid verification link or hash.'],
                ]);
            }
            return redirect($frontendUrl . '/verify-email?status=invalid');
        }

        if (!$user->hasVerifiedEmail()) {
            if ($user->markEmailAsVerified()) {
                event(new Verified($user));
            }
        }

        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'Email verified successfully! Welcome to BlogX.',
                'verified' => true,
                'user' => $user->fresh(),
            ]);
        }

        return redirect($frontendUrl . '/verify-email?status=success');
    }

    /**
     * Resend the email verification notification.
     */
    public function resend(Request $request)
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email is already verified.',
                'verified' => true,
            ]);
        }

        $throttleKey = 'resend_verification:' . $user->id;

        if (RateLimiter::tooManyAttempts($throttleKey, 2)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => "Please wait {$seconds} seconds before requesting another email.",
                'retry_after' => $seconds,
            ], 429);
        }

        RateLimiter::hit($throttleKey, 60);

        defer(function () use ($user) {
            try {
                $user->sendEmailVerificationNotification();
            } catch (\Exception $e) {
                Log::warning('Email verification send failed: ' . $e->getMessage());
            }
        });

        return response()->json([
            'message' => 'A fresh verification link has been sent to your email address.',
        ]);
    }
}
