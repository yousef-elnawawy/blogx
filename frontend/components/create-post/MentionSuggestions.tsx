"use client";

import React, { useEffect, useRef } from "react";
import { AtSign } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { getAvatarUrl } from "@/lib/utils";

export interface MentionSuggestion {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  verified?: boolean;
}

interface MentionSuggestionsProps {
  suggestions: MentionSuggestion[];
  activeIndex: number;
  onSelect: (username: string) => void;
  visible: boolean;
  style?: React.CSSProperties;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function MentionSuggestions({
  suggestions,
  activeIndex,
  onSelect,
  visible,
  style,
}: MentionSuggestionsProps) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  if (!visible || suggestions.length === 0) return null;

  return (
    <div
      style={style}
      className="absolute z-50 w-full max-w-[280px] sm:max-w-xs rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden animate-in fade-in-0 slide-in-from-top-1 duration-150"
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-sky-500/10">
        <AtSign className="size-3.5 text-sky-500" />
        <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
          Mention People
        </span>
      </div>
      <ul ref={listRef} className="max-h-48 overflow-y-auto divide-y divide-border/20">
        {suggestions.map((user, i) => (
          <li key={user.id}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // prevent textarea blur
                onSelect(user.username);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer ${
                i === activeIndex
                  ? "bg-sky-500/15 text-foreground font-semibold"
                  : "hover:bg-muted/60 text-foreground"
              }`}
            >
              <Avatar className="size-7 ring-1 ring-border/50 shrink-0">
                <AvatarImage src={getAvatarUrl(user.avatar)} alt={user.name} />
                <AvatarFallback className="text-[10px] font-bold bg-muted">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold truncate leading-tight">
                    {user.name}
                  </p>
                  {Boolean(user.verified) && <VerifiedBadge size="sm" />}
                </div>
                <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium truncate">
                  @{user.username}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
