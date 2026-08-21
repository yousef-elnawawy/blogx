"use client";

import { useState } from "react";
import Link from "next/link";
import { Layers, ChevronDown, ChevronUp, ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface SeriesInfo {
  id: number;
  title: string;
  slug: string;
  current_part: number;
  total_parts: number;
  prev_blog?: {
    id: number;
    title: string;
    slug: string;
  } | null;
  next_blog?: {
    id: number;
    title: string;
    slug: string;
  } | null;
  all_parts?: Array<{
    id: number;
    title: string;
    slug: string;
    part_number: number;
    read_time: number;
    is_current: boolean;
  }>;
}

export default function SeriesNavigationBanner({ series }: { series: SeriesInfo }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!series) return null;

  return (
    <div className="my-6 rounded-xl border border-border/80 bg-muted/20 p-4 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
            <Layers className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-primary">
                Part {series.current_part} of {series.total_parts}
              </span>
              <span className="text-muted-foreground">·</span>
              <Link
                href={`/series/${series.slug}`}
                className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Series Overview
              </Link>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-foreground leading-tight font-[family-name:var(--font-fraunces)] mt-0.5">
              {series.title}
            </h4>
          </div>
        </div>

        {/* Toggle Parts Drawer Button */}
        {series.all_parts && series.all_parts.length > 1 && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-foreground bg-background border border-border hover:bg-muted transition-colors cursor-pointer"
          >
            <span>{isOpen ? "Hide Parts" : `View ${series.total_parts} Parts`}</span>
            {isOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        )}
      </div>

      {/* Collapsible List of All Parts in Series */}
      {isOpen && series.all_parts && (
        <div className="mt-3 pt-3 border-t border-border/60 space-y-1 animate-in fade-in-0 duration-150">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Table of Contents
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar pr-1">
            {series.all_parts.map((part) => (
              <Link
                key={part.id}
                href={`/blog/${part.slug}`}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs transition-colors",
                  part.is_current
                    ? "bg-primary text-primary-foreground font-bold"
                    : "hover:bg-muted text-foreground/90 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span
                    className={cn(
                      "size-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                      part.is_current
                        ? "bg-primary-foreground text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {part.part_number}
                  </span>
                  <span className="truncate">{part.title}</span>
                </div>
                <span className="text-[11px] shrink-0 opacity-80">{part.read_time} min</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Prev / Next Navigation Footers */}
      {(series.prev_blog || series.next_blog) && (
        <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
          {series.prev_blog ? (
            <Link
              href={`/blog/${series.prev_blog.slug}`}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="size-3.5 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
              <div className="truncate">
                <span className="text-[10px] uppercase font-bold text-muted-foreground/70 block">Previous</span>
                <span className="font-medium text-foreground truncate block">{series.prev_blog.title}</span>
              </div>
            </Link>
          ) : (
            <div />
          )}

          {series.next_blog ? (
            <Link
              href={`/blog/${series.next_blog.slug}`}
              className="flex items-center justify-end text-right gap-2 p-2 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors group ml-auto"
            >
              <div className="truncate">
                <span className="text-[10px] uppercase font-bold text-muted-foreground/70 block">Next Part</span>
                <span className="font-medium text-foreground truncate block">{series.next_blog.title}</span>
              </div>
              <ArrowRight className="size-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            <div />
          )}
        </div>
      )}
    </div>
  );
}
