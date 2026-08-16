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
      className="absolute z-50 w-64 sm:w-72 max-w-[calc(100vw-32px)] rounded-xl border border-border/70 bg-popover/95 dark:bg-card/95 backdrop-blur-xl shadow-xl shadow-black/10 dark:shadow-black/50 ring-1 ring-black/5 dark:ring-white/10 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 select-none"
    >
      {/* Sleek minimal header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-1.5 text-brand-mention">
          <AtSign className="size-3 text-brand-mention" />
          <span className="text-[10px] font-semibold tracking-wide uppercase">
            Mentions
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
          ↑↓ navigate
        </span>
      </div>

      {/* Suggestion list */}
      <ul
        ref={listRef}
        className="relative max-h-52 overflow-y-auto p-1 space-y-0.5 scrollbar-thin scrollbar-thumb-muted-foreground/20"
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
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-start transition-all duration-100 cursor-pointer ${
                  isActive
                    ? "bg-brand-mention-subtle text-foreground font-medium shadow-xs"
                    : "hover:bg-brand-mention-subtle/50 text-foreground/90"
                }`}
              >
                <Avatar className="size-7 ring-1 ring-border/50 shrink-0">
                  <AvatarImage src={getAvatarUrl(user.avatar)} alt={user.name} />
                  <AvatarFallback className="text-[10px] font-bold bg-brand-mention-subtle text-brand-mention">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-semibold truncate leading-tight" dir="auto">
                      {user.name}
                    </p>
                    {Boolean(user.verified) && <VerifiedBadge size="sm" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-normal truncate mt-0.5" dir="ltr">
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
