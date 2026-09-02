<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class NoteController extends Controller
{
    /**
     * Get active notes (within 24 hours).
     * Includes the current user's note (if any) and active notes from other users.
     */
    public function index(Request $request)
    {
        $currentUser = $request->user();
        $currentUserId = $currentUser ? $currentUser->id : null;

        $query = Note::active()
            ->with(['user' => function ($q) {
                $q->select('id', 'name', 'username', 'avatar', 'verified', 'equipped_badges');
            }])
            ->latest('updated_at');

        if ($currentUser) {
            $blockedIds = $currentUser->allBlockedUserIds();
            $followingIds = $currentUser->following()->pluck('following_id')->toArray();
            $allowedUserIds = array_diff(array_merge([$currentUser->id], $followingIds), $blockedIds);
            $query->whereIn('user_id', $allowedUserIds);
        }

        $notes = $query->get();

        // Separate current user's note from other users
        $myNote = null;
        $otherNotes = [];

        foreach ($notes as $note) {
            $formatted = $note->format($currentUserId);
            if ($currentUserId && $note->user_id === $currentUserId) {
                $myNote = $formatted;
            } else {
                $otherNotes[] = $formatted;
            }
        }

        return response()->json([
            'my_note' => $myNote,
            'notes' => $otherNotes,
        ]);
    }

    /**
     * Create or update note for the authenticated user.
     * Notes automatically expire after 24 hours.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'text' => ['required', 'string', 'max:60'],
            'emoji' => ['nullable', 'string', 'max:10'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Each user has 1 active note. If one exists, update it and reset 24h timer.
        $note = Note::updateOrCreate(
            ['user_id' => $user->id],
            [
                'text' => trim($request->text),
                'emoji' => $request->emoji ? trim($request->emoji) : null,
                'expires_at' => now()->addHours(24),
            ]
        );

        $note->load(['user' => function ($q) {
            $q->select('id', 'name', 'username', 'avatar', 'verified', 'equipped_badges');
        }]);

        return response()->json([
            'message' => 'Note shared successfully',
            'note' => $note->format($user->id),
        ], 201);
    }

    /**
     * Delete the authenticated user's active note.
     */
    public function destroy(Request $request)
    {
        $user = $request->user();

        Note::where('user_id', $user->id)->delete();

        return response()->json([
            'message' => 'Note deleted successfully',
        ]);
    }
}
