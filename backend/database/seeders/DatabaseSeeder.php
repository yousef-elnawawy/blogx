<?php

namespace Database\Seeders;

use App\Models\Blog;
use App\Models\Comment;
use App\Models\Community;
use App\Models\CommunityMember;
use App\Models\Hashtag;
use App\Models\Like;
use App\Models\Poll;
use App\Models\PollOption;
use App\Models\PollVote;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Helper to create a post and automatically extract & link hashtags in the pivot table.
     */
    private function createPost(array $attributes): Post
    {
        $post = Post::create($attributes);

        preg_match_all('/#([\p{L}\p{N}_]+)/u', $attributes['content'] ?? '', $matches);
        $tags = array_unique(array_map('mb_strtolower', $matches[1] ?? []));

        $hashtagIds = [];
        foreach ($tags as $tag) {
            $hashtag = Hashtag::firstOrCreate(
                ['tag' => $tag],
                ['usage_count' => 0]
            );
            $hashtagIds[] = $hashtag->id;
        }

        if (!empty($hashtagIds)) {
            $post->hashtags()->sync($hashtagIds);
        }

        return $post;
    }

    /**
     * Seed the application's database with rich mock data.
     */
    public function run(): void
    {
        // ── 1. Create Core Users with Real Avatars ──
        $usersData = [
            [
                'name' => 'Yousef Elnawawy',
                'username' => 'yousef',
                'email' => 'yousef@blogx.com',
                'password' => Hash::make('password123'),
                'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
                'bio' => 'Founder & Lead Architect at BlogX. Building modern social and developer platforms.',
                'location' => 'Cairo, Egypt',
                'website' => 'https://blogx.com',
                'verified' => true,
                'is_admin' => true,
                'equipped_badges' => ['Founder', 'Admin', 'VIP', 'Architect'],
            ],
            [
                'name' => 'Taylor Otwell',
                'username' => 'taylorotwell',
                'email' => 'taylor@laravel.com',
                'password' => Hash::make('password123'),
                'avatar' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
                'bio' => 'Creator of Laravel. Full-time open source maintainer & builder.',
                'location' => 'Little Rock, AR',
                'website' => 'https://laravel.com',
                'verified' => true,
                'is_admin' => false,
                'equipped_badges' => ['Creator', 'VIP', 'Laravel'],
            ],
            [
                'name' => 'Sam Altman',
                'username' => 'samaltman',
                'email' => 'sam@openai.com',
                'password' => Hash::make('password123'),
                'avatar' => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
                'bio' => 'CEO at OpenAI. Thinking about artificial general intelligence and the future of technology.',
                'location' => 'San Francisco, CA',
                'website' => 'https://openai.com',
                'verified' => true,
                'is_admin' => false,
                'equipped_badges' => ['AI Researcher', 'VIP'],
            ],
            [
                'name' => 'Elon Musk',
                'username' => 'elonmusk',
                'email' => 'elon@x.com',
                'password' => Hash::make('password123'),
                'avatar' => 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
                'bio' => 'Building rockets, electric cars & xAI. Exploring the limits of technology and physics.',
                'location' => 'Austin, TX',
                'website' => 'https://x.com',
                'verified' => true,
                'is_admin' => false,
                'equipped_badges' => ['Pioneer', 'VIP', 'Tech Lead'],
            ],
            [
                'name' => 'Lee Robinson',
                'username' => 'leerob',
                'email' => 'lee@vercel.com',
                'password' => Hash::make('password123'),
                'avatar' => 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
                'bio' => 'VP of Product at Vercel. Next.js, React, and web performance enthusiast.',
                'location' => 'Des Moines, IA',
                'website' => 'https://leerob.io',
                'verified' => true,
                'is_admin' => false,
                'equipped_badges' => ['Frontend Hero', 'VIP'],
            ],
            [
                'name' => 'Sarah Jenkins',
                'username' => 'sarah_dev',
                'email' => 'sarah@example.com',
                'password' => Hash::make('password123'),
                'avatar' => 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
                'bio' => 'Design systems architect & UI engineer. Crafting pixel-perfect web experiences with Tailwind & Framer.',
                'location' => 'London, UK',
                'website' => 'https://sarahjenkins.design',
                'verified' => true,
                'is_admin' => false,
                'equipped_badges' => ['UI Master', 'Contributor'],
            ],
            [
                'name' => 'Alex Morgan',
                'username' => 'alexmorgan',
                'email' => 'alex@example.com',
                'password' => Hash::make('password123'),
                'avatar' => 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80',
                'bio' => 'Senior Fullstack Engineer. Diving into distributed databases, Go, and high-concurrency microservices.',
                'location' => 'Berlin, Germany',
                'website' => 'https://alexmorgan.dev',
                'verified' => false,
                'is_admin' => false,
                'equipped_badges' => ['Code Artisan'],
            ],
            [
                'name' => 'Omar Khaled',
                'username' => 'omar_k',
                'email' => 'omar@example.com',
                'password' => Hash::make('password123'),
                'avatar' => 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
                'bio' => 'DevOps & Cloud Specialist. Terraform, Kubernetes, and automated zero-downtime CI/CD workflows.',
                'location' => 'Alexandria, Egypt',
                'website' => 'https://omarkhaled.cloud',
                'verified' => false,
                'is_admin' => false,
                'equipped_badges' => ['Cloud Pro'],
            ],
            [
                'name' => 'Vercel',
                'username' => 'vercel',
                'email' => 'contact@vercel.com',
                'password' => Hash::make('password123'),
                'avatar' => 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
                'bio' => 'Develop. Preview. Ship. The frontend cloud platform for Next.js, React, and modern web teams.',
                'location' => 'San Francisco, CA',
                'website' => 'https://vercel.com',
                'verified' => true,
                'is_admin' => false,
                'equipped_badges' => ['Official', 'Enterprise'],
            ],
            [
                'name' => 'Laravel Team',
                'username' => 'laravel',
                'email' => 'hello@laravel.com',
                'password' => Hash::make('password123'),
                'avatar' => 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80',
                'bio' => 'The PHP Framework for Web Artisans. Expressive syntax, robust ecosystem, and joyful development.',
                'location' => 'Worldwide',
                'website' => 'https://laravel.com',
                'verified' => true,
                'is_admin' => false,
                'equipped_badges' => ['Official', 'Enterprise'],
            ],
        ];

        $users = [];
        foreach ($usersData as $uData) {
            $user = User::updateOrCreate(
                ['username' => $uData['username']],
                $uData
            );
            $users[$uData['username']] = $user;
        }

        // ── 2. Create Follow Relationships ──
        $followPairs = [
            ['yousef', 'taylorotwell'],
            ['yousef', 'samaltman'],
            ['yousef', 'elonmusk'],
            ['yousef', 'leerob'],
            ['yousef', 'sarah_dev'],
            ['taylorotwell', 'yousef'],
            ['taylorotwell', 'laravel'],
            ['taylorotwell', 'leerob'],
            ['leerob', 'vercel'],
            ['leerob', 'taylorotwell'],
            ['leerob', 'sarah_dev'],
            ['samaltman', 'elonmusk'],
            ['sarah_dev', 'leerob'],
            ['sarah_dev', 'alexmorgan'],
            ['alexmorgan', 'omar_k'],
            ['alexmorgan', 'taylorotwell'],
            ['omar_k', 'alexmorgan'],
            ['omar_k', 'yousef'],
        ];

        foreach ($followPairs as [$followerUsername, $followingUsername]) {
            if (isset($users[$followerUsername], $users[$followingUsername])) {
                DB::table('follows')->updateOrInsert(
                    [
                        'follower_id' => $users[$followerUsername]->id,
                        'following_id' => $users[$followingUsername]->id,
                    ],
                    ['created_at' => now(), 'updated_at' => now()]
                );
            }
        }

        // ── 3. Create Public Communities with Real Cover & Avatar Images ──
        $communitiesData = [
            [
                'name' => 'Laravel & PHP Artisans',
                'slug' => 'laravel-hub',
                'description' => 'The official hub for Laravel, PHP, Livewire, and modern web architecture. Share packages, tips, and showcases.',
                'avatar' => 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80',
                'cover' => 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
                'creator_id' => $users['taylorotwell']->id,
                'type' => 'public',
            ],
            [
                'name' => 'Next.js & React Developers',
                'slug' => 'nextjs-react',
                'description' => 'Discussions on Server Components, App Router, React 19, TypeScript, and modern frontend design.',
                'avatar' => 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=400&q=80',
                'cover' => 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
                'creator_id' => $users['leerob']->id,
                'type' => 'public',
            ],
            [
                'name' => 'AI, LLMs & Machine Learning',
                'slug' => 'ai-machinelearning',
                'description' => 'Exploring neural architectures, LLMs, embeddings, RAG pipelines, and generative AI research.',
                'avatar' => 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=400&q=80',
                'cover' => 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80',
                'creator_id' => $users['samaltman']->id,
                'type' => 'public',
            ],
            [
                'name' => 'Cloud, DevOps & Infrastructure',
                'slug' => 'cloud-devops',
                'description' => 'Kubernetes, Docker, AWS, Cloudflare, Terraform, and high-availability systems scaling.',
                'avatar' => 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=400&q=80',
                'cover' => 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
                'creator_id' => $users['omar_k']->id,
                'type' => 'public',
            ],
            [
                'name' => 'UI/UX & Design Systems',
                'slug' => 'ui-ux-design',
                'description' => 'Crafting micro-interactions, Tailwind CSS, accessibility, typography, and beautiful product design.',
                'avatar' => 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&w=400&q=80',
                'cover' => 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
                'creator_id' => $users['sarah_dev']->id,
                'type' => 'public',
            ],
            [
                'name' => 'Open Source & Developers Lounge',
                'slug' => 'open-source',
                'description' => 'Connect with creators, discover rising open source repositories, and collaborate on software.',
                'avatar' => 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&w=400&q=80',
                'cover' => 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
                'creator_id' => $users['yousef']->id,
                'type' => 'public',
            ],
        ];

        $communities = [];
        foreach ($communitiesData as $cData) {
            $comm = Community::updateOrCreate(
                ['slug' => $cData['slug']],
                $cData
            );
            $communities[$cData['slug']] = $comm;

            // Auto-add all seeded users as approved members
            foreach ($users as $u) {
                CommunityMember::updateOrCreate(
                    [
                        'community_id' => $comm->id,
                        'user_id' => $u->id,
                    ],
                    [
                        'role' => $u->id === $comm->creator_id ? 'admin' : 'member',
                        'status' => 'approved',
                    ]
                );
            }
        }

        // ── 4. Seed Posts with Polls, Mentions & Hashtags ──

        // Post 1: Taylor Otwell - Poll on Frameworks
        $post1 = $this->createPost([
            'user_id' => $users['taylorotwell']->id,
            'content' => "What is your primary backend framework of choice for greenfield projects in 2026? Let's see how modern engineering teams are building today! #laravel #php #webdev #opensource",
            'views_count' => 480,
            'created_at' => now()->subHours(2),
        ]);

        $poll1 = Poll::create([
            'post_id' => $post1->id,
            'question' => "What is your primary backend framework of choice for new greenfield projects in 2026?",
            'expires_at' => now()->addDays(7),
        ]);

        $opt1_1 = PollOption::create(['poll_id' => $poll1->id, 'option_text' => 'Laravel 11 (PHP)', 'votes_count' => 2, 'order' => 0]);
        $opt1_2 = PollOption::create(['poll_id' => $poll1->id, 'option_text' => 'FastAPI / Django (Python)', 'votes_count' => 1, 'order' => 1]);
        $opt1_3 = PollOption::create(['poll_id' => $poll1->id, 'option_text' => 'Go (Gin / Fiber)', 'votes_count' => 1, 'order' => 2]);
        $opt1_4 = PollOption::create(['poll_id' => $poll1->id, 'option_text' => 'NestJS / Express (Node.js)', 'votes_count' => 0, 'order' => 3]);

        PollVote::updateOrCreate(['poll_id' => $poll1->id, 'user_id' => $users['yousef']->id], ['poll_option_id' => $opt1_1->id]);
        PollVote::updateOrCreate(['poll_id' => $poll1->id, 'user_id' => $users['taylorotwell']->id], ['poll_option_id' => $opt1_1->id]);
        PollVote::updateOrCreate(['poll_id' => $poll1->id, 'user_id' => $users['samaltman']->id], ['poll_option_id' => $opt1_2->id]);
        PollVote::updateOrCreate(['poll_id' => $poll1->id, 'user_id' => $users['alexmorgan']->id], ['poll_option_id' => $opt1_3->id]);

        // Post 2: Lee Robinson - Poll on Deployment
        $post2 = $this->createPost([
            'user_id' => $users['leerob']->id,
            'content' => "Where does your team deploy production web applications? Share your infrastructure stack! @vercel #nextjs #cloud #webdev #react",
            'views_count' => 620,
            'created_at' => now()->subHours(5),
        ]);

        $poll2 = Poll::create([
            'post_id' => $post2->id,
            'question' => "Where does your team deploy production web applications?",
            'expires_at' => now()->addDays(5),
        ]);

        $opt2_1 = PollOption::create(['poll_id' => $poll2->id, 'option_text' => 'Vercel / Cloudflare Edge', 'votes_count' => 2, 'order' => 0]);
        $opt2_2 = PollOption::create(['poll_id' => $poll2->id, 'option_text' => 'AWS (ECS / Lambda / EKS)', 'votes_count' => 1, 'order' => 1]);
        $opt2_3 = PollOption::create(['poll_id' => $poll2->id, 'option_text' => 'Self-hosted VPS (Hetzner / DO)', 'votes_count' => 1, 'order' => 2]);
        $opt2_4 = PollOption::create(['poll_id' => $poll2->id, 'option_text' => 'Railway / Render / Fly.io', 'votes_count' => 0, 'order' => 3]);

        PollVote::updateOrCreate(['poll_id' => $poll2->id, 'user_id' => $users['leerob']->id], ['poll_option_id' => $opt2_1->id]);
        PollVote::updateOrCreate(['poll_id' => $poll2->id, 'user_id' => $users['sarah_dev']->id], ['poll_option_id' => $opt2_1->id]);
        PollVote::updateOrCreate(['poll_id' => $poll2->id, 'user_id' => $users['omar_k']->id], ['poll_option_id' => $opt2_2->id]);
        PollVote::updateOrCreate(['poll_id' => $poll2->id, 'user_id' => $users['yousef']->id], ['poll_option_id' => $opt2_3->id]);

        // Post 3: Sam Altman on AI & Coding
        $post3 = $this->createPost([
            'user_id' => $users['samaltman']->id,
            'content' => "The rate at which autonomous coding agents are accelerating developer velocity is astounding. We are moving towards systems that understand entire codebases in seconds. #ai #opensource #technology",
            'views_count' => 1250,
            'created_at' => now()->subHours(8),
        ]);

        // Post 4: Yousef Elnawawy - Welcome to BlogX
        $post4 = $this->createPost([
            'user_id' => $users['yousef']->id,
            'content' => "Excited to welcome everyone to BlogX! We designed this platform to combine social micro-blogging, YouTube-style polls, rich engineering articles, and vibrant public communities in one elegant home. @taylorotwell @leerob @samaltman #webdev #opensource #laravel #nextjs",
            'views_count' => 950,
            'is_pinned' => true,
            'created_at' => now()->subDay(),
        ]);

        // Post 5: Sarah Jenkins in UI/UX Community
        $post5 = $this->createPost([
            'user_id' => $users['sarah_dev']->id,
            'community_id' => $communities['ui-ux-design']->id,
            'content' => "Remember: Great UI design is not just about colors and gradients—it is about clarity, hierarchy, typography, and micro-interactions that respect the user's attention. #design #react #webdev #ui",
            'views_count' => 310,
            'created_at' => now()->subHours(12),
        ]);

        // Post 6: Omar Khaled in Cloud DevOps Community
        $post6 = $this->createPost([
            'user_id' => $users['omar_k']->id,
            'community_id' => $communities['cloud-devops']->id,
            'content' => "Pro tip for Kubernetes clusters: always configure liveness and readiness probes with proper initial delays to avoid cascading restarts during blue-green rolling deployments! #cloud #devops #kubernetes",
            'views_count' => 270,
            'created_at' => now()->subHours(18),
        ]);

        // Post 7: Elon Musk on AI & Engineering
        $post7 = $this->createPost([
            'user_id' => $users['elonmusk']->id,
            'content' => "First principles thinking in engineering: boil things down to their most fundamental truths and reason up from there. Never accept constraints just because 'it has always been done that way'. #technology #ai",
            'views_count' => 1840,
            'created_at' => now()->subDay(),
        ]);

        // Post 8: Alex Morgan on Open Source & Go
        $post8 = $this->createPost([
            'user_id' => $users['alexmorgan']->id,
            'content' => "Just published an open-source high-throughput rate limiter for distributed clusters! Check it out and let me know your thoughts. #opensource #golang #webdev",
            'views_count' => 410,
            'created_at' => now()->subHours(14),
        ]);

        // Post 9: Laravel Team in Laravel Hub
        $post9 = $this->createPost([
            'user_id' => $users['laravel']->id,
            'community_id' => $communities['laravel-hub']->id,
            'content' => "Laravel 11 brings lightweight application skeletons, per-second rate limiting, health routing, and streamlined configuration files. What is your favorite new feature? #laravel #php #opensource",
            'views_count' => 880,
            'created_at' => now()->subDays(2),
        ]);

        // Post 10: Vercel in Next.js Community
        $post10 = $this->createPost([
            'user_id' => $users['vercel']->id,
            'community_id' => $communities['nextjs-react']->id,
            'content' => "Next.js 15 is now production ready with Async Request APIs, React 19 support, and enhanced static route caching. Check out the release notes! #nextjs #react #webdev",
            'views_count' => 1120,
            'created_at' => now()->subDays(2),
        ]);

        // Seed Comments
        Comment::create([
            'post_id' => $post1->id,
            'user_id' => $users['yousef']->id,
            'content' => 'Laravel 11 with Octane and Inertia/Next.js is an absolute superpower for scaling rapidly.',
        ]);

        Comment::create([
            'post_id' => $post1->id,
            'user_id' => $users['alexmorgan']->id,
            'content' => 'Go for microservices, but Laravel remains unmatched for developer joy and ecosystem completeness.',
        ]);

        Comment::create([
            'post_id' => $post4->id,
            'user_id' => $users['taylorotwell']->id,
            'content' => 'Looks gorgeous! Loving the speed, typography, and clean aesthetic.',
        ]);

        Comment::create([
            'post_id' => $post4->id,
            'user_id' => $users['leerob']->id,
            'content' => 'Super smooth experience. The interactive polls and communities are awesome!',
        ]);

        // Seed Likes (polymorphic)
        foreach ([$post1, $post2, $post3, $post4, $post5, $post6, $post7, $post8, $post9, $post10] as $p) {
            Like::updateOrCreate([
                'user_id' => $users['yousef']->id,
                'likeable_id' => $p->id,
                'likeable_type' => Post::class,
            ]);
            Like::updateOrCreate([
                'user_id' => $users['sarah_dev']->id,
                'likeable_id' => $p->id,
                'likeable_type' => Post::class,
            ]);
        }

        // ── 5. Seed Long-Form Technical Blogs ──
        $blogsData = [
            [
                'user_id' => $users['leerob']->id,
                'title' => 'Architecting High-Performance Next.js 15 Applications with Server Actions & Streaming',
                'slug' => 'architecting-high-performance-nextjs-15-applications',
                'excerpt' => 'A comprehensive guide on leveraging React Server Components, Partial Prerendering, and fine-grained data caching for sub-100ms web applications.',
                'tags' => ['nextjs', 'react', 'performance', 'webdev', 'opensource'],
                'cover_image' => 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
                'read_time' => 5,
                'status' => 'published',
                'published_at' => now()->subDays(2),
                'views_count' => 1420,
                'content' => "# Architecting High-Performance Next.js 15 Applications

Building modern web applications requires balancing fast initial page loads with rich client-side interactivity. Next.js 15 introduces several breakthrough capabilities to make this achievable at scale.

## 1. The Power of React Server Components (RSC)

Server Components allow developers to render UI components on the server without sending unnecessary JavaScript bundles to the browser:

```typescript
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const data = await fetchDashboardMetrics();
  
  return (
    <main className=\"dashboard-grid\">
      <MetricsOverview data={data} />
      <RecentActivityList items={data.recent} />
    </main>
  );
}
```

### Key Advantages:
* **Zero Bundle Impact**: Heavy dependencies stay on the server.
* **Direct Database Access**: Query your database directly inside components without intermediate API layers.
* **Automatic Streaming**: Stream slow data chunks with React `<Suspense />` boundaries.

## 2. Server Actions for Mutations

Mutating state seamlessly without writing boilerplate REST endpoints:

```typescript
'use server';

export async function updateUserSettings(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error('Unauthorized');

  await db.users.update({
    where: { id: session.user.id },
    data: { theme: formData.get('theme') },
  });
}
```

## Conclusion

By adopting Server Components, streaming suspense boundaries, and server actions, your applications achieve unparalleled speed and security.",
            ],
            [
                'user_id' => $users['taylorotwell']->id,
                'title' => 'Building Resilient Real-Time Systems with Laravel Reverb, WebSockets & Echo',
                'slug' => 'building-resilient-real-time-systems-with-laravel-reverb',
                'excerpt' => 'Learn how Laravel Reverb provides first-party, high-performance WebSocket broadcasting capable of handling tens of thousands of concurrent connections.',
                'tags' => ['laravel', 'php', 'websockets', 'architecture', 'opensource'],
                'cover_image' => 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
                'read_time' => 6,
                'status' => 'published',
                'published_at' => now()->subDays(4),
                'views_count' => 1890,
                'content' => "# Building Resilient Real-Time Systems with Laravel Reverb

Real-time capabilities such as live notifications, interactive polls, and instant messaging are critical for engaging web experiences.

## 1. Introducing Laravel Reverb

Laravel Reverb is a blazing-fast, scalable first-party WebSocket server built specifically for the Laravel ecosystem.

```php
// app/Events/NewMessageBroadcast.php
class NewMessageBroadcast implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Message \$message) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('chat.' . \$this->message->conversation_id),
        ];
    }
}
```

## 2. Subscribing on the Frontend with Echo

Connecting with Laravel Echo in React or Next.js is straightforward:

```typescript
echo.private(`chat.\${conversationId}`)
  .listen('NewMessageBroadcast', (event: { message: MessageType }) => {
    setMessages((prev) => [...prev, event.message]);
  });
```

## Performance & Scalability

* Handles tens of thousands of active concurrent connections on a single standard node.
* Integrates seamlessly with Redis Pub/Sub for multi-server horizontal scaling.
* Native support for private and presence channels with robust authentication.",
            ],
            [
                'user_id' => $users['samaltman']->id,
                'title' => 'The Evolution of LLMs: From Chatbots to Autonomous Agentic Frameworks',
                'slug' => 'the-evolution-of-llms-from-chatbots-to-autonomous-agents',
                'excerpt' => 'Exploring the paradigm shift from single-prompt interactions to iterative agentic architectures that plan, reason, and execute complex workflows.',
                'tags' => ['ai', 'machinelearning', 'agents', 'technology', 'opensource'],
                'cover_image' => 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80',
                'read_time' => 7,
                'status' => 'published',
                'published_at' => now()->subDays(6),
                'views_count' => 2450,
                'content' => "# The Evolution of LLMs: From Chatbots to Autonomous Agents

We are witnessing a fundamental shift in how artificial intelligence interfaces with software systems. The era of basic question-and-answer prompts is transitioning into proactive, autonomous agents.

## Core Architectural Pillars of Modern Agents

1. **Planning & Decomposition**: Breaking down high-level objectives into actionable sub-tasks.
2. **Tool Use & MCP**: Utilizing external tools (browsers, shell environments, databases, and APIs).
3. **Short & Long-Term Memory**: Leveraging vector embeddings, scratchpads, and execution logs to maintain context.
4. **Self-Correction & Reflection**: Evaluating intermediate results and adjusting strategies dynamically.

## The Future of Programming

Software engineering will increasingly become a collaborative partnership between human architects who specify intent and agentic systems that implement, test, and verify implementations with incredible rigor.",
            ],
        ];

        foreach ($blogsData as $bData) {
            $blog = Blog::updateOrCreate(
                ['slug' => $bData['slug']],
                $bData
            );

            // Seed likes for blog
            Like::updateOrCreate([
                'user_id' => $users['yousef']->id,
                'likeable_id' => $blog->id,
                'likeable_type' => Blog::class,
            ]);
            Like::updateOrCreate([
                'user_id' => $users['sarah_dev']->id,
                'likeable_id' => $blog->id,
                'likeable_type' => Blog::class,
            ]);
        }

        // ── 6. Dynamically Calculate & Store 100% Real Usage Counts for All Hashtags ──
        foreach (Hashtag::all() as $hashtag) {
            $tag = $hashtag->tag;
            $postsCount = $hashtag->posts()->count();
            $blogsCount = Blog::published()->where(function ($w) use ($tag) {
                $w->whereJsonContains('tags', $tag)
                  ->orWhere('title', 'like', "%#{$tag}%")
                  ->orWhere('content', 'like', "%#{$tag}%");
            })->count();

            $totalCount = $postsCount + $blogsCount;
            $hashtag->update(['usage_count' => $totalCount]);
        }
    }
}
