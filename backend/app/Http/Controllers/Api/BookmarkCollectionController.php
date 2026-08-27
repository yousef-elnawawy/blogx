<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bookmark;
use App\Models\BookmarkCollection;
use Illuminate\Http\Request;

class BookmarkCollectionController extends Controller
{
    /**
     * List user's collections with item counts.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $collections = BookmarkCollection::where('user_id', $user->id)
            ->withCount(['bookmarks as posts_count' => function ($q) {
                $q->whereNotNull('post_id');
            }])
            ->withCount(['bookmarks as blogs_count' => function ($q) {
                $q->whereNotNull('blog_id');
            }])
            ->latest()
            ->get();

        return response()->json([
            'collections' => $collections,
        ]);
    }

    /**
     * Create a new bookmark collection.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:255'],
            'color'       => ['nullable', 'string', 'max:30'],
            'icon'        => ['nullable', 'string', 'max:30'],
        ]);

        $collection = BookmarkCollection::create([
            'user_id'     => $request->user()->id,
            'name'        => $validated['name'],
            'description' => $validated['description'] ?? null,
            'color'       => $validated['color'] ?? 'blue',
            'icon'        => $validated['icon'] ?? 'folder',
        ]);

        $collection->posts_count = 0;
        $collection->blogs_count = 0;

        return response()->json([
            'message'    => 'Collection created successfully',
            'collection' => $collection,
        ], 201);
    }

    /**
     * Update an existing collection.
     */
    public function update(Request $request, $id)
    {
        $collection = BookmarkCollection::where('user_id', $request->user()->id)
            ->findOrFail($id);

        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:255'],
            'color'       => ['nullable', 'string', 'max:30'],
            'icon'        => ['nullable', 'string', 'max:30'],
        ]);

        $collection->update($validated);

        return response()->json([
            'message'    => 'Collection updated successfully',
            'collection' => $collection,
        ]);
    }

    /**
     * Delete a collection (bookmarks are kept, collection_id is set to null).
     */
    public function destroy(Request $request, $id)
    {
        $collection = BookmarkCollection::where('user_id', $request->user()->id)
            ->findOrFail($id);

        $collection->delete();

        return response()->json([
            'message' => 'Collection deleted successfully',
        ]);
    }

    /**
     * Assign / Move / Remove bookmark to a collection.
     */
    public function assignBookmark(Request $request)
    {
        $validated = $request->validate([
            'post_id'       => ['nullable', 'integer', 'exists:posts,id'],
            'blog_id'       => ['nullable', 'integer', 'exists:blogs,id'],
            'collection_id' => ['nullable', 'integer', 'exists:bookmark_collections,id'],
        ]);

        $user = $request->user();

        // Verify collection belongs to user if specified
        if (!empty($validated['collection_id'])) {
            BookmarkCollection::where('user_id', $user->id)
                ->where('id', $validated['collection_id'])
                ->firstOrFail();
        }

        $bookmark = null;
        if (!empty($validated['post_id'])) {
            $bookmark = Bookmark::firstOrCreate([
                'user_id' => $user->id,
                'post_id' => $validated['post_id'],
            ]);
        } elseif (!empty($validated['blog_id'])) {
            $bookmark = Bookmark::firstOrCreate([
                'user_id' => $user->id,
                'blog_id' => $validated['blog_id'],
            ]);
        }

        if (!$bookmark) {
            return response()->json(['message' => 'Item not found'], 400);
        }

        $bookmark->collection_id = $validated['collection_id'] ?? null;
        $bookmark->save();

        return response()->json([
            'message'       => 'Saved to collection',
            'collection_id' => $bookmark->collection_id,
        ]);
    }
}
