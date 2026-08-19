<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\BlogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BadgeController;
use App\Http\Controllers\Api\CommunityController;
use App\Http\Controllers\Api\EmailVerificationController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\TwoFactorController;
use App\Http\Controllers\Api\VerificationController;
use Illuminate\Support\Facades\Route;

// Guest Authentication Routes
Route::middleware('guest')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/auth/google/exchange', [AuthController::class, 'exchangeOAuthTicket']);
    Route::post('/2fa/verify-login', [TwoFactorController::class, 'verifyLogin']);
    Route::post('/forgot-password', [PasswordResetController::class, 'forgotPassword']);
    Route::post('/reset-password', [PasswordResetController::class, 'resetPassword']);
});

// Email verification callback (public or guest/auth)
Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
    ->name('verification.verify');

// Authenticated Routes
Route::middleware('auth:sanctum')->group(function () {
    // User Profile & Account
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/user/update', [AuthController::class, 'updateProfile']);
    Route::post('/user/change-password', [AuthController::class, 'changePassword']);
    Route::post('/user/delete', [AuthController::class, 'deleteAccount']);

    // Multi-Device & Session Management
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/logout-others', [AuthController::class, 'logoutOthers']);
    Route::post('/logout-all', [AuthController::class, 'logoutAll']);
    Route::get('/user/devices', [AuthController::class, 'devices']);
    Route::delete('/user/devices/{id}', [AuthController::class, 'revokeDevice']);

    // Email Verification Resend
    Route::post('/email/verification-notification', [EmailVerificationController::class, 'resend']);

    // Two-Factor Authentication (TOTP)
    Route::post('/2fa/enable', [TwoFactorController::class, 'enable']);
    Route::post('/2fa/confirm', [TwoFactorController::class, 'confirm']);
    Route::post('/2fa/disable', [TwoFactorController::class, 'disable']);
    Route::get('/2fa/recovery-codes', [TwoFactorController::class, 'getRecoveryCodes']);
    Route::post('/2fa/recovery-codes', [TwoFactorController::class, 'regenerateRecoveryCodes']);

    // Verification Requests & Badges (User)
    Route::post('/verification/request', [VerificationController::class, 'submitRequest']);
    Route::get('/verification/status', [VerificationController::class, 'getStatus']);
    Route::get('/badges', [BadgeController::class, 'index']);
    Route::post('/user/badges', [BadgeController::class, 'update']);

    // Admin Panel Management (Admin only)
    Route::get('/admin/verification-requests', [VerificationController::class, 'adminList']);
    Route::get('/admin/verification-requests/{id}/document', [VerificationController::class, 'adminDocument']);
    Route::post('/admin/verification-requests/{id}/approve', [VerificationController::class, 'adminApprove']);
    Route::post('/admin/verification-requests/{id}/reject', [VerificationController::class, 'adminReject']);
    Route::get('/admin/users', [AdminController::class, 'indexUsers']);
    Route::post('/admin/users/{id}/toggle-verify', [AdminController::class, 'toggleVerification']);
    Route::delete('/admin/users/{id}', [AdminController::class, 'deleteUser']);

    // Broadcasting Authentication (Sanctum)
    Broadcast::routes(['middleware' => ['auth:sanctum']]);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/preferences', [NotificationController::class, 'getPreferences']);
    Route::put('/notifications/preferences', [NotificationController::class, 'updatePreferences']);
    Route::get('/notifications/poll', [NotificationController::class, 'poll']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
    Route::delete('/notifications', [NotificationController::class, 'clearAll']);

    // Posts & Feed Actions
    Route::post('/posts', [PostController::class, 'store']);
    Route::post('/posts/{id}/update', [PostController::class, 'update']);
    Route::delete('/posts/{id}', [PostController::class, 'destroy']);
    Route::post('/posts/{id}/pin', [PostController::class, 'togglePin']);
    Route::get('/posts/scheduled', [PostController::class, 'scheduled']);
    Route::post('/posts/{id}/like', [PostController::class, 'toggleLike']);
    Route::post('/posts/{id}/repost', [PostController::class, 'toggleRepost']);
    Route::post('/posts/{id}/quote', [PostController::class, 'quote']);
    Route::post('/posts/{id}/share', [PostController::class, 'recordShare']);
    Route::post('/posts/{id}/comments', [PostController::class, 'storeComment']);
    Route::post('/posts/{id}/comments/{commentId}/like', [PostController::class, 'toggleCommentLike']);
    Route::post('/posts/{id}/bookmark', [PostController::class, 'toggleBookmark']);
    Route::get('/bookmarks', [PostController::class, 'bookmarks']);
    Route::get('/likes', [PostController::class, 'likedPosts']);
    Route::get('/mentions', [PostController::class, 'mentions']);
    Route::get('/following/posts', [PostController::class, 'followingFeed']);
    Route::get('/user/following', [ProfileController::class, 'myFollowingList']);
    Route::post('/users/{id}/follow', [ProfileController::class, 'toggleFollow']);

    // Communities (Auth)
    Route::post('/communities', [CommunityController::class, 'store']);
    Route::post('/communities/{id}', [CommunityController::class, 'update']);
    Route::delete('/communities/{id}', [CommunityController::class, 'destroy']);
    Route::post('/communities/{id}/join', [CommunityController::class, 'join']);
    Route::post('/communities/{id}/leave', [CommunityController::class, 'leave']);
    Route::get('/communities/{id}/join-requests', [CommunityController::class, 'joinRequests']);
    Route::post('/communities/{id}/join-requests/{userId}/approve', [CommunityController::class, 'approveJoinRequest']);
    Route::post('/communities/{id}/join-requests/{userId}/reject', [CommunityController::class, 'rejectJoinRequest']);

    // Blogs & Drafts
    Route::post('/blogs', [BlogController::class, 'store']);
    Route::post('/blogs/{id}', [BlogController::class, 'update']);
    Route::delete('/blogs/{id}', [BlogController::class, 'destroy']);
    Route::post('/blogs/{id}/like', [BlogController::class, 'toggleLike']);
    Route::post('/blogs/{id}/bookmark', [BlogController::class, 'toggleBookmark']);
    Route::get('/drafts', [BlogController::class, 'myDrafts']);
});

// Public routes — enriched when auth token is present
Route::get('/posts/preview-link', [PostController::class, 'previewLink']);
Route::get('/posts', [PostController::class, 'index']);
Route::get('/posts/{id}', [PostController::class, 'show']);
Route::post('/posts/{id}/share', [PostController::class, 'recordShare']);
Route::post('/posts/{id}/view', [PostController::class, 'recordImpression']);
Route::post('/posts/views/batch', [PostController::class, 'recordBatchImpressions']);

// Communities (Public)
Route::get('/communities', [CommunityController::class, 'index']);
Route::get('/communities/{slug}', [CommunityController::class, 'show']);
Route::get('/communities/{id}/members', [CommunityController::class, 'members']);
Route::get('/communities/{id}/posts', [CommunityController::class, 'posts']);
Route::get('/profile/{username}/communities', [CommunityController::class, 'userCommunities']);

Route::get('/profile/{username}', [ProfileController::class, 'show']);
Route::get('/profile/{username}/followers', [ProfileController::class, 'followersList']);
Route::get('/profile/{username}/following', [ProfileController::class, 'followingList']);
Route::get('/profile/{username}/blogs', [BlogController::class, 'userBlogs']);
Route::get('/profile/{username}/media', [ProfileController::class, 'media']);
Route::get('/profile/{username}/likes', [ProfileController::class, 'likes']);
Route::get('/users/suggestions', [ProfileController::class, 'suggestions']);

// Blogs Public
Route::get('/blogs', [BlogController::class, 'index']);
Route::get('/blogs/featured', [BlogController::class, 'featured']);
Route::get('/blogs/{slugOrId}', [BlogController::class, 'show']);

// Search, Hashtags & Mention suggestions (public)
Route::get('/search', [SearchController::class, 'search']);
Route::get('/hashtags/trending', [SearchController::class, 'trending']);
Route::get('/hashtags/suggest', [SearchController::class, 'suggest']);
Route::get('/hashtags/{tag}/posts', [SearchController::class, 'hashtagPosts']);
Route::get('/users/suggest', [SearchController::class, 'suggestUsers']);

