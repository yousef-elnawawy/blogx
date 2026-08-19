<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Blog;
use App\Models\Bookmark;
use App\Models\Post;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BlogController extends Controller
{
    /**
     * Get paginated published blogs.
     */
    public function index(Request $request)
    {
        $authUser = $request->user() ?? auth('sanctum')->user();
        $query = Blog::published()->with('user')->withCount('likes');

        if ($request->has('tag') && !empty($request->tag)) {
            $tag = $request->tag;
            $query->whereJsonContains('tags', $tag);
        }

        if ($request->has('q') && !empty($request->q)) {
            $q = $request->q;
            $query->where(function ($w) use ($q) {
                $w->where('title', 'like', "%{$q}%")
                  ->orWhere('content', 'like', "%{$q}%")
                  ->orWhere('excerpt', 'like', "%{$q}%");
            });
        }

        $blogs = $query->latest('published_at')->paginate(15);

        $blogs->getCollection()->transform(function ($blog) use ($authUser) {
            return $this->formatBlog($blog, $authUser);
        });

        return response()->json($blogs);
    }

    /**
     * Get a featured blog for discovery / feed.
     */
    public function featured(Request $request)
    {
        $authUser = $request->user() ?? auth('sanctum')->user();

        $blog = Blog::published()
            ->whereNotNull('cover_image')
            ->where('cover_image', '!=', '')
            ->with('user')
            ->withCount('likes')
            ->orderByRaw('(views_count + (likes_count * 3)) DESC')
            ->latest('published_at')
            ->first();

        if (!$blog) {
            $blog = Blog::published()
                ->with('user')
                ->withCount('likes')
                ->latest('published_at')
                ->first();
        }

        if (!$blog) {
            return response()->json(['blog' => null, 'article' => null]);
        }

        $formatted = $this->formatBlog($blog, $authUser);

        return response()->json([
            'blog'    => $formatted,
            'article' => $formatted, // for backward compatibility during transition
        ]);
    }

    /**
     * Get a single blog by slug or ID.
     */
    public function show(Request $request, string $slugOrId)
    {
        $authUser = $request->user() ?? auth('sanctum')->user();

        $raw = $slugOrId;
        $decoded = urldecode($slugOrId);
        $cleanDecoded = urldecode($decoded);

        $blog = Blog::with('user')
            ->withCount('likes')
            ->where(function ($q) use ($raw, $decoded, $cleanDecoded) {
                $q->where('slug', $raw)
                  ->orWhere('slug', $decoded)
                  ->orWhere('slug', $cleanDecoded);
                if (is_numeric($raw)) {
                    $q->orWhere('id', (int)$raw);
                }
            })
            ->first();

        if (!$blog) {
            return response()->json(['message' => 'Blog post not found'], 404);
        }

        // If draft, only owner can view
        if ($blog->status === 'draft') {
            if (!$authUser || $authUser->id !== $blog->user_id) {
                return response()->json(['message' => 'Blog post not found'], 404);
            }
        } else {
            $blog->increment('views_count');
        }

        $formatted = $this->formatBlog($blog, $authUser);

        return response()->json([
            'blog'    => $formatted,
            'article' => $formatted,
        ]);
    }

    /**
     * Create a new blog or draft.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'       => ['required', 'string', 'max:255'],
            'content'     => ['required', 'string'],
            'excerpt'     => ['nullable', 'string', 'max:2000'],
            'cover_image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:10240'],
            'tags'        => ['nullable'],
            'status'      => ['nullable', 'in:published,draft'],
        ]);

        $status = $validated['status'] ?? 'published';
        $user = $request->user();

        // Generate base slug with UTF-8 / Arabic support
        $baseSlug = Str::slug($validated['title'], '-', null);
        if (empty($baseSlug) || $baseSlug === '-') {
            $baseSlug = 'blog-' . Str::random(8);
        }
        $slug = $baseSlug;
        $count = 1;
        while (Blog::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $count;
            $count++;
        }

        // Calculate reading time
        $wordCount = str_word_count(strip_tags($validated['content']));
        $readTime = max(1, (int) ceil($wordCount / 200));

        // Auto generate excerpt if not provided
        $excerpt = $validated['excerpt'] ?? null;
        if (empty($excerpt)) {
            $plain = trim(strip_tags($validated['content']));
            $excerpt = Str::limit($plain, 180);
        }

        $coverPath = null;
        if ($request->hasFile('cover_image')) {
            $coverPath = $request->file('cover_image')->store('blog_covers', 'public');
        }

        // Parse tags
        $tags = [];
        if ($request->has('tags')) {
            $rawTags = $request->input('tags');
            if (is_array($rawTags)) {
                $tags = array_values(array_filter($rawTags));
            } elseif (is_string($rawTags)) {
                $tags = array_map('trim', explode(',', $rawTags));
            }
        }

        $blog = Blog::create([
            'user_id'      => $user->id,
            'title'        => $validated['title'],
            'slug'         => $slug,
            'content'      => $validated['content'],
            'excerpt'      => $excerpt,
            'cover_image'  => $coverPath,
            'tags'         => $tags,
            'read_time'    => $readTime,
            'status'       => $status,
            'published_at' => $status === 'published' ? now() : null,
        ]);

        if ($status === 'published') {
            NotificationService::sendNewBlogNotification($user, $blog);
        }

        $formatted = $this->formatBlog($blog, $user);

        return response()->json([
            'message' => $status === 'published' ? 'Blog post published successfully' : 'Draft saved successfully',
            'blog'    => $formatted,
            'article' => $formatted,
        ], 201);
    }

    /**
     * Update an existing blog post.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $blog = Blog::where('id', $id)->firstOrFail();

        if ($blog->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title'        => ['sometimes', 'required', 'string', 'max:255'],
            'content'      => ['sometimes', 'required', 'string'],
            'excerpt'      => ['nullable', 'string', 'max:2000'],
            'cover_image'  => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:10240'],
            'remove_cover' => ['nullable', 'boolean'],
            'tags'         => ['nullable'],
            'status'       => ['nullable', 'in:published,draft'],
        ]);

        if (isset($validated['title']) && $validated['title'] !== $blog->title) {
            $baseSlug = Str::slug($validated['title'], '-', null);
            if (empty($baseSlug) || $baseSlug === '-') {
                $baseSlug = 'blog-' . Str::random(8);
            }
            $slug = $baseSlug;
            $count = 1;
            while (Blog::where('slug', $slug)->where('id', '!=', $blog->id)->exists()) {
                $slug = $baseSlug . '-' . $count;
                $count++;
            }
            $blog->slug = $slug;
            $blog->title = $validated['title'];
        }

        if (isset($validated['content'])) {
            $blog->content = $validated['content'];
            $wordCount = str_word_count(strip_tags($validated['content']));
            $blog->read_time = max(1, (int) ceil($wordCount / 200));
        }

        if (array_key_exists('excerpt', $validated)) {
            $blog->excerpt = $validated['excerpt'];
        }

        if ($request->boolean('remove_cover')) {
            if ($blog->cover_image) {
                Storage::disk('public')->delete($blog->cover_image);
            }
            $blog->cover_image = null;
        } elseif ($request->hasFile('cover_image')) {
            if ($blog->cover_image) {
                Storage::disk('public')->delete($blog->cover_image);
            }
            $blog->cover_image = $request->file('cover_image')->store('blog_covers', 'public');
        }

        if ($request->has('tags')) {
            $rawTags = $request->input('tags');
            if (is_array($rawTags)) {
                $blog->tags = array_values(array_filter($rawTags));
            } elseif (is_string($rawTags)) {
                $blog->tags = array_map('trim', explode(',', $rawTags));
            }
        }

        if (isset($validated['status'])) {
            if ($validated['status'] === 'published' && $blog->status === 'draft') {
                $blog->published_at = now();
                NotificationService::sendNewBlogNotification($user, $blog);
            }
            $blog->status = $validated['status'];
        }

        $blog->save();

        $formatted = $this->formatBlog($blog->fresh(), $user);

        return response()->json([
            'message' => 'Blog post updated successfully',
            'blog'    => $formatted,
            'article' => $formatted,
        ]);
    }

    /**
     * Delete a blog post.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $blog = Blog::where('id', $id)->firstOrFail();

        if ($blog->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($blog->cover_image) {
            Storage::disk('public')->delete($blog->cover_image);
        }

        $blog->likes()->delete();
        $blog->delete();

        return response()->json(['message' => 'Blog post deleted successfully']);
    }

    /**
     * Toggle like on a blog post.
     */
    public function toggleLike(Request $request, $id)
    {
        $user = $request->user();
        $blog = Blog::where('id', $id)->firstOrFail();

        $existing = $blog->likes()->where('user_id', $user->id)->first();
        if ($existing) {
            $existing->delete();
            $liked = false;
        } else {
            $blog->likes()->create(['user_id' => $user->id]);
            $liked = true;
            NotificationService::sendLikeBlogNotification($user, $blog);
        }

        $likesCount = $blog->likes()->count();

        return response()->json([
            'is_liked'    => $liked,
            'likes_count' => $likesCount,
        ]);
    }

    /**
     * Toggle bookmark on a blog post.
     */
    public function toggleBookmark(Request $request, $id)
    {
        $user = $request->user();
        $blog = Blog::where('id', $id)->firstOrFail();

        $existing = Bookmark::where('user_id', $user->id)->where('blog_id', $blog->id)->first();
        if ($existing) {
            $existing->delete();
            $bookmarked = false;
        } else {
            Bookmark::create([
                'user_id' => $user->id,
                'blog_id' => $blog->id,
            ]);
            $bookmarked = true;
        }

        return response()->json([
            'is_bookmarked' => $bookmarked,
            'message'       => $bookmarked ? 'Blog post saved' : 'Blog post removed from saved',
        ]);
    }

    /**
     * Get user's published blogs.
     */
    public function userBlogs(Request $request, string $username)
    {
        $authUser = $request->user() ?? auth('sanctum')->user();
        $targetUser = User::where('username', $username)->firstOrFail();

        $blogs = Blog::where('user_id', $targetUser->id)
            ->published()
            ->with('user')
            ->withCount('likes')
            ->latest('published_at')
            ->paginate(15);

        $blogs->getCollection()->transform(function ($blog) use ($authUser) {
            return $this->formatBlog($blog, $authUser);
        });

        return response()->json($blogs);
    }

    /**
     * Get authenticated user's private drafts.
     */
    public function myDrafts(Request $request)
    {
        $user = $request->user();

        $blogDrafts = Blog::where('user_id', $user->id)
            ->draft()
            ->latest()
            ->get()
            ->map(function ($blog) use ($user) {
                $formatted = $this->formatBlog($blog, $user);
                $formatted['type'] = 'blog';
                return $formatted;
            });

        $postController = new PostController();
        $postDrafts = Post::where('user_id', $user->id)
            ->where('status', 'draft')
            ->with(['user', 'images', 'mentions.user'])
            ->withCount(['likes', 'comments'])
            ->latest()
            ->get()
            ->map(function ($post) use ($user, $postController) {
                $formatted = $postController->formatPost($post, $user);
                $formatted['type'] = 'post';
                return $formatted;
            });

        return response()->json([
            'blog_drafts'    => $blogDrafts,
            'article_drafts' => $blogDrafts, // backwards compatibility
            'post_drafts'    => $postDrafts,
            'total_drafts'   => $blogDrafts->count() + $postDrafts->count(),
        ]);
    }

    /**
     * Format blog for API response.
     */
    public function formatBlog(Blog $blog, ?User $authUser = null): array
    {
        $coverUrl = $blog->cover_image;
        if ($coverUrl && !str_starts_with($coverUrl, 'http')) {
            $coverUrl = config('app.url') . '/storage/' . ltrim($coverUrl, '/');
        }

        $authorAvatar = $blog->user ? $blog->user->avatar : null;
        if ($authorAvatar && !str_starts_with($authorAvatar, 'http')) {
            $authorAvatar = config('app.url') . $authorAvatar;
        }

        return [
            'id'           => $blog->id,
            'title'        => $blog->title,
            'slug'         => $blog->slug,
            'content'      => $blog->content,
            'excerpt'      => $blog->excerpt,
            'cover_image'  => $coverUrl,
            'tags'         => $blog->tags ?? [],
            'read_time'    => $blog->read_time ?? 1,
            'status'       => $blog->status,
            'views_count'  => (int) $blog->views_count,
            'likes_count'  => (int) ($blog->likes_count ?? $blog->likes()->count()),
            'is_liked'      => $authUser ? $blog->isLikedBy($authUser) : false,
            'is_bookmarked' => $authUser ? $blog->isBookmarkedBy($authUser) : false,
            'published_at'  => $blog->published_at ? $blog->published_at->toIso8601String() : null,
            'created_at'   => $blog->created_at ? $blog->created_at->toIso8601String() : null,
            'updated_at'   => $blog->updated_at ? $blog->updated_at->toIso8601String() : null,
            'author'       => [
                'id'              => $blog->user ? $blog->user->id : null,
                'name'            => $blog->user ? $blog->user->name : 'Unknown',
                'username'        => $blog->user ? $blog->user->username : 'unknown',
                'avatar'          => $authorAvatar,
                'bio'             => $blog->user ? $blog->user->bio : null,
                'verified'        => (bool) ($blog->user ? $blog->user->verified : false),
                'equipped_badges' => $blog->user ? ($blog->user->equipped_badges ?? []) : [],
            ],
        ];
    }
}
