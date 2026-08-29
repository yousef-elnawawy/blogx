<?php

namespace App\Console\Commands;

use App\Models\Blog;
use App\Models\Post;
use App\Services\PostCategorizerService;
use Illuminate\Console\Command;

class CategorizeExistingPosts extends Command
{
    protected $signature = 'posts:categorize';
    protected $description = 'Automatically categorize all existing posts and blogs';

    public function handle(PostCategorizerService $categorizer): int
    {
        $this->info('Categorizing posts...');
        $posts = Post::all();
        foreach ($posts as $post) {
            $cat = $categorizer->categorize($post->content);
            $post->forceFill(['category' => $cat])->save();
            $this->line("Post #{$post->id} -> {$cat}");
        }

        $this->info('Categorizing blogs...');
        $blogs = Blog::all();
        foreach ($blogs as $blog) {
            $cat = $categorizer->categorize($blog->title . ' ' . $blog->excerpt . ' ' . $blog->content);
            $blog->forceFill(['category' => $cat])->save();
            $this->line("Blog #{$blog->id} -> {$cat}");
        }

        $this->info('Categorization complete!');
        return Command::SUCCESS;
    }
}
