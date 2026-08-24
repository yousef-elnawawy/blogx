<?php

namespace App\Events;

use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewMessage implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $message;
    public ?array $conversation;
    public int $recipientId;
    public int $senderId;
    public int $conversationId;
    public int $unreadCount;

    /**
     * Create a new event instance.
     */
    public function __construct(Message $message, ?Conversation $conversation = null)
    {
        $this->senderId = (int) $message->sender_id;
        $this->recipientId = (int) $message->recipient_id;
        $this->conversationId = (int) $message->conversation_id;
        $this->message = $message->format($this->recipientId);

        $conv = $conversation ?? $message->conversation;
        $this->conversation = $conv ? $conv->format($this->recipientId) : null;

        // Total unread messages count for this recipient across all conversations
        $this->unreadCount = Message::where('recipient_id', $this->recipientId)
            ->where('is_seen', false)
            ->count();
    }

    /**
     * Channels to broadcast on: recipient's private user channel & private conversation channel.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->recipientId),
            new PrivateChannel('conversation.' . $this->conversationId),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'NewMessage';
    }

    /**
     * Data payload to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'message' => $this->message,
            'conversation' => $this->conversation,
            'conversation_id' => $this->conversationId,
            'unread_count' => $this->unreadCount,
        ];
    }
}
