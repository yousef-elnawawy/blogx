<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageReactionUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $conversationId;
    public int $messageId;
    public array $reactions;
    public int $userId;

    /**
     * Create a new event instance.
     */
    public function __construct(Message $message, int $userId)
    {
        $this->conversationId = (int) $message->conversation_id;
        $this->messageId = (int) $message->id;
        $this->userId = $userId;

        $formatted = $message->format();
        $this->reactions = $formatted['reactions'] ?? [];
    }

    /**
     * Channels to broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('conversation.' . $this->conversationId),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'MessageReactionUpdated';
    }

    /**
     * Data payload to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'conversation_id' => $this->conversationId,
            'message_id' => $this->messageId,
            'reactions' => $this->reactions,
            'user_id' => $this->userId,
        ];
    }
}
