<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VerificationRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VerificationController extends Controller
{
    /**
     * Submit a new verification request (authenticated user).
     */
    public function submitRequest(Request $request)
    {
        $user = $request->user();

        if ($user->verified) {
            return response()->json([
                'message' => 'Your account is already verified.',
            ], 400);
        }

        // Check if there is already a pending request
        $existingPending = VerificationRequest::where('user_id', $user->id)
            ->where('status', 'pending')
            ->first();

        if ($existingPending) {
            return response()->json([
                'message' => 'You already have a pending verification request under review.',
                'request' => $existingPending,
            ], 400);
        }

        $validated = $request->validate([
            'category' => ['required', 'string', 'max:100'],
            'reason'   => ['required', 'string', 'max:2000'],
            'document' => ['nullable', 'file', 'max:10240', 'mimes:jpg,jpeg,png,webp,pdf'],
        ]);

        $documentPath = null;
        if ($request->hasFile('document')) {
            $documentPath = $request->file('document')->store('verification_docs', 'public');
        }

        $verificationRequest = VerificationRequest::create([
            'user_id'       => $user->id,
            'category'      => $validated['category'],
            'reason'        => $validated['reason'],
            'document_path' => $documentPath,
            'status'        => 'pending',
        ]);

        return response()->json([
            'message' => 'Verification request submitted successfully. It will be reviewed by our admin team.',
            'request' => $this->formatRequest($verificationRequest),
        ], 201);
    }

    /**
     * Get current user's verification status (authenticated user).
     */
    public function getStatus(Request $request)
    {
        $user = $request->user();

        $latestRequest = VerificationRequest::where('user_id', $user->id)
            ->latest()
            ->first();

        return response()->json([
            'is_verified'    => (bool) $user->verified,
            'is_admin'       => (bool) $user->is_admin,
            'latest_request' => $latestRequest ? $this->formatRequest($latestRequest) : null,
        ]);
    }

    /**
     * List all verification requests (Admin only).
     */
    public function adminList(Request $request)
    {
        $user = $request->user();

        if (!$user->is_admin) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $status = $request->get('status', 'all'); // all | pending | approved | rejected

        $query = VerificationRequest::with(['user', 'reviewer'])->latest();

        if ($status !== 'all' && in_array($status, ['pending', 'approved', 'rejected'])) {
            $query->where('status', $status);
        }

        $requests = $query->paginate(20);

        $requests->getCollection()->transform(function ($req) {
            return $this->formatRequest($req);
        });

        return response()->json($requests);
    }

    /**
     * Approve a verification request (Admin only).
     */
    public function adminApprove(Request $request, $id)
    {
        $admin = $request->user();

        if (!$admin->is_admin) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $verificationRequest = VerificationRequest::with('user')->find($id);

        if (!$verificationRequest) {
            return response()->json(['message' => 'Verification request not found.'], 404);
        }

        $verificationRequest->update([
            'status'      => 'approved',
            'admin_notes' => $request->input('admin_notes', 'Your verification request has been approved.'),
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ]);

        // Grant verification to the user
        $verificationRequest->user->update([
            'verified' => true,
        ]);

        return response()->json([
            'message' => "Account @{$verificationRequest->user->username} has been verified successfully.",
            'request' => $this->formatRequest($verificationRequest->fresh(['user', 'reviewer'])),
        ]);
    }

    /**
     * Reject a verification request (Admin only).
     */
    public function adminReject(Request $request, $id)
    {
        $admin = $request->user();

        if (!$admin->is_admin) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $verificationRequest = VerificationRequest::with('user')->find($id);

        if (!$verificationRequest) {
            return response()->json(['message' => 'Verification request not found.'], 404);
        }

        $verificationRequest->update([
            'status'      => 'rejected',
            'admin_notes' => $request->input('admin_notes', 'Your request did not meet our verification criteria at this time.'),
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'message' => "Verification request for @{$verificationRequest->user->username} was rejected.",
            'request' => $this->formatRequest($verificationRequest->fresh(['user', 'reviewer'])),
        ]);
    }

    /**
     * Format verification request data for API responses.
     */
    private function formatRequest(VerificationRequest $req): array
    {
        $docUrl = null;
        if ($req->document_path) {
            $docUrl = str_starts_with($req->document_path, 'http')
                ? $req->document_path
                : config('app.url') . '/storage/' . ltrim($req->document_path, '/');
        }

        $userAvatar = $req->user?->avatar;
        if ($userAvatar && !str_starts_with($userAvatar, 'http')) {
            $userAvatar = config('app.url') . $userAvatar;
        }

        return [
            'id'            => $req->id,
            'category'      => $req->category,
            'reason'        => $req->reason,
            'document_url'  => $docUrl,
            'status'        => $req->status,
            'admin_notes'   => $req->admin_notes,
            'created_at'    => $req->created_at,
            'reviewed_at'   => $req->reviewed_at,
            'user' => $req->user ? [
                'id'       => $req->user->id,
                'name'     => $req->user->name,
                'username' => $req->user->username,
                'avatar'   => $userAvatar,
                'verified' => (bool) $req->user->verified,
            ] : null,
            'reviewer' => $req->reviewer ? [
                'id'       => $req->reviewer->id,
                'name'     => $req->reviewer->name,
                'username' => $req->reviewer->username,
            ] : null,
        ];
    }
}
