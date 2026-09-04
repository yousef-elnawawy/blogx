"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface BlogReadingProgressBarProps {
  targetRef?: React.RefObject<HTMLElement | null>;
  className?: string;
  showBadge?: boolean;
}

export default function BlogReadingProgressBar({
  targetRef,
  className,
  showBadge = false,
}: BlogReadingProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const calculateProgress = () => {
      let currentProgress = 0;

      if (targetRef && targetRef.current) {
        const element = targetRef.current;
        const rect = element.getBoundingClientRect();
        const elementTop = rect.top + window.scrollY;
        const elementHeight = element.offsetHeight;
        const windowHeight = window.innerHeight;
        const scrollPosition = window.scrollY;

        // If above the article, progress is 0%
        if (scrollPosition < elementTop) {
          currentProgress = 0;
        } else {
          // Total scrollable distance through the element
          const totalDistance = elementHeight - windowHeight + 120;
          if (totalDistance > 0) {
            const scrolledDistance = scrollPosition - elementTop;
            currentProgress = Math.min(100, Math.max(0, (scrolledDistance / totalDistance) * 100));
          } else {
            currentProgress = 100;
          }
        }
      } else {
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (totalHeight > 0) {
          currentProgress = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
        }
      }

      setProgress(Math.round(currentProgress));
      setIsVisible(window.scrollY > 120);
    };

    window.addEventListener("scroll", calculateProgress, { passive: true });
    window.addEventListener("resize", calculateProgress, { passive: true });
    calculateProgress();

    return () => {
      window.removeEventListener("scroll", calculateProgress);
      window.removeEventListener("resize", calculateProgress);
    };
  }, [targetRef]);

  return (
    <>
      {/* Top 3px Progress Line */}
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 h-[3px] pointer-events-none bg-border/20 backdrop-blur-xs transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0",
          className
        )}
      >
        <div
          className="h-full bg-linear-to-r from-primary via-amber-500 to-rose-500 transition-[width] duration-150 ease-out shadow-[0_0_10px_rgba(245,158,11,0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Optional Floating / Header Badge */}
      {showBadge && isVisible && (
        <div className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20 backdrop-blur-md shadow-2xs animate-in fade-in zoom-in-95 duration-200">
          <span>{progress}%</span>
          <span className="text-muted-foreground text-[9px]">read</span>
        </div>
      )}
    </>
  );
}
