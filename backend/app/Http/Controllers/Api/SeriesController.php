<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Blog;
use App\Models\Series;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SeriesController extends Controller
{
    /**
     * Get paginated public series.
     */
    public function index(Request $request)
    {
        $query = Series::where('is_published', true)
            ->with(['user', 'publishedBlogs' => function ($q) {
                $q->select('id', 'series_id', 'title', 'slug', 'read_time', 'views_count', 'published_at')
                  ->orderBy('series_order', 'asc');
            }])
            ->withCount('publishedBlogs');

        if ($request->has('q') && !empty($request->q)) {
            $q = $request->q;
            $query->where(function ($w) use ($q) {
                $w->where('title', 'like', "%{$q}%")
                  ->orWhere('description', 'like', "%{$q}%");
            });
        }

        if ($request->has('username') && !empty($request->username)) {
            $un = $request->username;
            $query->whereHas('user', function ($uq) use ($un) {
                $uq->where('username', $un);
            });
        }

        $series = $query->latest()->paginate(15);

        $series->getCollection()->transform(function ($item) {
            $totalReadTime = $item->publishedBlogs->sum('read_time');
            return [
                'id'            => $item->id,
                'title'         => $item->title,
                'slug'          => $item->slug,
                'description'   => $item->description,
                'cover_image'   => $this->formatImageUrl($item->cover_image),
                'views_count'   => (int) $item->views_count,
                'blogs_count'   => (int) $item->published_blogs_count,
                'total_read_time' => (int) ($totalReadTime ?: 1),
                'created_at'    => $item->created_at?->toIso8601String(),
                'author'        => [
                    'id'              => $item->user->id,
                    'name'            => $item->user->name,
                    'username'        => $item->user->username,
                    'avatar'          => $this->formatImageUrl($item->user->avatar),
                    'verified'        => (bool) $item->user->verified,
                    'equipped_badges' => $item->user->equipped_badges ?? [],
                ],
            ];
        });

        return response()->json($series);
    }

    /**
     * Get single series with its ordered blogs.
     */
    public function show(Request $request, string $slugOrId)
    {
        $raw = $slugOrId;
        $decoded = urldecode($slugOrId);

        $series = Series::with(['user', 'publishedBlogs.user'])
            ->where(function ($q) use ($raw, $decoded) {
                $q->where('slug', $raw)
                  ->orWhere('slug', $decoded);
                if (is_numeric($raw)) {
                    $q->orWhere('id', (int) $raw);
                }
            })
            ->first();

        if (!$series) {
            return response()->json(['message' => 'Series not found.'], 404);
        }

        // Increment views
        $series->increment('views_count');

        $blogs = $series->publishedBlogs->map(function ($blog, $index) {
            return [
                'id'           => $blog->id,
                'title'        => $blog->title,
                'slug'         => $blog->slug,
                'excerpt'      => $blog->excerpt,
                'cover_image'  => $this->formatImageUrl($blog->cover_image),
                'read_time'    => (int) $blog->read_time,
                'views_count'  => (int) $blog->views_count,
                'series_order' => (int) ($blog->series_order ?? ($index + 1)),
                'part_number'  => $index + 1,
                'published_at' => $blog->published_at?->toIso8601String(),
            ];
        });

        $totalReadTime = $series->publishedBlogs->sum('read_time');

        return response()->json([
            'series' => [
                'id'              => $series->id,
                'title'           => $series->title,
                'slug'            => $series->slug,
                'description'     => $series->description,
                'cover_image'     => $this->formatImageUrl($series->cover_image),
                'views_count'     => (int) $series->views_count,
                'blogs_count'     => $blogs->count(),
                'total_read_time' => (int) ($totalReadTime ?: 1),
                'created_at'      => $series->created_at?->toIso8601String(),
                'author'          => [
                    'id'              => $series->user->id,
                    'name'            => $series->user->name,
                    'username'        => $series->user->username,
                    'avatar'          => $this->formatImageUrl($series->user->avatar),
                    'verified'        => (bool) $series->user->verified,
                    'bio'             => $series->user->bio,
                    'equipped_badges' => $series->user->equipped_badges ?? [],
                ],
                'blogs'           => $blogs,
            ],
        ]);
    }

    /**
     * Helper to format image and avatar URLs correctly.
     */
    private function formatImageUrl(?string $path): ?string
    {
        if (!$path) return null;
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }
        $clean = ltrim($path, '/');
        if (str_starts_with($clean, 'storage/')) {
            $clean = substr($clean, 8);
        }
        return config('app.url') . '/storage/' . ltrim($clean, '/');
    }

    /**
     * Get current user's series for selection.
     */
    public function userSeries(Request $request)
    {
        $user = $request->user();
        $series = Series::where('user_id', $user->id)
            ->withCount('blogs')
            ->latest()
            ->get()
            ->map(function ($s) {
                return [
                    'id'          => $s->id,
                    'title'       => $s->title,
                    'slug'        => $s->slug,
                    'blogs_count' => (int) $s->blogs_count,
                ];
            });

        return response()->json(['series' => $series]);
    }

    /**
     * Create a new series.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'cover_image' => 'nullable|image|max:5120',
        ]);

        $baseSlug = Str::slug($validated['title']) ?: 'series';
        $slug = $baseSlug;
        $counter = 1;
        while (Series::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$counter}";
            $counter++;
        }

        $coverPath = null;
        if ($request->hasFile('cover_image')) {
            $coverPath = $request->file('cover_image')->store('series_covers', 'public');
        }

        $series = Series::create([
            'user_id'     => $user->id,
            'title'       => $validated['title'],
            'slug'        => $slug,
            'description' => $validated['description'] ?? null,
            'cover_image' => $coverPath,
        ]);

        return response()->json([
            'message' => 'Series created successfully.',
            'series'  => [
                'id'    => $series->id,
                'title' => $series->title,
                'slug'  => $series->slug,
            ],
        ], 201);
    }

    /**
     * Update an existing series.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $series = Series::where('id', $id)->where('user_id', $user->id)->first();

        if (!$series) {
            return response()->json(['message' => 'Series not found or unauthorized.'], 404);
        }

        $validated = $request->validate([
            'title'       => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'cover_image' => 'nullable|image|max:5120',
        ]);

        if (isset($validated['title']) && $validated['title'] !== $series->title) {
            $baseSlug = Str::slug($validated['title']) ?: 'series';
            $slug = $baseSlug;
            $counter = 1;
            while (Series::where('slug', $slug)->where('id', '!=', $series->id)->exists()) {
                $slug = "{$baseSlug}-{$counter}";
                $counter++;
            }
            $series->title = $validated['title'];
            $series->slug = $slug;
        }

        if (array_key_exists('description', $validated)) {
            $series->description = $validated['description'];
        }

        if ($request->hasFile('cover_image')) {
            if ($series->cover_image) {
                Storage::disk('public')->delete($series->cover_image);
            }
            $series->cover_image = $request->file('cover_image')->store('series_covers', 'public');
        }

        $series->save();

        return response()->json([
            'message' => 'Series updated successfully.',
            'series'  => $series,
        ]);
    }

    /**
     * Delete a series.
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $series = Series::where('id', $id)->where('user_id', $user->id)->first();

        if (!$series) {
            return response()->json(['message' => 'Series not found or unauthorized.'], 404);
        }

        // Set series_id to null for associated blogs
        Blog::where('series_id', $series->id)->update([
            'series_id'    => null,
            'series_order' => null,
        ]);

        if ($series->cover_image) {
            Storage::disk('public')->delete($series->cover_image);
        }

        $series->delete();

        return response()->json(['message' => 'Series deleted successfully.']);
    }
}
