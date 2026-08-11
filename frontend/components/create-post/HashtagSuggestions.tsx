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
  onSelect,
  visible,
  style,
}: HashtagSuggestionsProps) {
  const listRef = useRef<HTMLUListElement>(null);

  // Scroll active item into view
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
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-muted/40">
        <TrendingUp className="size-3.5 text-primary" />
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Hashtag Suggestions
        </span>
      </div>
      <ul ref={listRef} className="max-h-48 overflow-y-auto divide-y divide-border/20">
        {suggestions.map((item, i) => (
          <li key={item.tag}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // prevent textarea blur
                onSelect(item.tag);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer ${
                i === activeIndex
                  ? "bg-primary/10 text-primary font-semibold"
                  : "hover:bg-muted/60 text-foreground"
              }`}
            >
              <div
                className={`grid place-items-center size-7 rounded-lg shrink-0 ${
                  i === activeIndex ? "bg-primary/15" : "bg-muted"
                }`}
              >
                <Hash
                  className={`size-3.5 ${
                    i === activeIndex ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">#{item.tag}</p>
                <p className="text-[11px] text-muted-foreground">
                  {item.usage_count > 0
                    ? `${formatCount(item.usage_count)} posts`
                    : "New hashtag"}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
