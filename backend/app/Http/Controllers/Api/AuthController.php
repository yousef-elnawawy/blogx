<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthTicket;
use App\Models\User;
use App\Models\UserDevice;
use App\Services\DeviceDetector;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    /**
     * Register a new user account with rate limiting and password policy.
     */
    public function register(Request $request)
    {
        $ip = $request->ip();
        $throttleKey = 'register:' . $ip;

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => "Too many registration attempts. Please try again in {$seconds} seconds.",
                'retry_after' => $seconds,
            ], 429);
        }

        RateLimiter::hit($throttleKey, 60);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'username' => [
                'required',
                'string',
                'min:3',
                'max:30',
                'regex:/^[a-zA-Z0-9_]+$/',
                'unique:users,username',
            ],
            'email' => [
                'required',
                'email',
                'max:255',
                'unique:users,email',
            ],
            'password' => [
                'required',
                'confirmed',
                Password::min(8)
                    ->letters()
                    ->numbers(),
            ],
        ]);

        $user = User::create([
            'name' => trim($validated['name']),
            'username' => strtolower(trim($validated['username'])),
            'email' => strtolower(trim($validated['email'])),
            'password' => Hash::make($validated['password']),
        ]);

        // Fire registered event in the background without blocking the HTTP response
        defer(function () use ($user) {
            try {
                event(new Registered($user));
            } catch (\Throwable $e) {
                Log::warning('Async email verification failed: ' . $e->getMessage());
            }
        });

        // Create initial access token
        $token = $user->createToken('auth-token')->plainTextToken;

        // Register device session
        $this->recordDeviceSession($user, $token, $request);

        RateLimiter::clear($throttleKey);

        return response()->json([
            'message' => 'Account created successfully',
            'user' => $user->fresh(),
            'token' => $token,
            'requires_email_verification' => true,
        ], 201);
    }

    /**
     * Authenticate user credentials with brute-force rate limiting and 2FA check.
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'login' => ['required', 'string'],
            'password' => ['required', 'string'],
            'remember' => ['nullable', 'boolean'],
        ]);

        $loginInput = strtolower(trim($validated['login']));
        $ip = $request->ip();
        $throttleKey = 'login:' . $ip . '|' . $loginInput;

        // Strict 5-attempt rate limiter with lockout
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => "Too many failed login attempts. Account locked for security. Please try again in {$seconds} seconds.",
                'retry_after' => $seconds,
            ], 429);
        }

        $loginField = filter_var($loginInput, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';

        $credentials = [
            $loginField => $loginInput,
            'password' => $validated['password'],
        ];

        if (!Auth::validate($credentials)) {
            RateLimiter::hit($throttleKey, 60);
            $attemptsLeft = RateLimiter::remaining($throttleKey, 5);

            throw ValidationException::withMessages([
                'login' => [
                    $attemptsLeft > 0
                        ? "Invalid credentials. You have {$attemptsLeft} attempt(s) remaining."
                        : "Invalid credentials. Too many attempts, please wait."
                ],
            ]);
        }

        $user = User::where($loginField, $loginInput)->firstOrFail();

        // 2FA Challenge Check
        if ($user->hasTwoFactorEnabled()) {
            // Generate a 5-minute one-time 2FA challenge ticket
            $ticket = AuthTicket::create([
                'user_id' => $user->id,
                'ticket' => Str::random(64),
                'type' => '2fa',
                'payload' => [
                    'remember' => $request->boolean('remember'),
                ],
                'expires_at' => now()->addMinutes(5),
            ]);

            return response()->json([
                'requires_2fa' => true,
                'ticket' => $ticket->ticket,
                'message' => 'Two-factor authentication code required.',
            ]);
        }

        // Login succeeded — clear rate limiter
        RateLimiter::clear($throttleKey);

        // Issue token
        $token = $user->createToken('auth-token')->plainTextToken;

        // Register device
        $this->recordDeviceSession($user, $token, $request);

        return response()->json([
            'message' => 'Logged in successfully',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Log out current session/device.
     */
    public function logout(Request $request)
    {
        $user = $request->user();
        $currentToken = $user->currentAccessToken();

        if ($currentToken) {
            // Remove device record for this token
            UserDevice::where('user_id', $user->id)
                ->where('token_id', (string) $currentToken->id)
                ->delete();

            $currentToken->delete();
        }

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Log out all sessions across all devices.
     */
    public function logoutAll(Request $request)
    {
        $user = $request->user();
        $user->tokens()->delete();
        UserDevice::where('user_id', $user->id)->delete();

        return response()->json([
            'message' => 'All sessions on all devices logged out successfully',
        ]);
    }

    /**
     * Log out all other sessions except current.
     */
    public function logoutOthers(Request $request)
    {
        $user = $request->user();
        $currentToken = $user->currentAccessToken();

        if ($currentToken) {
            $user->tokens()->where('id', '!=', $currentToken->id)->delete();
            UserDevice::where('user_id', $user->id)
                ->where('token_id', '!=', (string) $currentToken->id)
                ->delete();
        }

        return response()->json([
            'message' => 'All other sessions logged out successfully',
        ]);
    }

    /**
     * Get list of active sessions / devices.
     */
    public function devices(Request $request)
    {
        $user = $request->user();
        $currentTokenId = (string) optional($user->currentAccessToken())->id;

        $devices = UserDevice::where('user_id', $user->id)
            ->orderByDesc('last_active_at')
            ->get()
            ->map(function ($device) use ($currentTokenId) {
                return [
                    'id' => $device->id,
                    'device_type' => $device->device_type,
                    'browser' => $device->browser,
                    'platform' => $device->platform,
                    'ip_address' => $device->ip_address,
                    'is_current' => $device->token_id === $currentTokenId,
                    'last_active_at' => $device->last_active_at ? $device->last_active_at->diffForHumans() : 'Just now',
                    'created_at' => $device->created_at ? $device->created_at->format('M d, Y') : null,
                ];
            });

        return response()->json([
            'devices' => $devices,
        ]);
    }

    /**
     * Revoke a specific device session.
     */
    public function revokeDevice(Request $request, $id)
    {
        $user = $request->user();
        $device = UserDevice::where('user_id', $user->id)->where('id', $id)->firstOrFail();

        if ($device->token_id) {
            $user->tokens()->where('id', $device->token_id)->delete();
        }

        $device->delete();

        return response()->json([
            'message' => 'Device session terminated successfully',
        ]);
    }

    /**
     * Get the authenticated user with fresh status.
     */
    public function user(Request $request)
    {
        return response()->json([
            'user' => $request->user(),
        ]);
    }

    /**
     * Change user password securely.
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => [
                'required',
                'confirmed',
                Password::min(8)
                    ->letters()
                    ->numbers(),
            ],
        ]);

        if (!Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password does not match our records.'],
            ]);
        }

        $user->forceFill([
            'password' => Hash::make($validated['password']),
        ])->save();

        // For security, revoke all other active sessions
        $currentToken = $user->currentAccessToken();
        if ($currentToken) {
            $user->tokens()->where('id', '!=', $currentToken->id)->delete();
            UserDevice::where('user_id', $user->id)
                ->where('token_id', '!=', (string) $currentToken->id)
                ->delete();
        }

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    }

    /**
     * Update user profile data.
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'username' => [
                'sometimes',
                'string',
                'min:3',
                'max:30',
                'regex:/^[a-zA-Z0-9_]+$/',
                'unique:users,username,' . $user->id,
            ],
            'email' => [
                'sometimes',
                'email',
                'max:255',
                'unique:users,email,' . $user->id,
            ],
            'bio' => ['nullable', 'string', 'max:500'],
            'location' => ['nullable', 'string', 'max:100'],
            'website' => ['nullable', 'string', 'max:255'],
            'avatar' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:10240'], // Up to 10MB
            'cover' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:10240'], // Up to 10MB
            'remove_avatar' => ['nullable', 'boolean'],
            'remove_cover' => ['nullable', 'boolean'],
            'social_links' => ['nullable'],
        ]);

        // Handle Avatar removal or upload
        if ($request->boolean('remove_avatar')) {
            if ($user->avatar && str_contains($user->avatar, '/storage/')) {
                $oldPath = str_replace('/storage/', '', $user->avatar);
                Storage::disk('public')->delete($oldPath);
            }
            $validated['avatar'] = null;
        } elseif ($request->hasFile('avatar')) {
            if ($user->avatar && str_contains($user->avatar, '/storage/')) {
                $oldPath = str_replace('/storage/', '', $user->avatar);
                Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('avatar')->store('avatars', 'public');
            $validated['avatar'] = '/storage/' . $path;
        }

        // Handle Cover removal or upload
        if ($request->boolean('remove_cover')) {
            if ($user->cover && str_contains($user->cover, '/storage/')) {
                $oldPath = str_replace('/storage/', '', $user->cover);
                Storage::disk('public')->delete($oldPath);
            }
            $validated['cover'] = null;
        } elseif ($request->hasFile('cover')) {
            if ($user->cover && str_contains($user->cover, '/storage/')) {
                $oldPath = str_replace('/storage/', '', $user->cover);
                Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('cover')->store('covers', 'public');
            $validated['cover'] = '/storage/' . $path;
        }

        // Handle and sanitize social links (prevent XSS / javascript: protocol)
        if ($request->has('social_links')) {
            $rawSocial = $request->input('social_links');
            $socialArray = [];

            if (is_string($rawSocial)) {
                $decoded = json_decode($rawSocial, true);
                $socialArray = is_array($decoded) ? $decoded : [];
            } elseif (is_array($rawSocial)) {
                $socialArray = $rawSocial;
            }

            $sanitizedSocial = [];
            foreach ($socialArray as $key => $value) {
                if (!is_string($key) || !is_string($value)) {
                    continue;
                }
                $cleanKey = substr(preg_replace('/[^a-zA-Z0-9_-]/', '', $key), 0, 50);
                $cleanVal = trim($value);

                // Reject javascript: or data: pseudo-protocols
                if (preg_match('/^(javascript|data|vbscript):/i', $cleanVal)) {
                    continue;
                }

                if ($cleanKey !== '' && $cleanVal !== '') {
                    $sanitizedSocial[$cleanKey] = substr($cleanVal, 0, 255);
                }
            }

            $validated['social_links'] = $sanitizedSocial;
        }

        // Sanitize website link
        if (!empty($validated['website'])) {
            $web = trim($validated['website']);
            if (preg_match('/^(javascript|data|vbscript):/i', $web)) {
                $validated['website'] = null;
            } elseif (!preg_match('/^https?:\/\//i', $web)) {
                $validated['website'] = 'https://' . $web;
            }
        }

        if (isset($validated['username'])) {
            $validated['username'] = strtolower(trim($validated['username']));
        }

        $emailChanged = false;
        if (isset($validated['email'])) {
            $newEmail = strtolower(trim($validated['email']));
            if ($newEmail !== $user->email) {
                $validated['email'] = $newEmail;
                $validated['email_verified_at'] = null;
                $emailChanged = true;
            }
        }

        unset($validated['remove_avatar'], $validated['remove_cover']);

        $user->update($validated);

        if ($emailChanged) {
            defer(function () use ($user) {
                try {
                    $user->sendEmailVerificationNotification();
                } catch (\Throwable $e) {
                    Log::warning("Could not send email verification to {$user->email}: " . $e->getMessage());
                }
            });
        }

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user->fresh(),
            'email_verification_sent' => $emailChanged,
        ]);
    }

    /**
     * Delete the authenticated user's account and all associated data.
     */
    public function deleteAccount(Request $request)
    {
        $request->validate([
            'password' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (!Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Incorrect password.'],
            ]);
        }

        if ($user->avatar && str_contains($user->avatar, '/storage/')) {
            $avatarPath = str_replace('/storage/', '', $user->avatar);
            Storage::disk('public')->delete($avatarPath);
        }

        foreach ($user->posts as $post) {
            foreach ($post->images as $img) {
                Storage::disk('public')->delete($img->image_path);
            }
        }

        $user->tokens()->delete();
        UserDevice::where('user_id', $user->id)->delete();
        $user->delete();

        return response()->json([
            'message' => 'Account and all associated data deleted successfully.',
        ]);
    }

    /**
     * Redirect to Google OAuth provider.
     */
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->stateless()->redirect();
    }

    /**
     * Handle Google OAuth callback securely using one-time exchange ticket.
     * Prevents raw token leakage in URLs, browser history, or proxy logs.
     */
    public function handleGoogleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();

            $email = strtolower(trim($googleUser->getEmail()));
            $googleId = $googleUser->getId();

            $user = User::where('google_id', $googleId)
                ->orWhere('email', $email)
                ->first();

            if ($user) {
                if (!$user->google_id) {
                    $user->google_id = $googleId;
                }
                if (!$user->avatar && $googleUser->getAvatar()) {
                    $user->avatar = $googleUser->getAvatar();
                }
                if (!$user->email_verified_at) {
                    $user->email_verified_at = now();
                }
                $user->save();
            } else {
                $rawName = $googleUser->getNickname() ?? explode('@', $email)[0];
                $baseUsername = strtolower(preg_replace('/[^a-zA-Z0-9_]/', '', $rawName));
                if (strlen($baseUsername) < 3) {
                    $baseUsername = 'user_' . strtolower(Str::random(5));
                }

                $username = $baseUsername;
                $counter = 1;
                while (User::where('username', $username)->exists()) {
                    $username = $baseUsername . '_' . $counter++;
                }

                $user = User::create([
                    'name' => $googleUser->getName() ?? $googleUser->getNickname() ?? 'Google User',
                    'username' => $username,
                    'email' => $email,
                    'password' => Hash::make(Str::random(32)),
                    'google_id' => $googleId,
                    'avatar' => $googleUser->getAvatar(),
                    'email_verified_at' => now(),
                ]);
            }

            // Create a short-lived (60s) single-use exchange ticket
            $ticket = AuthTicket::create([
                'user_id' => $user->id,
                'ticket' => Str::random(64),
                'type' => 'oauth',
                'expires_at' => now()->addSeconds(60),
            ]);

            $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
            // Safe redirect: only a temporary single-use code is passed, not the persistent auth token!
            return redirect($frontendUrl . '/auth/callback?ticket=' . $ticket->ticket);

        } catch (\Exception $e) {
            Log::error('Google Auth Error: ' . $e->getMessage());
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
            return redirect($frontendUrl . '/login?error=google_failed');
        }
    }

    /**
     * Exchange a one-time OAuth ticket for authenticated session & token.
     */
    public function exchangeOAuthTicket(Request $request)
    {
        $validated = $request->validate([
            'ticket' => ['required', 'string'],
        ]);

        $ticket = AuthTicket::where('ticket', $validated['ticket'])
            ->where('type', 'oauth')
            ->where('expires_at', '>', now())
            ->first();

        if (!$ticket) {
            return response()->json([
                'message' => 'Invalid or expired exchange ticket. Please log in again.',
            ], 401);
        }

        $user = $ticket->user;

        // Invalidate single-use ticket immediately
        $ticket->delete();

        // Create token
        $token = $user->createToken('auth-token')->plainTextToken;

        // Register device
        $this->recordDeviceSession($user, $token, $request);

        return response()->json([
            'message' => 'Authenticated successfully',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Helper to record user device and browser information.
     */
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
            Log::warning('Failed to record device session: ' . $e->getMessage());
        }
    }
}
