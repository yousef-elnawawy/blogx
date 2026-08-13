"use client";

import React, { useEffect, useRef } from "react";
import { Hash, TrendingUp } from "lucide-react";

export interface HashtagSuggestion {
  tag: string;
  usage_count: number;
}

interface HashtagSuggestionsProps {
  suggestions: HashtagSuggestion[];
  activeIndex: number;
  onActiveIndexChange?: (index: number) => void;
  onSelect: (tag: string) => void;
  visible: boolean;
  style?: React.CSSProperties;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export default function HashtagSuggestions({
  suggestions,
  activeIndex,
  onActiveIndexChange,
  onSelect,
  visible,
  style,
}: HashtagSuggestionsProps) {
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
          <TrendingUp className="size-3.5 text-primary" />
          <span className="text-[11px] font-semibold tracking-wide">
            Hashtags
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
        {suggestions.map((item, i) => {
          const isActive = i === activeIndex;
          return (
            <li key={item.tag}>
              <button
                type="button"
                onMouseEnter={() => onActiveIndexChange?.(i)}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent editor textarea blur
                  onSelect(item.tag);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-start transition-all duration-100 cursor-pointer ${
                  isActive
                    ? "bg-primary/10 text-foreground font-medium shadow-xs"
                    : "hover:bg-muted/50 text-foreground/90"
                }`}
              >
                <div
                  className={`grid place-items-center size-8 rounded-lg shrink-0 transition-colors ${
                    isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Hash className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold truncate leading-tight" dir="auto">
                    #{item.tag}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-normal truncate mt-0.5">
                    {item.usage_count > 0
                      ? `${formatCount(item.usage_count)} posts`
                      : "New hashtag"}
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
