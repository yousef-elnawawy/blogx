<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\Post;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_notifications_and_milestones_work()
    {
        $userA = User::factory()->create([
            'username' => 'user_a_' . time(),
            'email'    => 'user_a_' . time() . '@example.com',
        ]);
        $userB = User::factory()->create([
            'username' => 'user_b_' . time(),
            'email'    => 'user_b_' . time() . '@example.com',
        ]);

        $post = Post::create([
            'user_id' => $userA->id,
            'content' => 'Hello BlogX notification test #awesome',
        ]);

        // 1. Test Like Notification
        NotificationService::sendLikePostNotification($userB, $post);
        $this->assertDatabaseHas('notifications', [
            'user_id'  => $userA->id,
            'actor_id' => $userB->id,
            'type'     => 'like_post',
        ]);

        // 2. Test Follow Notification + 1 Follower Milestone
        $userB->follow($userA);
        NotificationService::sendFollowNotification($userB, $userA);
        $this->assertDatabaseHas('notifications', [
            'user_id'  => $userA->id,
            'actor_id' => $userB->id,
            'type'     => 'follow',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $userA->id,
            'type'    => 'milestone_followers',
        ]);

        // 3. Test Share Notification
        NotificationService::sendShareNotification($userB, $post, 'WhatsApp');
        $this->assertDatabaseHas('notifications', [
            'user_id'  => $userA->id,
            'actor_id' => $userB->id,
            'type'     => 'share_post',
        ]);

        // 4. Test View Milestone Notification
        NotificationService::checkViewMilestone($post, 50);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $userA->id,
            'type'    => 'view_milestone',
        ]);

        // 5. Test Post Milestone Notification
        NotificationService::checkPostCountMilestone($userA);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $userA->id,
            'type'    => 'milestone_post',
        ]);
    }

    public function test_notification_api_endpoints()
    {
        $user = User::factory()->create();
        $actor = User::factory()->create();

        $notification = Notification::create([
            'user_id'  => $user->id,
            'actor_id' => $actor->id,
            'type'     => 'like_post',
            'title'    => 'New Like',
            'message'  => 'John liked your post',
            'data'     => ['post_id' => 123],
        ]);

        // Unread Count
        $response = $this->actingAs($user)->getJson('/api/notifications/unread-count');
        $response->assertStatus(200)->assertJson(['unread_count' => 1]);

        // List
        $listResponse = $this->actingAs($user)->getJson('/api/notifications');
        $listResponse->assertStatus(200);
        $this->assertCount(1, $listResponse->json('notifications.data'));

        // Mark as Read
        $readResponse = $this->actingAs($user)->postJson("/api/notifications/{$notification->id}/read");
        $readResponse->assertStatus(200)->assertJson(['unread_count' => 0]);

        // Mark All Read
        $allReadResponse = $this->actingAs($user)->postJson('/api/notifications/read-all');
        $allReadResponse->assertStatus(200)->assertJson(['unread_count' => 0]);

        // Poll endpoint
        $pollResponse = $this->actingAs($user)->getJson('/api/notifications/poll?after_id=0');
        $pollResponse->assertStatus(200)->assertJsonStructure(['unread_count', 'recent']);

        // Delete
        $deleteResponse = $this->actingAs($user)->deleteJson("/api/notifications/{$notification->id}");
        $deleteResponse->assertStatus(200);
        $this->assertDatabaseMissing('notifications', ['id' => $notification->id]);
    }
}
