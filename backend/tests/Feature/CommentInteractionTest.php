<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommentInteractionTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_like_a_comment(): void
    {
        $user = User::factory()->create();
        $post = Post::factory()->create(['user_id' => $user->id]);
        $comment = Comment::factory()->create([
            'post_id' => $post->id,
            'user_id' => $user->id,
            'content' => 'Nice post',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/posts/{$post->id}/comments/{$comment->id}/like");

        $response->assertOk()
            ->assertJsonPath('is_liked', true)
            ->assertJsonPath('likes_count', 1);
    }
}
