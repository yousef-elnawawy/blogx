"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Hash, Loader2 } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";

interface TrendingHashtag {
  tag: string;
  usage_count: number;
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function TrendingHashtagsSidebar() {
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/hashtags/trending?limit=12")
      .then((r) => setHashtags(r.data.hashtags || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <aside
      className="fixed right-0 top-0 z-40 hidden xl:flex flex-col h-screen border-l border-border bg-background/95 backdrop-blur-sm overflow-y-auto"
      style={{ width: "var(--trending-sidebar-width, 260px)" }}
    >
      <div className="flex flex-col gap-0 pt-6 pb-6">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 pb-3 border-b border-border/50 mb-1">
          <div className="grid place-items-center size-8 rounded-lg bg-brand-hashtag-subtle">
            <TrendingUp className="size-4 text-brand-hashtag" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground font-[family-name:var(--font-fraunces)]">Trending</h2>
            <p className="text-[11px] text-muted-foreground">Popular hashtags</p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : hashtags.length === 0 ? (
          <p className="text-xs text-muted-foreground px-5 py-4">
            No trending hashtags yet. Start posting!
          </p>
        ) : (
          <ul className="flex flex-col">
            {hashtags.map((item, index) => (
              <li key={item.tag}>
                <Link
                  href={`/hashtag/${encodeURIComponent(item.tag)}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors group"
                >
                  {/* Rank number */}
                  <span className="text-[11px] font-bold text-muted-foreground/50 w-4 shrink-0 text-center">
                    {index + 1}
                  </span>

                  {/* Icon */}
                  <div className="grid place-items-center size-8 rounded-lg bg-muted/60 group-hover:bg-brand-hashtag-subtle transition-colors shrink-0">
                    <Hash className="size-3.5 text-muted-foreground group-hover:text-brand-hashtag transition-colors" />
                  </div>

                  {/* Tag info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-brand-hashtag transition-colors">
                      #{item.tag}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.usage_count > 0
                        ? `${formatCount(item.usage_count)} posts`
                        : "New"}
                    </p>
                  </div>

                  {/* Top badge for #1 */}
                  {index === 0 && (
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-wider bg-brand-hashtag-subtle text-brand-hashtag px-1.5 py-0.5 rounded">
                      HOT
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* See all */}
        <div className="px-5 pt-3 mt-1 border-t border-border/50">
          <Link
            href="/search"
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            See all trending →
          </Link>
        </div>
      </div>
    </aside>
  );
}
