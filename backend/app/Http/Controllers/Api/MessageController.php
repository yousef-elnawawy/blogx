<?php

namespace App\Http\Controllers\Api;

use App\Events\ConversationPinnedUpdated;
use App\Events\MessageDeleted;
use App\Events\MessageReactionUpdated;
use App\Events\MessageSeen;
use App\Events\MessageUpdated;
use App\Events\NewMessage;
use App\Events\UserTyping;
use App\Http\Controllers\Controller;
use App\Models\ContactNickname;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\StarredMessage;
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

        $blockedIds = $user->blockedUsers()->pluck('users.id')
            ->merge($user->blockedByUsers()->pluck('users.id'))
            ->unique()
            ->toArray();

        $conversations = Conversation::forUser($user->id)
            ->whereNotIn('user_one_id', $blockedIds)
            ->whereNotIn('user_two_id', $blockedIds)
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
            return response()->json(['message' => 'Conversation not found.'], 404);
        }

        // Strict Authorization: Must be participant
        if ((int) $conversation->user_one_id !== (int) $user->id && (int) $conversation->user_two_id !== (int) $user->id) {
            return response()->json(['message' => 'Unauthorized: You are not a participant in this conversation.'], 403);
        }

        $otherUser = $conversation->getOtherUser($user->id);
        if ($otherUser && $user->hasBlockedOrIsBlockedBy($otherUser)) {
            return response()->json(['message' => 'Conversation not found.'], 404);
        }

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
        $messages = $rawMessages->slice(0, $limit)->reverse()->values();

        $formattedMessages = $messages->map(fn($m) => $m->format($user->id));

        return response()->json([
            'conversation' => $conversation->format($user->id),
            'messages' => $formattedMessages,
            'has_more' => $hasMore,
            'is_following' => $isFollowing,
        ]);
    }

    /**
     * Start a conversation with a specific user (or retrieve existing).
     */
    public function start(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'recipient_id' => 'required|exists:users,id',
        ]);

        $recipientId = (int) $request->input('recipient_id');

        if ($user->id === $recipientId) {
            return response()->json(['message' => 'You cannot start a conversation with yourself.'], 422);
        }

        $recipient = User::find($recipientId);
        if (!$recipient) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        // Strict Ghost Block Check
        if ($user->hasBlockedOrIsBlockedBy($recipient)) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        // Check if recipient requires following to receive DMs
        $isFollowing = $user->isFollowing($recipient);
        $requireFollow = false;
        if (isset($recipient->preferences['dm_require_follow']) && $recipient->preferences['dm_require_follow']) {
            if (!$isFollowing) {
                return response()->json([
                    'message' => 'This user only receives direct messages from accounts they follow or that follow them.',
                    'requires_follow' => true,
                ], 403);
            }
        }

        $conversation = Conversation::findOrCreateBetween($user->id, $recipientId);
        $conversation->load(['userOne', 'userTwo', 'latestMessage.sender']);

        return response()->json([
            'conversation' => $conversation->format($user->id),
            'is_following' => $isFollowing,
        ], 200);
    }

    /**
     * Send a new message in a conversation.
     */
    public function sendMessage(Request $request, $id)
    {
        $user = $request->user();

        $conversation = Conversation::with(['userOne', 'userTwo'])->find($id);

        if (!$conversation) {
            return response()->json(['message' => 'Conversation not found.'], 404);
        }

        // Strict Authorization: Must be participant
        if ((int) $conversation->user_one_id !== (int) $user->id && (int) $conversation->user_two_id !== (int) $user->id) {
            return response()->json(['message' => 'Unauthorized: You are not a participant in this conversation.'], 403);
        }

        $recipient = $conversation->getOtherUser($user->id);
        if (!$recipient) {
            return response()->json(['message' => 'Recipient not found.'], 404);
        }

        // Strict Ghost Block Check
        if ($user->hasBlockedOrIsBlockedBy($recipient)) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        // Permission check: Follower-only DMs
        if (isset($recipient->preferences['dm_require_follow']) && $recipient->preferences['dm_require_follow']) {
            if (!$user->isFollowing($recipient)) {
                return response()->json([
                    'message' => 'You must follow this user to send them direct messages.',
                    'requires_follow' => true,
                ], 403);
            }
        }

        $request->validate([
            'text' => 'nullable|string|max:5000',
            'images' => 'nullable|array|max:5',
            'images.*' => 'image|mimes:jpeg,png,jpg,webp,gif|max:10240',
            'audio' => 'nullable|file|mimes:webm,ogg,wav,mp3,m4a,mp4|max:20480',
            'audio_duration' => 'nullable|integer',
            'video' => 'nullable|file|mimes:mp4,mov,webm,mkv|max:1048576',
            'file' => 'nullable|file|max:51200', // 50MB documents / zip
            'reply_to_id' => 'nullable|exists:messages,id',
            'shared_data' => 'nullable',
        ]);

        $text = trim($request->input('text', ''));
        $replyToId = $request->input('reply_to_id');
        $audioDuration = $request->input('audio_duration') ? (int) $request->input('audio_duration') : null;

        $sharedData = $request->input('shared_data');
        if (is_string($sharedData)) {
            $sharedData = json_decode($sharedData, true);
        }

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

        $uploadedVideoPath = null;
        if ($request->hasFile('video') && $request->file('video')->isValid()) {
            $videoFile = $request->file('video');
            $ext = $videoFile->getClientOriginalExtension() ?: 'mp4';
            $vName = 'chat_vid_' . uniqid() . '_' . time() . '.' . $ext;
            $path = $videoFile->storeAs('chat_videos', $vName, 'public');
            $uploadedVideoPath = '/storage/' . $path;
        }

        $uploadedFilePath = null;
        $uploadedFileName = null;
        $uploadedFileSize = null;
        $uploadedFileType = null;
        if ($request->hasFile('file') && $request->file('file')->isValid()) {
            $docFile = $request->file('file');
            $uploadedFileName = $docFile->getClientOriginalName();
            $uploadedFileSize = $docFile->getSize();
            $uploadedFileType = $docFile->getClientOriginalExtension() ?: 'file';
            $fName = 'doc_' . uniqid() . '_' . time() . '.' . $uploadedFileType;
            $path = $docFile->storeAs('chat_files', $fName, 'public');
            $uploadedFilePath = '/storage/' . $path;
        }

        if (empty($text) && empty($uploadedImagePaths) && empty($uploadedAudioPath) && empty($uploadedVideoPath) && empty($uploadedFilePath) && empty($sharedData)) {
            return response()->json(['message' => 'Please enter text, record audio, or attach a file.'], 422);
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
            'video_url' => $uploadedVideoPath,
            'file_url' => $uploadedFilePath,
            'file_name' => $uploadedFileName,
            'file_size' => $uploadedFileSize,
            'file_type' => $uploadedFileType,
            'shared_data' => $sharedData,
            'is_seen' => false,
        ]);

        $lastText = !empty($text)
            ? $text
            : (!empty($uploadedAudioPath)
                ? '🎙️ Voice message'
                : (!empty($uploadedFilePath)
                    ? '📎 ' . ($uploadedFileName ?: 'File')
                    : (!empty($uploadedVideoPath)
                        ? '🎥 Video'
                        : (!empty($sharedData)
                            ? '🔗 Shared ' . ($sharedData['type'] ?? 'content')
                            : (count($uploadedImagePaths) > 0 ? '📷 Image' : '')))));

        $conversation->update([
            'last_message_text' => $lastText,
            'last_message_at' => now(),
        ]);

        $message->load(['sender', 'replyTo.sender']);

        // Broadcast event in real-time via Laravel Reverb
        broadcast(new NewMessage($message, $conversation))->toOthers();

        return response()->json([
            'message' => $message->format($user->id),
            'conversation' => $conversation->fresh()->format($user->id),
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

    /**
     * Edit a sent message within 15 minutes of sending.
     */
    public function editMessage(Request $request, $id)
    {
        $user = $request->user();

        $message = Message::with(['sender', 'replyTo.sender'])->find($id);
        if (!$message) {
            return response()->json(['message' => 'Message not found.'], 404);
        }

        if ((int) $message->sender_id !== (int) $user->id) {
            return response()->json(['message' => 'Unauthorized: You can only edit your own messages.'], 403);
        }

        // Must be within 15 minutes
        if ($message->created_at && $message->created_at->lessThan(now()->subMinutes(15))) {
            return response()->json(['message' => 'Messages can only be edited within 15 minutes of sending.'], 422);
        }

        $request->validate([
            'text' => 'required|string|max:5000',
        ]);

        $newText = trim($request->input('text'));

        $message->update([
            'text' => $newText,
            'is_edited' => true,
            'edited_at' => now(),
        ]);

        // Update conversation last_message if this was the latest message
        $conversation = Conversation::find($message->conversation_id);
        if ($conversation) {
            $latest = Message::where('conversation_id', $conversation->id)->orderBy('id', 'desc')->first();
            if ($latest && (int) $latest->id === (int) $message->id) {
                $conversation->update([
                    'last_message_text' => $newText,
                ]);
            }
        }

        // Broadcast to conversation participants
        broadcast(new MessageUpdated($message))->toOthers();

        return response()->json([
            'success' => true,
            'message' => $message->format($user->id),
            'conversation' => $conversation ? $conversation->fresh()->format($user->id) : null,
        ]);
    }

    /**
     * Toggle starred bookmark status on a message.
     */
    public function toggleStar(Request $request, $id)
    {
        $user = $request->user();

        $message = Message::with(['sender', 'replyTo.sender'])->find($id);
        if (!$message) {
            return response()->json(['message' => 'Message not found.'], 404);
        }

        $conversation = Conversation::find($message->conversation_id);
        if (!$conversation) {
            return response()->json(['message' => 'Conversation not found.'], 404);
        }

        if ((int) $conversation->user_one_id !== (int) $user->id && (int) $conversation->user_two_id !== (int) $user->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $starred = StarredMessage::where('user_id', $user->id)->where('message_id', $message->id)->first();
        if ($starred) {
            $starred->delete();
            $isStarred = false;
        } else {
            StarredMessage::create([
                'user_id' => $user->id,
                'message_id' => $message->id,
            ]);
            $isStarred = true;
        }

        return response()->json([
            'success' => true,
            'is_starred' => $isStarred,
            'message' => $message->format($user->id),
        ]);
    }

    /**
     * Pin or unpin a specific message in the conversation.
     */
    public function togglePinMessage(Request $request, $conversationId, $messageId)
    {
        $user = $request->user();

        $conversation = Conversation::find($conversationId);
        if (!$conversation) {
            return response()->json(['message' => 'Conversation not found.'], 404);
        }

        if ((int) $conversation->user_one_id !== (int) $user->id && (int) $conversation->user_two_id !== (int) $user->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if ((int) $conversation->pinned_message_id === (int) $messageId) {
            // Unpin
            $conversation->update(['pinned_message_id' => null]);
        } else {
            $message = Message::where('conversation_id', $conversation->id)->find($messageId);
            if (!$message) {
                return response()->json(['message' => 'Message not found in this conversation.'], 404);
            }
            $conversation->update(['pinned_message_id' => $messageId]);
        }

        $conversation->load('pinnedMessage.sender');
        broadcast(new ConversationPinnedUpdated($conversation))->toOthers();

        return response()->json([
            'success' => true,
            'conversation' => $conversation->fresh()->format($user->id),
        ]);
    }

    /**
     * Get shared media, files, and links in a conversation.
     */
    public function getMediaGallery(Request $request, $id)
    {
        $user = $request->user();

        $conversation = Conversation::find($id);
        if (!$conversation) {
            return response()->json(['message' => 'Conversation not found.'], 404);
        }

        if ((int) $conversation->user_one_id !== (int) $user->id && (int) $conversation->user_two_id !== (int) $user->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $messages = Message::where('conversation_id', $conversation->id)
            ->with(['sender'])
            ->orderBy('id', 'desc')
            ->get();

        $media = [];
        $files = [];
        $links = [];

        foreach ($messages as $msg) {
            $formatted = $msg->format($user->id);

            // Images & Videos
            if (!empty($formatted['images']) || !empty($formatted['video_url'])) {
                $media[] = $formatted;
            }

            // Documents & Files
            if (!empty($formatted['file_url'])) {
                $files[] = $formatted;
            }

            // Links / Shared data
            if (!empty($formatted['shared_data']) || preg_match('/https?:\/\/[^\s]+/', $formatted['text'] ?? '')) {
                $links[] = $formatted;
            }
        }

        return response()->json([
            'media' => $media,
            'files' => $files,
            'links' => $links,
        ]);
    }

    /**
     * Set, update, or remove private contact nickname.
     */
    public function setContactNickname(Request $request, $contactId)
    {
        $user = $request->user();

        $contact = User::find($contactId);
        if (!$contact) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        if ((int) $contactId === (int) $user->id) {
            return response()->json(['message' => 'You cannot set a nickname for yourself.'], 422);
        }

        $request->validate([
            'nickname' => 'nullable|string|max:100',
        ]);

        $nickname = trim($request->input('nickname', ''));

        if (empty($nickname)) {
            ContactNickname::where('user_id', $user->id)->where('contact_id', $contactId)->delete();
            return response()->json([
                'success' => true,
                'nickname' => null,
                'display_name' => $contact->name,
            ]);
        }

        $entry = ContactNickname::updateOrCreate(
            ['user_id' => $user->id, 'contact_id' => $contactId],
            ['nickname' => $nickname]
        );

        return response()->json([
            'success' => true,
            'nickname' => $entry->nickname,
            'display_name' => $entry->nickname,
        ]);
    }

    /**
     * Search within a conversation by query keyword.
     */
    public function search(Request $request, $id)
    {
        $user = $request->user();

        $conversation = Conversation::find($id);
        if (!$conversation) {
            return response()->json(['message' => 'Conversation not found.'], 404);
        }

        if ((int) $conversation->user_one_id !== (int) $user->id && (int) $conversation->user_two_id !== (int) $user->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $q = trim($request->query('q', ''));
        if (empty($q)) {
            return response()->json(['results' => []]);
        }

        // Fetch all messages and filter against decrypted text or file names
        $messages = Message::where('conversation_id', $conversation->id)
            ->with(['sender'])
            ->orderBy('id', 'desc')
            ->get();

        $matches = [];
        $lowerQ = mb_strtolower($q);

        foreach ($messages as $msg) {
            $formatted = $msg->format($user->id);
            $text = mb_strtolower($formatted['text'] ?? '');
            $fileName = mb_strtolower($formatted['file_name'] ?? '');

            if (str_contains($text, $lowerQ) || str_contains($fileName, $lowerQ)) {
                $matches[] = $formatted;
            }
        }

        return response()->json([
            'results' => $matches,
            'count' => count($matches),
        ]);
    }
}
