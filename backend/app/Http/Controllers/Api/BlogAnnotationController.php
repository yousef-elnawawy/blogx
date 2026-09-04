<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Blog;
use App\Models\BlogAnnotation;
use Illuminate\Http\Request;

class BlogAnnotationController extends Controller
{
    /**
     * Get all public annotations and personal private notes for a blog.
     */
    public function index(Request $request, $blogId)
    {
        $authUser = $request->user() ?? auth('sanctum')->user();

        $blog = Blog::where('id', $blogId)
            ->orWhere('slug', $blogId)
            ->first();

        if (!$blog) {
            return response()->json(['message' => 'Blog post not found'], 404);
        }

        if ($authUser && $authUser->id !== $blog->user_id && $authUser->hasBlockedOrIsBlockedBy($blog->user_id)) {
            return response()->json(['message' => 'Blog post not found'], 404);
        }

        $query = BlogAnnotation::where('blog_id', $blog->id)
            ->with(['user']);

        if ($authUser) {
            // Include public annotations OR private annotations created by auth user
            $blockedIds = $authUser->allBlockedUserIds();
            if (!empty($blockedIds)) {
                $query->whereNotIn('user_id', $blockedIds);
            }

            $query->where(function ($q) use ($authUser) {
                $q->where('is_private', false)
                  ->orWhere('user_id', $authUser->id);
            });
        } else {
            // Guests only see public annotations
            $query->where('is_private', false);
        }

        $annotations = $query->latest('created_at')->get();

        $formatted = $annotations->map(function ($item) use ($authUser) {
            return $item->format($authUser);
        });

        return response()->json([
            'blog_id'     => $blog->id,
            'total'       => $formatted->count(),
            'notes_count' => $formatted->filter(fn($a) => !empty($a['note']))->count(),
            'annotations' => $formatted,
        ]);
    }

    /**
     * Create a new highlight or note on a blog post.
     */
    public function store(Request $request, $blogId)
    {
        $user = $request->user();

        $blog = Blog::where('id', $blogId)
            ->orWhere('slug', $blogId)
            ->first();

        if (!$blog) {
            return response()->json(['message' => 'Blog post not found'], 404);
        }

        if ($user->id !== $blog->user_id && $user->hasBlockedOrIsBlockedBy($blog->user_id)) {
            return response()->json(['message' => 'Cannot annotate this post'], 403);
        }

        $validated = $request->validate([
            'highlighted_text' => ['required', 'string', 'min:2', 'max:2000'],
            'surrounding_text' => ['nullable', 'string', 'max:1000'],
            'note'             => ['nullable', 'string', 'max:2000'],
            'color'            => ['nullable', 'string', 'in:amber,emerald,sky,rose,purple'],
            'is_private'       => ['nullable', 'boolean'],
        ]);

        $annotation = BlogAnnotation::create([
            'blog_id'          => $blog->id,
            'user_id'          => $user->id,
            'highlighted_text' => trim($validated['highlighted_text']),
            'surrounding_text' => isset($validated['surrounding_text']) ? trim($validated['surrounding_text']) : null,
            'note'             => isset($validated['note']) && trim($validated['note']) !== '' ? trim($validated['note']) : null,
            'color'            => $validated['color'] ?? 'amber',
            'is_private'       => (bool) ($validated['is_private'] ?? false),
        ]);

        $annotation->load('user');

        return response()->json([
            'message'    => 'Annotation saved successfully',
            'annotation' => $annotation->format($user),
        ], 201);
    }

    /**
     * Delete an annotation.
     */
    public function destroy(Request $request, $blogId, $id)
    {
        $user = $request->user();

        $annotation = BlogAnnotation::find($id);

        if (!$annotation) {
            return response()->json(['message' => 'Annotation not found'], 404);
        }

        // Only author of the annotation or owner of the blog can delete
        $isAnnotationOwner = $annotation->user_id === $user->id;
        $isBlogOwner = $annotation->blog && $annotation->blog->user_id === $user->id;

        if (!$isAnnotationOwner && !$isBlogOwner) {
            return response()->json(['message' => 'Unauthorized to delete this annotation'], 403);
        }

        $annotation->delete();

        return response()->json([
            'message' => 'Annotation deleted successfully',
            'id'      => (int) $id,
        ]);
    }
}
