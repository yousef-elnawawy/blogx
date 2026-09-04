"use client";

import { useEffect, useState, useMemo } from "react";
import { ListOrdered, ChevronRight, Hash, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface TocItem {
  id: string;
  text: string;
  level: number; // 1 for h1, 2 for h2, 3 for h3
}

export function extractHeadingsFromMarkdown(content: string): TocItem[] {
  if (!content) return [];
  const lines = content.split("\n");
  const items: TocItem[] = [];
  const seenSlugs: Record<string, number> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    let level = 0;
    let rawText = "";

    if (trimmed.startsWith("### ")) {
      level = 3;
      rawText = trimmed.replace(/^###\s+/, "");
    } else if (trimmed.startsWith("## ")) {
      level = 2;
      rawText = trimmed.replace(/^##\s+/, "");
    } else if (trimmed.startsWith("# ")) {
      level = 1;
      rawText = trimmed.replace(/^#\s+/, "");
    }

    if (level > 0 && rawText) {
      // Clean markdown inline markers from title
      const cleanText = rawText
        .replace(/\*\*|__|\*|_|`|\[(.*?)\]\(.*?\)/g, "$1")
        .trim();

      if (cleanText) {
        let slug = cleanText
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, "-")
          .replace(/^-+|-+$/g, "");

        if (!slug) slug = `section-${items.length + 1}`;

        if (seenSlugs[slug]) {
          seenSlugs[slug]++;
          slug = `${slug}-${seenSlugs[slug]}`;
        } else {
          seenSlugs[slug] = 1;
        }

        items.push({
          id: `heading-${slug}`,
          text: cleanText,
          level,
        });
      }
    }
  }

  return items;
}

interface BlogTableOfContentsProps {
  content: string;
  className?: string;
  variant?: "inline" | "sticky-rail" | "floating-popover";
}

export default function BlogTableOfContents({
  content,
  className,
  variant = "inline",
}: BlogTableOfContentsProps) {
  const headings = useMemo(() => extractHeadingsFromMarkdown(content), [content]);
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      const scrollY = window.scrollY + 120;
      let currentActive = headings[0]?.id || "";

      for (let i = 0; i < headings.length; i++) {
        const item = headings[i];
        const el = document.getElementById(item.id);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY;
          if (scrollY >= top) {
            currentActive = item.id;
          }
        }
      }

      setActiveId(currentActive);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [headings]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      setActiveId(id);
      setIsOpen(false);
    }
  };

  if (headings.length < 2) {
    return null;
  }

  // 1. Floating Popover Trigger (Mobile & Quick-Jump)
  if (variant === "floating-popover") {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 px-2.5 rounded-full gap-1.5 text-xs font-semibold bg-background/80 backdrop-blur-md border-border/80 shadow-2xs hover:bg-muted/70",
                className
              )}
            >
              <ListOrdered className="size-3.5 text-primary" />
              <span>Outline</span>
            </Button>
          }
        />
        <DropdownMenuContent
          align="end"
          className="w-72 max-h-[60vh] overflow-y-auto p-3 rounded-2xl border-border/80 bg-background/95 backdrop-blur-md shadow-xl"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
            <div className="flex items-center gap-1.5 font-bold text-xs text-foreground font-[family-name:var(--font-fraunces)]">
              <ListOrdered className="size-3.5 text-primary" />
              <span>Table of Contents</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              {headings.length} sections
            </span>
          </div>
          <nav className="space-y-0.5">
            {headings.map((item) => {
              const isActive = activeId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToHeading(item.id)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 group cursor-pointer",
                    item.level === 1 && "font-bold",
                    item.level === 2 && "ml-2 font-medium",
                    item.level === 3 && "ml-4 text-[11px]",
                    isActive
                      ? "bg-primary/10 text-primary font-bold border-l-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  <span className="size-1 rounded-full bg-primary/40 group-hover:bg-primary shrink-0" />
                  <span className="truncate flex-1">{item.text}</span>
                </button>
              );
            })}
          </nav>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // 2. Inline Card View (Inside blog body at the beginning)
  if (variant === "inline") {
    return (
      <div
        className={cn(
          "my-6 p-4 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs space-y-2.5 shadow-2xs",
          className
        )}
      >
        <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-foreground font-[family-name:var(--font-fraunces)] pb-1.5 border-b border-border/50">
          <ListOrdered className="size-4 text-primary" />
          <span>Table of Contents</span>
        </div>

        <nav className="space-y-1 pt-1 max-h-[340px] overflow-y-auto pr-1">
          {headings.map((item, idx) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollToHeading(item.id)}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 rounded-lg text-xs sm:text-[13px] transition-all flex items-center justify-between group cursor-pointer",
                  item.level === 1 && "font-bold text-foreground",
                  item.level === 2 && "pl-4 font-medium",
                  item.level === 3 && "pl-7 text-[12px]",
                  isActive
                    ? "bg-primary/10 text-primary font-bold border-l-2 border-primary shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[10px] font-mono text-muted-foreground/60 group-hover:text-primary transition-colors">
                    {String(idx + 1).padStart(2, "0")}.
                  </span>
                  <span className="truncate">{item.text}</span>
                </div>
                <ChevronRight className="size-3 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  // 3. Desktop Sticky Rail Mode
  return (
    <div
      className={cn(
        "p-4 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md shadow-xs space-y-3 sticky top-20",
        className
      )}
    >
      <div className="flex items-center justify-between pb-2 border-b border-border/50">
        <div className="flex items-center gap-1.5 font-bold text-xs text-foreground font-[family-name:var(--font-fraunces)]">
          <ListOrdered className="size-3.5 text-primary" />
          <span>Table of Contents</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">
          {headings.length} sections
        </span>
      </div>

      <nav className="space-y-1 max-h-[65vh] overflow-y-auto pr-1">
        {headings.map((item) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => scrollToHeading(item.id)}
              className={cn(
                "w-full text-left px-2 py-1 rounded-md text-xs transition-all flex items-center gap-1.5 group cursor-pointer",
                item.level === 1 && "font-bold",
                item.level === 2 && "pl-3 font-medium",
                item.level === 3 && "pl-5 text-[11px]",
                isActive
                  ? "bg-primary/10 text-primary font-bold border-l-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <span className="truncate">{item.text}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
