<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Poll;
use App\Models\PollOption;
use App\Models\PollVote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PollController extends Controller
{
    /**
     * Cast or change vote on a poll option (authenticated).
     */
    public function vote(Request $request, $id)
    {
        $user = $request->user();
        $poll = Poll::with('options')->find($id);

        if (!$poll) {
            return response()->json(['message' => 'Poll not found'], 404);
        }

        if ($poll->hasEnded()) {
            return response()->json(['message' => 'This poll has ended and is no longer accepting votes.'], 422);
        }

        $validated = $request->validate([
            'option_id' => ['required', 'integer', 'exists:poll_options,id'],
        ]);

        $selectedOption = $poll->options()->where('id', $validated['option_id'])->first();
        if (!$selectedOption) {
            return response()->json(['message' => 'Invalid option for this poll'], 422);
        }

        DB::transaction(function () use ($poll, $selectedOption, $user) {
            $existingVote = PollVote::where('poll_id', $poll->id)
                ->where('user_id', $user->id)
                ->first();

            if ($existingVote) {
                if ($existingVote->poll_option_id === $selectedOption->id) {
                    // Clicking the same option again: remove vote
                    PollOption::where('id', $selectedOption->id)->where('votes_count', '>', 0)->decrement('votes_count');
                    $existingVote->delete();
                } else {
                    // Switch vote to the new option
                    PollOption::where('id', $existingVote->poll_option_id)->where('votes_count', '>', 0)->decrement('votes_count');
                    $selectedOption->increment('votes_count');
                    $existingVote->update(['poll_option_id' => $selectedOption->id]);
                }
            } else {
                // New vote
                $selectedOption->increment('votes_count');
                PollVote::create([
                    'poll_id'        => $poll->id,
                    'poll_option_id' => $selectedOption->id,
                    'user_id'        => $user->id,
                ]);
            }
        });

        $updatedPoll = $poll->fresh(['options']);
        return response()->json([
            'message' => 'Vote recorded successfully',
            'poll'    => $this->formatPoll($updatedPoll, $user),
        ]);
    }

    /**
     * Helper to format a Poll with percentages.
     */
    public function formatPoll(Poll $poll, $user): array
    {
        $totalVotes = (int) $poll->options->sum('votes_count');
        $userVotedOptionId = $poll->userVotedOptionId($user);

        return [
            'id'                   => $poll->id,
            'post_id'              => $poll->post_id,
            'question'             => $poll->question,
            'expires_at'           => $poll->expires_at ? $poll->expires_at->toIso8601String() : null,
            'has_ended'            => $poll->hasEnded(),
            'total_votes'          => $totalVotes,
            'user_voted_option_id' => $userVotedOptionId,
            'options'              => $poll->options->map(function ($opt) use ($totalVotes, $userVotedOptionId) {
                $percentage = $totalVotes > 0 ? (int) round(($opt->votes_count / $totalVotes) * 100) : 0;
                return [
                    'id'          => $opt->id,
                    'text'        => $opt->option_text,
                    'votes_count' => (int) $opt->votes_count,
                    'percentage'  => $percentage,
                    'is_voted'    => $userVotedOptionId === $opt->id,
                ];
            })->values()->toArray(),
        ];
    }
}
