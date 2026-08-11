<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthTicket;
use App\Models\User;
use App\Models\UserDevice;
use App\Services\DeviceDetector;
use App\Services\TotpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class TwoFactorController extends Controller
{
    /**
     * Start enabling 2FA: generates secret and QR code URI.
     */
    public function enable(Request $request)
    {
        $user = $request->user();

        $secret = $user->generateTwoFactorSecret();
        $appName = config('app.name', 'BlogX');
        $qrUri = TotpService::getOtpAuthUrl($appName, $user->email, $secret);

        return response()->json([
            'secret' => $secret,
            'qr_uri' => $qrUri,
        ]);
    }

    /**
     * Confirm 2FA with 6-digit code and generate recovery codes.
     */
    public function confirm(Request $request)
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = $request->user();

        if (!$user->verifyTwoFactorCode($request->code)) {
            throw ValidationException::withMessages([
                'code' => ['The provided two-factor authentication code is invalid.'],
            ]);
        }

        $user->forceFill([
            'two_factor_confirmed_at' => now(),
        ])->save();

        $recoveryCodes = $user->generateRecoveryCodes();

        return response()->json([
            'message' => 'Two-Factor Authentication enabled successfully.',
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    /**
     * Disable 2FA after password confirmation.
     */
    public function disable(Request $request)
    {
        $request->validate([
            'password' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (!Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['The provided password does not match our records.'],
            ]);
        }

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        return response()->json([
            'message' => 'Two-Factor Authentication disabled successfully.',
        ]);
    }

    /**
     * Verify 2FA challenge code or recovery code during login.
     */
    public function verifyLogin(Request $request)
    {
        $ip = $request->ip();
        $throttleKey = '2fa_verify:' . $ip;

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => "Too many verification attempts. Please try again in {$seconds} seconds.",
                'retry_after' => $seconds,
            ], 429);
        }

        $validated = $request->validate([
            'ticket' => ['required', 'string'],
            'code' => ['nullable', 'string'],
            'recovery_code' => ['nullable', 'string'],
        ]);

        if (empty($validated['code']) && empty($validated['recovery_code'])) {
            throw ValidationException::withMessages([
                'code' => ['Please enter either a 2FA code or a recovery code.'],
            ]);
        }

        $ticket = AuthTicket::where('ticket', $validated['ticket'])
            ->where('type', '2fa')
            ->where('expires_at', '>', now())
            ->first();

        if (!$ticket) {
            return response()->json([
                'message' => 'Your authentication session expired. Please log in again.',
            ], 401);
        }

        $user = $ticket->user;
        $verified = false;

        if (!empty($validated['code'])) {
            $verified = $user->verifyTwoFactorCode($validated['code']);
        } elseif (!empty($validated['recovery_code'])) {
            $verified = $user->verifyAndConsumeRecoveryCode($validated['recovery_code']);
        }

        if (!$verified) {
            RateLimiter::hit($throttleKey, 60);
            $remaining = RateLimiter::remaining($throttleKey, 5);

            throw ValidationException::withMessages([
                'code' => [
                    $remaining > 0
                        ? "Invalid authentication code. {$remaining} attempt(s) remaining."
                        : "Invalid authentication code. Too many attempts, please wait."
                ],
            ]);
        }

        RateLimiter::clear($throttleKey);

        // Delete ticket immediately
        $ticket->delete();

        // Create token
        $token = $user->createToken('auth-token')->plainTextToken;

        // Record device
        $this->recordDeviceSession($user, $token, $request);

        return response()->json([
            'message' => 'Logged in successfully',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Get recovery codes.
     */
    public function getRecoveryCodes(Request $request)
    {
        $request->validate([
            'password' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (!Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['The provided password does not match our records.'],
            ]);
        }

        return response()->json([
            'recovery_codes' => $user->getRecoveryCodes(),
        ]);
    }

    /**
     * Regenerate recovery codes.
     */
    public function regenerateRecoveryCodes(Request $request)
    {
        $request->validate([
            'password' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (!Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['The provided password does not match our records.'],
            ]);
        }

        $newCodes = $user->generateRecoveryCodes();

        return response()->json([
            'recovery_codes' => $newCodes,
            'message' => 'New recovery codes generated successfully.',
        ]);
    }

    private function recordDeviceSession(User $user, string $plainTextToken, Request $request): void
    {
        try {
            $tokenId = explode('|', $plainTextToken)[0] ?? null;
            $userAgent = $request->userAgent();
            $ip = $request->ip();
            $detected = DeviceDetector::detect($userAgent);

            UserDevice::create([
                'user_id' => $user->id,
                'token_id' => $tokenId,
                'ip_address' => $ip,
                'user_agent' => $userAgent,
                'device_type' => $detected['device_type'],
                'browser' => $detected['browser'],
                'platform' => $detected['platform'],
                'last_active_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::warning('Failed to record device session in 2FA: ' . $e->getMessage());
        }
    }
}
