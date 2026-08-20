"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

export interface PollOptionItem {
  id: number;
  text: string;
  votes_count: number;
  percentage: number;
  is_voted?: boolean;
}

export interface PollData {
  id: number;
  post_id: number;
  question?: string | null;
  expires_at?: string | null;
  has_ended: boolean;
  total_votes: number;
  user_voted_option_id: number | null;
  options: PollOptionItem[];
}

interface PollWidgetProps {
  poll: PollData;
  onVoteSuccess?: (updatedPoll: PollData) => void;
}

export default function PollWidget({ poll: initialPoll, onVoteSuccess }: PollWidgetProps) {
  const { user } = useAuth();
  const [poll, setPoll] = useState<PollData>(initialPoll);
  const [votingOptionId, setVotingOptionId] = useState<number | null>(null);

  const hasVoted = Boolean(poll.user_voted_option_id);
  const showResults = hasVoted || poll.has_ended;

  const handleVote = async (e: React.MouseEvent, optionId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Please sign in to vote in this poll");
      return;
    }

    if (poll.has_ended) {
      toast.error("This poll has ended");
      return;
    }

    if (votingOptionId !== null) return;

    setVotingOptionId(optionId);

    try {
      const res = await api.post(`/api/polls/${poll.id}/vote`, { option_id: optionId });
      const updated = res.data.poll;
      setPoll(updated);
      if (onVoteSuccess) {
        onVoteSuccess(updated);
      }
      toast.success(res.data.message || "Vote recorded!");
    } catch {
      toast.error("Failed to submit vote");
    } finally {
      setVotingOptionId(null);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="my-3 rounded-2xl border border-border/80 bg-card/60 p-3.5 sm:p-4 space-y-2.5 shadow-2xs backdrop-blur-xs select-none"
    >
      {/* Optional Poll Question */}
      {poll.question && (
        <h4 className="text-sm font-bold text-foreground leading-snug">
          {poll.question}
        </h4>
      )}

      {/* Options List */}
      <div className="space-y-2">
        {poll.options.map((option) => {
          const isSelected = poll.user_voted_option_id === option.id;
          const isVotingThis = votingOptionId === option.id;

          if (showResults) {
            // YouTube / Twitter Style Percentage Progress Bar
            return (
              <div
                key={option.id}
                onClick={(e) => !poll.has_ended && handleVote(e, option.id)}
                className={cn(
                  "relative overflow-hidden rounded-xl border p-3 transition-all cursor-pointer",
                  isSelected
                    ? "border-primary/80 bg-primary/10 font-bold"
                    : "border-border/70 bg-muted/40 hover:bg-muted/60 text-foreground/90"
                )}
              >
                {/* Progress bar background fill */}
                <div
                  className={cn(
                    "absolute top-0 bottom-0 left-0 transition-all duration-500 ease-out -z-0",
                    isSelected
                      ? "bg-primary/20 dark:bg-primary/25"
                      : "bg-muted-foreground/15 dark:bg-muted-foreground/20"
                  )}
                  style={{ width: `${Math.max(2, option.percentage)}%` }}
                />

                <div className="relative z-10 flex items-center justify-between gap-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    {isSelected && (
                      <div className="size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                        <Check className="size-2.5 stroke-[3]" />
                      </div>
                    )}
                    <span className="truncate">{option.text}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-semibold">
                    <span className="font-mono">{option.percentage}%</span>
                  </div>
                </div>
              </div>
            );
          }

          // Unvoted state: Clean clickable choice buttons
          return (
            <button
              key={option.id}
              type="button"
              disabled={votingOptionId !== null}
              onClick={(e) => handleVote(e, option.id)}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-border/80 bg-card hover:border-primary/60 hover:bg-primary/5 active:scale-[0.99] text-xs sm:text-sm font-semibold text-foreground transition-all cursor-pointer group text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-4 rounded-full border-2 border-muted-foreground/50 group-hover:border-primary shrink-0 transition-colors" />
                <span className="truncate">{option.text}</span>
              </div>

              {isVotingThis && <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Footer Info: Total Votes & Status */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 px-0.5">
        <span>
          {poll.total_votes} {poll.total_votes === 1 ? "vote" : "votes"}
        </span>
        <span>
          {poll.has_ended ? (
            <span className="font-medium text-amber-600 dark:text-amber-500">Final results</span>
          ) : hasVoted ? (
            <span>Vote recorded • Click option to change</span>
          ) : (
            <span>Poll is active</span>
          )}
        </span>
      </div>
    </div>
  );
}
