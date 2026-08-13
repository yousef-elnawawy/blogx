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
  onActiveIndexChange?: (index: number) => void;
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
  onActiveIndexChange,
  onSelect,
  visible,
  style,
}: MentionSuggestionsProps) {
  const listRef = useRef<HTMLUListElement>(null);

  // Smooth container-only scrolling without polluting parent page/dialog scroll
  useEffect(() => {
    if (listRef.current && activeIndex >= 0) {
      const listEl = listRef.current;
      const itemEl = listEl.children[activeIndex] as HTMLElement | undefined;
      if (itemEl) {
        const itemTop = itemEl.offsetTop;
        const itemBottom = itemTop + itemEl.offsetHeight;
        const listTop = listEl.scrollTop;
        const listBottom = listTop + listEl.clientHeight;

        if (itemTop < listTop) {
          listEl.scrollTop = itemTop;
        } else if (itemBottom > listBottom) {
          listEl.scrollTop = itemBottom - listEl.clientHeight;
        }
      }
    }
  }, [activeIndex]);

  if (!visible || suggestions.length === 0) return null;

  return (
    <div
      style={style}
      className="absolute z-50 w-72 sm:w-80 max-w-[calc(100vw-32px)] rounded-2xl border border-border/80 bg-popover/95 dark:bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/10 dark:shadow-black/60 ring-1 ring-black/5 dark:ring-white/10 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 select-none"
    >
      {/* Sleek minimal header */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/40 bg-muted/30">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <AtSign className="size-3.5 text-primary" />
          <span className="text-[11px] font-semibold tracking-wide">
            Mentions
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
          ↑↓ to navigate
        </span>
      </div>

      {/* Suggestion list */}
      <ul
        ref={listRef}
        className="relative max-h-56 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin scrollbar-thumb-muted-foreground/20"
      >
        {suggestions.map((user, i) => {
          const isActive = i === activeIndex;
          return (
            <li key={user.id}>
              <button
                type="button"
                onMouseEnter={() => onActiveIndexChange?.(i)}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent editor textarea from blurring
                  onSelect(user.username);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-start transition-all duration-100 cursor-pointer ${
                  isActive
                    ? "bg-primary/10 text-foreground font-medium shadow-xs"
                    : "hover:bg-muted/50 text-foreground/90"
                }`}
              >
                <Avatar className="size-8 ring-1 ring-border/50 shrink-0">
                  <AvatarImage src={getAvatarUrl(user.avatar)} alt={user.name} />
                  <AvatarFallback className="text-[11px] font-bold bg-muted text-muted-foreground">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs sm:text-sm font-semibold truncate leading-tight" dir="auto">
                      {user.name}
                    </p>
                    {Boolean(user.verified) && <VerifiedBadge size="sm" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-normal truncate mt-0.5" dir="ltr">
                    @{user.username}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
