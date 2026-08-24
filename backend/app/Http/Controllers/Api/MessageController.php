<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageDeleted;
use App\Events\MessageReactionUpdated;
use App\Events\MessageSeen;
use App\Events\NewMessage;
use App\Events\UserTyping;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MessageController extends Controller
{
    /**
     * Get all conversations for the authenticated user.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $conversations = Conversation::forUser($user->id)
            ->with(['userOne', 'userTwo', 'latestMessage.sender'])
            ->orderByRaw("CASE WHEN (user_one_id = {$user->id} AND user_one_pinned = 1) OR (user_two_id = {$user->id} AND user_two_pinned = 1) THEN 1 ELSE 0 END DESC")
            ->orderByDesc('last_message_at')
            ->orderByDesc('updated_at')
            ->get();

        $formatted = $conversations->map(fn($c) => $c->format($user->id));

        $totalUnread = Message::where('recipient_id', $user->id)
            ->where('is_seen', false)
            ->count();

        return response()->json([
            'conversations' => $formatted,
            'total_unread' => $totalUnread,
        ]);
    }

    /**
     * Get a specific conversation and its messages.
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();

        $conversation = Conversation::with(['userOne', 'userTwo'])->find($id);

        if (!$conversation) {
            return response()->json(['message' => 'المحادثة غير موجودة'], 404);
        }

        // Strict Authorization: Must be participant
        if ((int) $conversation->user_one_id !== (int) $user->id && (int) $conversation->user_two_id !== (int) $user->id) {
            return response()->json(['message' => 'غير مصرح لك بالوصول إلى هذه المحادثة.'], 403);
        }

        $otherUser = $conversation->getOtherUser($user->id);
        $isFollowing = $otherUser ? $user->isFollowing($otherUser) : false;

        // Auto mark unread messages for current user as read
        $unreadMessages = $conversation->messages()
            ->where('recipient_id', $user->id)
            ->where('is_seen', false)
            ->get();

        if ($unreadMessages->isNotEmpty()) {
            $conversation->messages()
                ->where('recipient_id', $user->id)
                ->where('is_seen', false)
                ->update([
                    'is_seen' => true,
                    'seen_at' => now(),
                ]);

            if ($otherUser) {
                broadcast(new MessageSeen($conversation->id, $user->id, $otherUser->id))->toOthers();
            }
        }

        $limit = min((int) $request->query('limit', 30), 50);
        $beforeId = $request->query('before_id');

        $msgQuery = Message::where('conversation_id', $conversation->id)
            ->with(['sender', 'replyTo.sender']);

        if ($beforeId && is_numeric($beforeId)) {
            $msgQuery->where('id', '<', (int) $beforeId);
        }

        $rawMessages = $msgQuery->orderBy('id', 'desc')
            ->limit($limit + 1)
            ->get();

        $hasMore = $rawMessages->count() > $limit;
        $pagedMessages = $rawMessages->take($limit)->reverse()->values();

        $messages = $pagedMessages->map(fn($m) => $m->format($user->id));

        return response()->json([
            'conversation' => $conversation->format($user->id),
            'messages' => $messages,
            'has_more' => $hasMore,
            'is_following' => $isFollowing,
        ]);
    }

    /**
     * Start or get an existing conversation with a user.
     * Enforces the rule: Sender MUST be following the recipient!
     */
    public function start(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'recipient_id' => 'required_without:username|integer|exists:users,id',
            'username' => 'required_without:recipient_id|string|exists:users,username',
        ]);

        if ($request->filled('recipient_id')) {
            $recipient = User::find($request->recipient_id);
        } else {
            $recipient = User::where('username', $request->username)->first();
        }

        if (!$recipient) {
            return response()->json(['message' => 'المستخدم غير موجود.'], 404);
        }

        if ($recipient->id === $user->id) {
            return response()->json(['message' => 'لا يمكنك مراسلة نفسك.'], 422);
        }

        // STRICT RULE: Must be following recipient to message them
        if (!$user->isFollowing($recipient)) {
            return response()->json([
                'message' => 'يجب أن تتابع هذا المستخدم لتتمكن من مراسلته.',
                'requires_follow' => true,
                'user' => [
                    'id' => $recipient->id,
                    'name' => $recipient->name,
                    'username' => $recipient->username,
                ],
            ], 403);
        }

        $conversation = Conversation::findOrCreateBetween($user->id, $recipient->id);

        return response()->json([
            'conversation' => $conversation->format($user->id),
        ]);
    }

    /**
     * Send a new message in a conversation.
     * Enforces strict authorization, encrypted storage, following rule, and reply support.
     */
    public function sendMessage(Request $request, $id)
    {
        $user = $request->user();

        $conversation = Conversation::with(['userOne', 'userTwo'])->find($id);

        if (!$conversation) {
            return response()->json(['message' => 'المحادثة غير موجودة.'], 404);
        }

        // Strict Authorization: Must be participant
        if ((int) $conversation->user_one_id !== (int) $user->id && (int) $conversation->user_two_id !== (int) $user->id) {
            return response()->json(['message' => 'غير مصرح لك بالإرسال في هذه المحادثة.'], 403);
        }

        $recipient = $conversation->getOtherUser($user->id);
        if (!$recipient) {
            return response()->json(['message' => 'المستلم غير موجود.'], 404);
        }

        // STRICT RULE: Must be following recipient to message them
        if (!$user->isFollowing($recipient)) {
            return response()->json([
                'message' => 'يجب أن تتابع هذا المستخدم لتتمكن من مراسلته.',
                'requires_follow' => true,
            ], 403);
        }

        $request->validate([
            'text' => 'nullable|string|max:20000',
            'reply_to_id' => 'nullable|integer|exists:messages,id',
            'images' => 'nullable|array',
            'images.*' => 'nullable|image|max:51200',
            'audio' => 'nullable|file|max:1048576', // Up to 1GB audio
            'audio_duration' => 'nullable',
            'shared_data' => 'nullable',
        ]);

        $text = trim($request->input('text', ''));
        $replyToId = $request->input('reply_to_id');
        $audioDuration = $request->input('audio_duration') ? (int) $request->input('audio_duration') : null;

        // Parse shared_data if string
        $sharedData = $request->input('shared_data');
        if (is_string($sharedData)) {
            $sharedData = json_decode($sharedData, true);
        }

        // Validate reply_to_id belongs to the same conversation
        if ($replyToId) {
            $parent = Message::where('id', $replyToId)->where('conversation_id', $conversation->id)->first();
            if (!$parent) {
                $replyToId = null;
            }
        }

        $uploadedImagePaths = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                if ($image->isValid()) {
                    $path = $image->store('messages', 'public');
                    $uploadedImagePaths[] = '/storage/' . $path;
                }
            }
        }

        $uploadedAudioPath = null;
        if ($request->hasFile('audio') && $request->file('audio')->isValid()) {
            $audioFile = $request->file('audio');
            $ext = $audioFile->getClientOriginalExtension() ?: 'webm';
            $fileName = 'voice_' . uniqid() . '_' . time() . '.' . $ext;
            $path = $audioFile->storeAs('chat_audio', $fileName, 'public');
            $uploadedAudioPath = '/storage/' . $path;
        }

        if (empty($text) && empty($uploadedImagePaths) && empty($uploadedAudioPath) && empty($sharedData)) {
            return response()->json(['message' => 'يرجى كتابة نص أو إرفاق ملف أو تسجيل صوتي.'], 422);
        }

        // Create Message with automatic AES-256 encrypted text
        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'recipient_id' => $recipient->id,
            'reply_to_id' => $replyToId,
            'text' => $text,
            'images' => $uploadedImagePaths,
            'audio_url' => $uploadedAudioPath,
            'audio_duration' => $audioDuration,
            'shared_data' => $sharedData,
            'is_seen' => false,
        ]);

        $lastText = !empty($text)
            ? $text
            : (!empty($uploadedAudioPath)
                ? '🎙️ Voice message'
                : (!empty($sharedData)
                    ? '🔗 Shared ' . ($sharedData['type'] ?? 'content')
                    : (count($uploadedImagePaths) > 0 ? '📷 Image' : '')));

        $conversation->update([
            'last_message_text' => $lastText,
            'last_message_at' => now(),
        ]);

        $message->load(['sender', 'replyTo.sender']);

        // Broadcast event in real-time via Laravel Reverb
        broadcast(new NewMessage($message, $conversation))->toOthers();

        return response()->json([
            'message' => $message->format($user->id),
            'conversation' => $conversation->format($user->id),
        ], 201);
    }

    /**
     * Broadcast typing status to the other user in the conversation.
     */
    public function typing(Request $request, $id)
    {
        $user = $request->user();

        $conversation = Conversation::find($id);
        if (!$conversation) {
            return response()->json(['message' => 'المحادثة غير موجودة.'], 404);
        }

        if ((int) $conversation->user_one_id !== (int) $user->id && (int) $conversation->user_two_id !== (int) $user->id) {
            return response()->json(['message' => 'غير مصرح.'], 403);
        }

        $isTyping = filter_var($request->input('is_typing', true), FILTER_VALIDATE_BOOLEAN);

        broadcast(new UserTyping((int) $conversation->id, (int) $user->id, $user->name, $isTyping))->toOthers();

        return response()->json(['success' => true]);
    }

    /**
     * Toggle reaction (emoji) on a specific message.
     */
    public function toggleReaction(Request $request, $id, $messageId)
    {
        $user = $request->user();

        $conversation = Conversation::find($id);
        if (!$conversation) {
            return response()->json(['message' => 'المحادثة غير موجودة.'], 404);
        }

        if ((int) $conversation->user_one_id !== (int) $user->id && (int) $conversation->user_two_id !== (int) $user->id) {
            return response()->json(['message' => 'غير مصرح.'], 403);
        }

        $message = Message::where('id', $messageId)->where('conversation_id', $conversation->id)->first();
        if (!$message) {
            return response()->json(['message' => 'الرسالة غير موجودة.'], 404);
        }

        $request->validate([
            'emoji' => 'required|string|max:10',
        ]);

        $emoji = trim($request->input('emoji'));
        $reactions = $message->reactions ?? [];

        // Check if user has already reacted with this exact emoji
        $existingIndex = null;
        foreach ($reactions as $idx => $r) {
            if ((int) ($r['user_id'] ?? 0) === (int) $user->id && ($r['emoji'] ?? '') === $emoji) {
                $existingIndex = $idx;
                break;
            }
        }

        if ($existingIndex !== null) {
            // Toggle off (remove reaction)
            array_splice($reactions, $existingIndex, 1);
        } else {
            // Remove any other prior reaction by this user or add new
            $reactions = array_values(array_filter($reactions, fn($r) => (int) ($r['user_id'] ?? 0) !== (int) $user->id));
            $reactions[] = [
                'emoji' => $emoji,
                'user_id' => $user->id,
            ];
        }

        $message->update(['reactions' => $reactions]);

        broadcast(new MessageReactionUpdated($message, $user->id))->toOthers();

        return response()->json([
            'message' => $message->format($user->id),
        ]);
    }

    /**
     * Mark all messages in a conversation as read.
     */
    public function markAsRead(Request $request, $id)
    {
        $user = $request->user();

        $conversation = Conversation::find($id);
        if (!$conversation) {
            return response()->json(['message' => 'المحادثة غير موجودة.'], 404);
        }

        if ((int) $conversation->user_one_id !== (int) $user->id && (int) $conversation->user_two_id !== (int) $user->id) {
            return response()->json(['message' => 'غير مصرح.'], 403);
        }

        $otherUser = $conversation->getOtherUser($user->id);

        $affected = $conversation->messages()
            ->where('recipient_id', $user->id)
            ->where('is_seen', false)
            ->update([
                'is_seen' => true,
                'seen_at' => now(),
            ]);

        if ($affected > 0 && $otherUser) {
            broadcast(new MessageSeen($conversation->id, $user->id, $otherUser->id))->toOthers();
        }

        return response()->json([
            'success' => true,
            'marked_count' => $affected,
        ]);
    }

    /**
     * Get total unread messages count for current user.
     */
    public function unreadCount(Request $request)
    {
        $user = $request->user();

        $count = Message::where('recipient_id', $user->id)
            ->where('is_seen', false)
            ->count();

        return response()->json([
            'unread_count' => $count,
        ]);
    }

    /**
     * Delete a conversation.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        $conversation = Conversation::find($id);
        if (!$conversation) {
            return response()->json(['message' => 'المحادثة غير موجودة.'], 404);
        }

        if ((int) $conversation->user_one_id !== (int) $user->id && (int) $conversation->user_two_id !== (int) $user->id) {
            return response()->json(['message' => 'غير مصرح.'], 403);
        }

        // Delete associated messages
        $conversation->messages()->delete();
        $conversation->delete();

        return response()->json([
            'message' => 'تم حذف المحادثة بنجاح.',
        ]);
    }

    /**
     * Pin or unpin a conversation for the current user.
     */
    public function togglePin(Request $request, $id)
    {
        $user = $request->user();

        $conversation = Conversation::find($id);
        if (!$conversation) {
            return response()->json(['message' => 'المحادثة غير موجودة.'], 404);
        }

        if ((int) $conversation->user_one_id !== (int) $user->id && (int) $conversation->user_two_id !== (int) $user->id) {
            return response()->json(['message' => 'غير مصرح.'], 403);
        }

        $isPinned = $conversation->togglePinFor($user->id);

        return response()->json([
            'success' => true,
            'is_pinned' => $isPinned,
            'conversation' => $conversation->format($user->id),
        ]);
    }

    /**
     * Delete a single message (only sender allowed).
     */
    public function deleteMessage(Request $request, $conversationId, $messageId)
    {
        $user = $request->user();

        $conversation = Conversation::find($conversationId);
        if (!$conversation) {
            return response()->json(['message' => 'المحادثة غير موجودة.'], 404);
        }

        if ((int) $conversation->user_one_id !== (int) $user->id && (int) $conversation->user_two_id !== (int) $user->id) {
            return response()->json(['message' => 'غير مصرح.'], 403);
        }

        $message = Message::where('conversation_id', $conversation->id)->find($messageId);
        if (!$message) {
            return response()->json(['message' => 'الرسالة غير موجودة.'], 404);
        }

        // Only sender can delete for everyone
        if ((int) $message->sender_id !== (int) $user->id) {
            return response()->json(['message' => 'لا يمكنك حذف رسالة مرسلة من طرف آخر.'], 403);
        }

        $msgId = $message->id;
        $message->delete();

        // Broadcast to both participants
        broadcast(new MessageDeleted($conversation->id, $msgId))->toOthers();

        // Update conversation last message if needed
        $latest = Message::where('conversation_id', $conversation->id)->orderBy('id', 'desc')->first();
        if ($latest) {
            $conversation->update([
                'last_message_text' => $latest->text,
                'last_message_at' => $latest->created_at,
            ]);
        } else {
            $conversation->update([
                'last_message_text' => '',
            ]);
        }

        return response()->json([
            'success' => true,
            'message_id' => $msgId,
            'conversation' => $conversation->fresh()->format($user->id),
        ]);
    }
}
