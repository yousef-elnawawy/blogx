<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Community;
use App\Models\CommunityMember;
use App\Models\Post;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CommunityController extends Controller
{
    /**
     * List all communities (public + search + joined filter).
     */
    public function index(Request $request)
    {
        $user = $request->user() ?? auth('sanctum')->user();
        $query = Community::with(['creator:id,name,username,avatar,verified'])
            ->withCount(['approvedMembers as members_count', 'posts as posts_count']);

        // Search query
        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        // Filter: my joined communities
        if ($request->boolean('joined') && $user) {
            $joinedIds = CommunityMember::where('user_id', $user->id)
                ->where('status', 'approved')
                ->pluck('community_id');
            $query->whereIn('id', $joinedIds);
        }

        $tab = $request->query('tab', 'popular');
        if ($tab === 'newest') {
            $query->latest();
        } else {
            $query->orderByDesc('members_count')->orderByDesc('posts_count');
        }

        $communities = $query->paginate(15);

        $communities->getCollection()->transform(function ($community) use ($user) {
            return $this->formatCommunity($community, $user);
        });

        return response()->json($communities);
    }

    /**
     * Create a new community (authenticated).
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'        => ['required', 'string', 'min:3', 'max:50'],
            'slug'        => ['nullable', 'string', 'min:3', 'max:50', 'unique:communities,slug', 'regex:/^[a-zA-Z0-9-_]+$/'],
            'description' => ['nullable', 'string', 'max:500'],
            'type'        => ['required', 'in:public,restricted,private'],
            'rules'       => ['nullable', 'array', 'max:10'],
            'rules.*'     => ['string', 'max:255'],
            'avatar'      => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
            'cover'       => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:10240'],
        ]);

        $slug = !empty($validated['slug'])
            ? Str::slug($validated['slug'])
            : Str::slug($validated['name']);

        // Ensure unique slug
        $baseSlug = $slug;
        $counter = 1;
        while (Community::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$counter}";
            $counter++;
        }

        $avatarPath = null;
        if ($request->hasFile('avatar')) {
            $avatarPath = $request->file('avatar')->store('communities/avatars', 'public');
        }

        $coverPath = null;
        if ($request->hasFile('cover')) {
            $coverPath = $request->file('cover')->store('communities/covers', 'public');
        }

        $community = Community::create([
            'name'          => $validated['name'],
            'slug'          => $slug,
            'description'   => $validated['description'] ?? null,
            'type'          => $validated['type'],
            'rules'         => $validated['rules'] ?? [],
            'avatar'        => $avatarPath,
            'cover'         => $coverPath,
            'creator_id'    => $user->id,
            'members_count' => 1,
            'posts_count'   => 0,
        ]);

        // Add creator as Admin
        CommunityMember::create([
            'community_id' => $community->id,
            'user_id'      => $user->id,
            'role'         => 'admin',
            'status'       => 'approved',
        ]);

        $community->load(['creator:id,name,username,avatar,verified']);

        return response()->json([
            'message'   => 'Community created successfully',
            'community' => $this->formatCommunity($community, $user),
        ], 201);
    }

    /**
     * Get community details by slug (public).
     */
    public function show(Request $request, $slug)
    {
        $user = $request->user() ?? auth('sanctum')->user();

        $community = Community::where('slug', $slug)
            ->orWhere('id', $slug)
            ->with(['creator:id,name,username,avatar,verified'])
            ->withCount(['approvedMembers as members_count', 'posts as posts_count'])
            ->first();

        if (!$community) {
            return response()->json(['message' => 'Community not found'], 404);
        }

        return response()->json($this->formatCommunity($community, $user));
    }

    /**
     * Update community details (admin/creator only).
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $community = Community::find($id);

        if (!$community) {
            return response()->json(['message' => 'Community not found'], 404);
        }

        if (!$community->isAdmin($user)) {
            return response()->json(['message' => 'Only community admins can edit settings'], 403);
        }

        $validated = $request->validate([
            'name'        => ['nullable', 'string', 'min:3', 'max:50'],
            'description' => ['nullable', 'string', 'max:500'],
            'type'        => ['nullable', 'in:public,restricted,private'],
            'rules'       => ['nullable', 'array', 'max:10'],
            'rules.*'     => ['string', 'max:255'],
            'avatar'      => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
            'cover'       => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:10240'],
        ]);

        if (isset($validated['name'])) $community->name = $validated['name'];
        if (isset($validated['description'])) $community->description = $validated['description'];
        if (isset($validated['type'])) $community->type = $validated['type'];
        if (isset($validated['rules'])) $community->rules = $validated['rules'];

        if ($request->hasFile('avatar')) {
            if ($community->avatar) Storage::disk('public')->delete($community->avatar);
            $community->avatar = $request->file('avatar')->store('communities/avatars', 'public');
        }

        if ($request->hasFile('cover')) {
            if ($community->cover) Storage::disk('public')->delete($community->cover);
            $community->cover = $request->file('cover')->store('communities/covers', 'public');
        }

        $community->save();
        $community->load(['creator:id,name,username,avatar,verified']);

        return response()->json([
            'message'   => 'Community updated successfully',
            'community' => $this->formatCommunity($community, $user),
        ]);
    }

    /**
     * Join or request to join community (authenticated).
     */
    public function join(Request $request, $id)
    {
        $user = $request->user();
        $community = Community::find($id);

        if (!$community) {
            return response()->json(['message' => 'Community not found'], 404);
        }

        $existing = CommunityMember::where('community_id', $community->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            if ($existing->status === 'approved') {
                return response()->json(['message' => 'Already a member of this community', 'status' => 'approved']);
            }
            if ($existing->status === 'pending') {
                return response()->json(['message' => 'Your join request is pending approval', 'status' => 'pending']);
            }
            // If rejected previously, reset to pending/approved
            $existing->delete();
        }

        // If public -> immediately approve
        if ($community->type === 'public') {
            CommunityMember::create([
                'community_id' => $community->id,
                'user_id'      => $user->id,
                'role'         => 'member',
                'status'       => 'approved',
            ]);

            $community->increment('members_count');

            return response()->json([
                'message'       => 'Joined community successfully',
                'status'        => 'approved',
                'members_count' => $community->members_count,
            ]);
        }

        // If restricted -> request pending approval
        CommunityMember::create([
            'community_id' => $community->id,
            'user_id'      => $user->id,
            'role'         => 'member',
            'status'       => 'pending',
        ]);

        NotificationService::sendCommunityJoinRequestNotification($user, $community);

        return response()->json([
            'message'       => 'Join request sent to community admins for approval',
            'status'        => 'pending',
            'members_count' => $community->members_count,
        ]);
    }

    /**
     * Leave community (authenticated).
     */
    public function leave(Request $request, $id)
    {
        $user = $request->user();
        $community = Community::find($id);

        if (!$community) {
            return response()->json(['message' => 'Community not found'], 404);
        }

        if ($community->creator_id === $user->id) {
            return response()->json(['message' => 'Community creator cannot leave their own community'], 400);
        }

        $member = CommunityMember::where('community_id', $community->id)
            ->where('user_id', $user->id)
            ->first();

        if ($member) {
            $wasApproved = $member->status === 'approved';
            $member->delete();

            if ($wasApproved && $community->members_count > 1) {
                $community->decrement('members_count');
            }
        }

        return response()->json([
            'message'       => 'Left community successfully',
            'status'        => 'none',
            'members_count' => $community->fresh()->members_count,
        ]);
    }

    /**
     * List approved community members.
     */
    public function members(Request $request, $id)
    {
        $community = Community::find($id);
        if (!$community) {
            return response()->json(['message' => 'Community not found'], 404);
        }

        $members = CommunityMember::where('community_id', $community->id)
            ->where('status', 'approved')
            ->with(['user:id,name,username,avatar,verified,bio'])
            ->orderByRaw("CASE WHEN role = 'admin' THEN 1 WHEN role = 'moderator' THEN 2 ELSE 3 END")
            ->paginate(20);

        $members->getCollection()->transform(function ($m) {
            $uAvatar = $m->user->avatar;
            if ($uAvatar && !str_starts_with($uAvatar, 'http')) {
                $uAvatar = config('app.url') . $uAvatar;
            }
            return [
                'id'       => $m->user->id,
                'name'     => $m->user->name,
                'username' => $m->user->username,
                'avatar'   => $uAvatar,
                'verified' => (bool) $m->user->verified,
                'bio'      => $m->user->bio,
                'role'     => $m->role,
                'since'    => $m->created_at,
            ];
        });

        return response()->json($members);
    }

    /**
     * List pending join requests (Admin only).
     */
    public function joinRequests(Request $request, $id)
    {
        $user = $request->user();
        $community = Community::find($id);

        if (!$community) {
            return response()->json(['message' => 'Community not found'], 404);
        }

        if (!$community->isAdmin($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $requests = CommunityMember::where('community_id', $community->id)
            ->where('status', 'pending')
            ->with(['user:id,name,username,avatar,verified,bio'])
            ->latest()
            ->paginate(20);

        $requests->getCollection()->transform(function ($m) {
            $uAvatar = $m->user->avatar;
            if ($uAvatar && !str_starts_with($uAvatar, 'http')) {
                $uAvatar = config('app.url') . $uAvatar;
            }
            return [
                'id'           => $m->id,
                'user_id'      => $m->user->id,
                'name'         => $m->user->name,
                'username'     => $m->user->username,
                'avatar'       => $uAvatar,
                'verified'     => (bool) $m->user->verified,
                'bio'          => $m->user->bio,
                'requested_at' => $m->created_at,
            ];
        });

        return response()->json($requests);
    }

    /**
     * Approve a pending join request (Admin only).
     */
    public function approveJoinRequest(Request $request, $id, $userId)
    {
        $user = $request->user();
        $community = Community::find($id);

        if (!$community) {
            return response()->json(['message' => 'Community not found'], 404);
        }

        if (!$community->isAdmin($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $member = CommunityMember::where('community_id', $community->id)
            ->where('user_id', $userId)
            ->where('status', 'pending')
            ->first();

        if (!$member) {
            return response()->json(['message' => 'Request not found'], 404);
        }

        $member->update(['status' => 'approved']);
        $community->increment('members_count');

        $targetUser = User::find($userId);
        if ($targetUser) {
            NotificationService::sendCommunityApprovedNotification($targetUser, $community);
        }

        return response()->json([
            'message'       => 'Join request approved',
            'members_count' => $community->fresh()->members_count,
        ]);
    }

    /**
     * Reject a pending join request (Admin only).
     */
    public function rejectJoinRequest(Request $request, $id, $userId)
    {
        $user = $request->user();
        $community = Community::find($id);

        if (!$community) {
            return response()->json(['message' => 'Community not found'], 404);
        }

        if (!$community->isAdmin($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $member = CommunityMember::where('community_id', $community->id)
            ->where('user_id', $userId)
            ->where('status', 'pending')
            ->first();

        if (!$member) {
            return response()->json(['message' => 'Request not found'], 404);
        }

        $member->delete();

        return response()->json(['message' => 'Join request rejected']);
    }

    /**
     * Get posts for a specific community.
     */
    public function posts(Request $request, $id)
    {
        $user = $request->user() ?? auth('sanctum')->user();
        $community = Community::where('id', $id)->orWhere('slug', $id)->first();

        if (!$community) {
            return response()->json(['message' => 'Community not found'], 404);
        }

        // If restricted community and user is not member or admin, hide posts
        if ($community->type === 'restricted' && !$community->isMember($user) && !$community->isAdmin($user)) {
            return response()->json([
                'data'       => [],
                'is_private' => true,
                'message'    => 'This community is private. Request to join to view posts.',
            ]);
        }

        $postController = new PostController();

        $posts = Post::where('community_id', $community->id)
            ->published()
            ->with(['user', 'images', 'mentions.user', 'repostOf.user', 'repostOf.images', 'quoteOf.user', 'quoteOf.images', 'community'])
            ->withCount(['likes', 'comments'])
            ->latest()
            ->paginate(15);

        $posts->getCollection()->transform(function ($post) use ($user, $postController) {
            return $postController->formatPost($post, $user);
        });

        return response()->json($posts);
    }

    /**
     * Get communities joined by a specific username.
     */
    public function userCommunities(Request $request, $username)
    {
        $user = $request->user() ?? auth('sanctum')->user();
        $targetUser = User::where('username', $username)->first();

        if (!$targetUser) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $joinedIds = CommunityMember::where('user_id', $targetUser->id)
            ->where('status', 'approved')
            ->pluck('community_id');

        $communities = Community::whereIn('id', $joinedIds)
            ->with(['creator:id,name,username,avatar,verified'])
            ->withCount(['approvedMembers as members_count', 'posts as posts_count'])
            ->orderByDesc('members_count')
            ->paginate(15);

        $communities->getCollection()->transform(function ($c) use ($user) {
            return $this->formatCommunity($c, $user);
        });

        return response()->json($communities);
    }

    /**
     * Format a community object for API response.
     */
    public function formatCommunity(Community $community, ?User $user): array
    {
        $avatarUrl = $community->avatar;
        if ($avatarUrl && !str_starts_with($avatarUrl, 'http')) {
            $avatarUrl = config('app.url') . '/storage/' . ltrim($avatarUrl, '/');
        }

        $coverUrl = $community->cover;
        if ($coverUrl && !str_starts_with($coverUrl, 'http')) {
            $coverUrl = config('app.url') . '/storage/' . ltrim($coverUrl, '/');
        }

        $creatorAvatar = $community->creator?->avatar;
        if ($creatorAvatar && !str_starts_with($creatorAvatar, 'http')) {
            $creatorAvatar = config('app.url') . $creatorAvatar;
        }

        $topMembers = $community->approvedMembers()
            ->with('user:id,name,username,avatar,verified')
            ->limit(5)
            ->get()
            ->map(function ($m) {
                $avatar = $m->user?->avatar;
                if ($avatar && !str_starts_with($avatar, 'http')) {
                    $avatar = config('app.url') . $avatar;
                }
                return [
                    'id'       => $m->user?->id,
                    'name'     => $m->user?->name,
                    'username' => $m->user?->username,
                    'avatar'   => $avatar,
                    'verified' => (bool) $m->user?->verified,
                ];
            })
            ->values();

        return [
            'id'            => $community->id,
            'name'          => $community->name,
            'slug'          => $community->slug,
            'description'   => $community->description,
            'type'          => $community->type,
            'rules'         => $community->rules ?? [],
            'avatar'        => $avatarUrl,
            'cover'         => $coverUrl,
            'members_count' => (int) ($community->members_count ?? $community->approvedMembers()->count()),
            'posts_count'   => (int) ($community->posts_count ?? $community->posts()->count()),
            'member_status' => $community->getMemberStatus($user),
            'is_member'     => $community->isMember($user),
            'is_admin'      => $community->isAdmin($user),
            'created_at'    => $community->created_at,
            'top_members'   => $topMembers,
            'creator'       => $community->creator ? [
                'id'       => $community->creator->id,
                'name'     => $community->creator->name,
                'username' => $community->creator->username,
                'avatar'   => $creatorAvatar,
                'verified' => (bool) $community->creator->verified,
            ] : null,
        ];
    }

    /**
     * Delete a community (creator or platform admin only).
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $community = Community::find($id);

        if (!$community) {
            return response()->json(['message' => 'Community not found'], 404);
        }

        if ($community->creator_id !== $user->id && empty($user->is_admin)) {
            return response()->json(['message' => 'Unauthorized: Only the creator can delete this community.'], 403);
        }

        // Clean up images
        if ($community->avatar && !str_starts_with($community->avatar, 'http')) {
            Storage::disk('public')->delete($community->avatar);
        }
        if ($community->cover && !str_starts_with($community->cover, 'http')) {
            Storage::disk('public')->delete($community->cover);
        }

        $community->members()->delete();
        Post::where('community_id', $community->id)->update(['community_id' => null]);
        $community->delete();

        return response()->json(['message' => 'Community deleted successfully']);
    }
}
