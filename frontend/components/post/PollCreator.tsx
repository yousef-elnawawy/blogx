"use client";

import { useState } from "react";
import { Plus, Trash2, X, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface PollDraft {
  question?: string;
  options: string[];
  duration_days: number;
}

interface PollCreatorProps {
  poll: PollDraft;
  onChange: (poll: PollDraft | null) => void;
}

export default function PollCreator({ poll, onChange }: PollCreatorProps) {
  const handleOptionChange = (index: number, value: string) => {
    const nextOptions = [...poll.options];
    nextOptions[index] = value;
    onChange({ ...poll, options: nextOptions });
  };

  const handleAddOption = () => {
    if (poll.options.length < 5) {
      onChange({ ...poll, options: [...poll.options, ""] });
    }
  };

  const handleRemoveOption = (index: number) => {
    if (poll.options.length > 2) {
      const nextOptions = poll.options.filter((_, i) => i !== index);
      onChange({ ...poll, options: nextOptions });
    }
  };

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3.5 sm:p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-primary">
          <BarChart2 className="size-4" />
          <span>Interactive Poll</span>
        </div>

        <button
          type="button"
          onClick={() => onChange(null)}
          className="size-6 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          title="Remove poll"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Options Inputs (2 to 5) */}
      <div className="space-y-2">
        {poll.options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              type="text"
              placeholder={`Option ${index + 1}`}
              maxLength={100}
              value={option}
              onChange={(e) => handleOptionChange(index, e.target.value)}
              className="h-9 rounded-xl border-border bg-background text-xs sm:text-sm px-3 flex-1"
            />
            {poll.options.length > 2 && (
              <button
                type="button"
                onClick={() => handleRemoveOption(index)}
                className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer controls: Add Option & Poll Duration */}
      <div className="flex items-center justify-between pt-1 text-xs">
        {poll.options.length < 5 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAddOption}
            className="h-7 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 gap-1 rounded-lg px-2 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Add option</span>
          </Button>
        ) : (
          <span className="text-[11px] text-muted-foreground">Max 5 options</span>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>Duration:</span>
          <select
            value={poll.duration_days}
            onChange={(e) => onChange({ ...poll, duration_days: Number(e.target.value) })}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground cursor-pointer focus:outline-hidden"
          >
            <option value={1}>1 day</option>
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
          </select>
        </div>
      </div>
    </div>
  );
}
