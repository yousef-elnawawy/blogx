<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ArticleController extends Controller
{
    /**
     * Get paginated published articles.
     */
    public function index(Request $request)
    {
        $authUser = $request->user() ?? auth('sanctum')->user();
        $query = Article::published()->with('user')->withCount('likes');

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

        $articles = $query->latest('published_at')->paginate(15);

        $articles->getCollection()->transform(function ($art) use ($authUser) {
            return $this->formatArticle($art, $authUser);
        });

        return response()->json($articles);
    }

    /**
     * Get a featured article for discovery / feed.
     */
    public function featured(Request $request)
    {
        $authUser = $request->user() ?? auth('sanctum')->user();

        $article = Article::published()
            ->whereNotNull('cover_image')
            ->where('cover_image', '!=', '')
            ->with('user')
            ->withCount('likes')
            ->orderByRaw('(views_count + (likes_count * 3)) DESC')
            ->latest('published_at')
            ->first();

        if (!$article) {
            $article = Article::published()
                ->with('user')
                ->withCount('likes')
                ->latest('published_at')
                ->first();
        }

        if (!$article) {
            return response()->json(['article' => null]);
        }

        return response()->json([
            'article' => $this->formatArticle($article, $authUser),
        ]);
    }

    /**
     * Get a single article by slug or ID.
     */
    public function show(Request $request, string $slugOrId)
    {
        $authUser = $request->user() ?? auth('sanctum')->user();

        $raw = $slugOrId;
        $decoded = urldecode($slugOrId);
        $cleanDecoded = urldecode($decoded);

        $article = Article::with('user')
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

        if (!$article) {
            return response()->json(['message' => 'Article not found'], 404);
        }

        // If draft, only owner can view
        if ($article->status === 'draft') {
            if (!$authUser || $authUser->id !== $article->user_id) {
                return response()->json(['message' => 'Article not found'], 404);
            }
        } else {
            $article->increment('views_count');
        }

        return response()->json([
            'article' => $this->formatArticle($article, $authUser),
        ]);
    }

    /**
     * Create a new article or draft.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'       => ['required', 'string', 'max:255'],
            'content'     => ['required', 'string'],
            'excerpt'     => ['nullable', 'string', 'max:2000'],
            'cover_image' => ['nullable'],
            'tags'        => ['nullable'],
            'status'      => ['nullable', 'in:published,draft'],
        ]);

        $status = $validated['status'] ?? 'published';
        $user = $request->user();

        // Generate base slug with UTF-8 / Arabic support
        $baseSlug = Str::slug($validated['title'], '-', null);
        if (empty($baseSlug) || $baseSlug === '-') {
            $baseSlug = 'article-' . Str::random(8);
        }
        $slug = $baseSlug;
        $count = 1;
        while (Article::where('slug', $slug)->exists()) {
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
            $request->validate([
                'cover_image' => ['image', 'max:102400'], // Up to 100MB
            ]);
            $coverPath = $request->file('cover_image')->store('articles', 'public');
        }

        // Process tags
        $tags = [];
        if ($request->has('tags')) {
            $rawTags = $request->input('tags');
            if (is_array($rawTags)) {
                $tags = array_values(array_filter($rawTags));
            } elseif (is_string($rawTags)) {
                $decoded = json_decode($rawTags, true);
                $tags = is_array($decoded) ? $decoded : array_filter(explode(',', $rawTags));
            }
        }

        $article = Article::create([
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

        $article->load('user');
        $article->loadCount('likes');

        return response()->json([
            'message' => $status === 'published' ? 'Article published successfully' : 'Draft saved successfully',
            'article' => $this->formatArticle($article, $user),
        ], 201);
    }

    /**
     * Update an article or publish a draft.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $article = Article::find($id);

        if (!$article) {
            return response()->json(['message' => 'Article not found'], 404);
        }

        if ($article->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title'        => ['nullable', 'string', 'max:255'],
            'content'      => ['nullable', 'string'],
            'excerpt'      => ['nullable', 'string', 'max:2000'],
            'cover_image'  => ['nullable'],
            'remove_cover' => ['nullable', 'boolean'],
            'tags'         => ['nullable'],
            'status'       => ['nullable', 'in:published,draft'],
        ]);

        if (!empty($validated['title']) && $validated['title'] !== $article->title) {
            $baseSlug = Str::slug($validated['title'], '-', null);
            if (empty($baseSlug) || $baseSlug === '-') {
                $baseSlug = 'article-' . Str::random(8);
            }
            $slug = $baseSlug;
            $count = 1;
            while (Article::where('slug', $slug)->where('id', '!=', $article->id)->exists()) {
                $slug = $baseSlug . '-' . $count;
                $count++;
            }
            $article->title = $validated['title'];
            $article->slug = $slug;
        }

        if (isset($validated['content'])) {
            $article->content = $validated['content'];
            $wordCount = str_word_count(strip_tags($validated['content']));
            $article->read_time = max(1, (int) ceil($wordCount / 200));

            if (empty($validated['excerpt'])) {
                $plain = trim(strip_tags($validated['content']));
                $article->excerpt = Str::limit($plain, 180);
            }
        }

        if (isset($validated['excerpt'])) {
            $article->excerpt = $validated['excerpt'];
        }

        if ($request->has('tags')) {
            $rawTags = $request->input('tags');
            if (is_array($rawTags)) {
                $article->tags = array_values(array_filter($rawTags));
            } elseif (is_string($rawTags)) {
                $decoded = json_decode($rawTags, true);
                $article->tags = is_array($decoded) ? $decoded : array_filter(explode(',', $rawTags));
            }
        }

        if (!empty($validated['remove_cover'])) {
            if ($article->cover_image) {
                Storage::disk('public')->delete($article->cover_image);
                $article->cover_image = null;
            }
        }

        if ($request->hasFile('cover_image')) {
            $request->validate([
                'cover_image' => ['image', 'max:102400'], // Up to 100MB
            ]);
            if ($article->cover_image) {
                Storage::disk('public')->delete($article->cover_image);
            }
            $article->cover_image = $request->file('cover_image')->store('articles', 'public');
        }

        if (isset($validated['status'])) {
            if ($article->status === 'draft' && $validated['status'] === 'published') {
                $article->published_at = now();
            }
            $article->status = $validated['status'];
        }

        $article->save();
        $article->load('user');
        $article->loadCount('likes');

        return response()->json([
            'message' => 'Article updated successfully',
            'article' => $this->formatArticle($article, $user),
        ]);
    }

    /**
     * Delete an article.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $article = Article::find($id);

        if (!$article) {
            return response()->json(['message' => 'Article not found'], 404);
        }

        if ($article->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($article->cover_image) {
            Storage::disk('public')->delete($article->cover_image);
        }

        $article->delete();

        return response()->json(['message' => 'Article deleted successfully']);
    }

    /**
     * Toggle like on an article.
     */
    public function toggleLike(Request $request, $id)
    {
        $user = $request->user();
        $article = Article::find($id);

        if (!$article) {
            return response()->json(['message' => 'Article not found'], 404);
        }

        $existingLike = $article->likes()->where('user_id', $user->id)->first();

        if ($existingLike) {
            $existingLike->delete();
            $isLiked = false;
        } else {
            $article->likes()->create(['user_id' => $user->id]);
            $isLiked = true;
        }

        return response()->json([
            'message'     => $isLiked ? 'Article liked' : 'Article unliked',
            'is_liked'    => $isLiked,
            'likes_count' => $article->likes()->count(),
        ]);
    }

    /**
     * Get public published articles for a given username.
     */
    public function userArticles(Request $request, string $username)
    {
        $authUser = $request->user() ?? auth('sanctum')->user();
        $cleanUsername = ltrim(strtolower(urldecode($username)), '@');
        $user = User::where('username', $cleanUsername)->firstOrFail();

        $articles = Article::where('user_id', $user->id)
            ->published()
            ->with('user')
            ->withCount('likes')
            ->latest('published_at')
            ->paginate(15);

        $articles->getCollection()->transform(function ($art) use ($authUser) {
            return $this->formatArticle($art, $authUser);
        });

        return response()->json($articles);
    }

    /**
     * Get authenticated user's private drafts (both articles and posts).
     */
    public function myDrafts(Request $request)
    {
        $user = $request->user();

        $articleDrafts = Article::where('user_id', $user->id)
            ->draft()
            ->latest()
            ->get()
            ->map(function ($art) use ($user) {
                $formatted = $this->formatArticle($art, $user);
                $formatted['type'] = 'article';
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
            'article_drafts' => $articleDrafts,
            'post_drafts'    => $postDrafts,
            'total_drafts'   => $articleDrafts->count() + $postDrafts->count(),
        ]);
    }

    /**
     * Format article for API response.
     */
    public function formatArticle(Article $article, ?User $authUser = null): array
    {
        $coverUrl = $article->cover_image;
        if ($coverUrl && !str_starts_with($coverUrl, 'http')) {
            $coverUrl = config('app.url') . '/storage/' . ltrim($coverUrl, '/');
        }

        $authorAvatar = $article->user ? $article->user->avatar : null;
        if ($authorAvatar && !str_starts_with($authorAvatar, 'http')) {
            $authorAvatar = config('app.url') . $authorAvatar;
        }

        return [
            'id'           => $article->id,
            'title'        => $article->title,
            'slug'         => $article->slug,
            'content'      => $article->content,
            'excerpt'      => $article->excerpt,
            'cover_image'  => $coverUrl,
            'tags'         => $article->tags ?? [],
            'read_time'    => $article->read_time ?? 1,
            'status'       => $article->status,
            'views_count'  => (int) $article->views_count,
            'likes_count'  => (int) ($article->likes_count ?? $article->likes()->count()),
            'is_liked'     => $authUser ? $article->isLikedBy($authUser) : false,
            'published_at' => $article->published_at ? $article->published_at->toIso8601String() : null,
            'created_at'   => $article->created_at ? $article->created_at->toIso8601String() : null,
            'updated_at'   => $article->updated_at ? $article->updated_at->toIso8601String() : null,
            'author'       => [
                'id'       => $article->user ? $article->user->id : null,
                'name'     => $article->user ? $article->user->name : 'Unknown',
                'username' => $article->user ? $article->user->username : 'unknown',
                'avatar'   => $authorAvatar,
                'bio'      => $article->user ? $article->user->bio : null,
                'verified' => $article->user ? (bool) $article->user->verified : false,
            ],
        ];
    }
}
