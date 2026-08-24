<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSeen implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $conversationId;
    public int $seenByUserId;
    public int $otherUserId;

    /**
     * Create a new event instance.
     */
    public function __construct(int $conversationId, int $seenByUserId, int $otherUserId)
    {
        $this->conversationId = $conversationId;
        $this->seenByUserId = $seenByUserId;
        $this->otherUserId = $otherUserId;
    }

    /**
     * Channels to broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->otherUserId),
            new PrivateChannel('conversation.' . $this->conversationId),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'MessageSeen';
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
            'seen_by' => $this->seenByUserId,
            'seen_at' => now()->toIso8601String(),
        ];
    }
}
