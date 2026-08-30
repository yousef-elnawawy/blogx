"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostImageGridProps {
  images: string[];
  onImageClick: (index: number) => void;
}

export default function PostImageGrid({
  images,
  onImageClick,
}: PostImageGridProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!images || images.length === 0) return null;

  const count = images.length;

  const handleTileClick = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onImageClick(index);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentIndex < count - 1) {
      scrollToIndex(currentIndex + 1);
    }
  };

  const scrollToIndex = (index: number) => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    containerRef.current.scrollTo({
      left: width * index,
      behavior: "smooth",
    });
    setCurrentIndex(index);
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    if (width > 0) {
      const newIndex = Math.round(containerRef.current.scrollLeft / width);
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < count) {
        setCurrentIndex(newIndex);
      }
    }
  };

  // Single Image: Adaptive Card
  if (count === 1) {
    return (
      <div
        onClick={handleTileClick(0)}
        className="relative w-full max-h-[500px] rounded-2xl overflow-hidden cursor-pointer group z-10 pointer-events-auto border border-border/70 bg-muted/20 flex items-center justify-center shadow-2xs hover:border-primary/40 transition-colors"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[0]}
          alt="Post image"
          loading="lazy"
          className="w-full h-auto max-h-[500px] object-contain rounded-2xl transition-transform duration-300 group-hover:scale-[1.01]"
        />
      </div>
    );
  }

  // Multi-Image: Instagram-Style Carousel (One Image at a Time)
  return (
    <div className="relative w-full rounded-2xl overflow-hidden z-10 pointer-events-auto border border-border/70 bg-muted/20 shadow-2xs group select-none">
      {/* Top Right Counter Badge (e.g. 1/4) */}
      <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-[11px] font-bold tracking-wider flex items-center gap-1 shadow-sm pointer-events-none">
        <Layers className="size-3" />
        <span>
          {currentIndex + 1}/{count}
        </span>
      </div>

      {/* Horizontal Carousel Viewport */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-none aspect-square sm:aspect-[4/3] max-h-[500px] items-center"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {images.map((img, i) => (
          <div
            key={i}
            onClick={handleTileClick(i)}
            className="w-full h-full shrink-0 snap-center relative flex items-center justify-center cursor-pointer bg-background/50 overflow-hidden"
            style={{ minWidth: "100%" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img}
              alt={`Slide ${i + 1}`}
              loading="lazy"
              className="w-full h-full object-cover sm:object-contain transition-transform duration-300 group-hover:scale-[1.01]"
            />
          </div>
        ))}
      </div>

      {/* Left Navigation Arrow */}
      {currentIndex > 0 && (
        <button
          type="button"
          onClick={handlePrev}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 size-8 sm:size-9 rounded-full bg-background/85 hover:bg-background text-foreground shadow-md backdrop-blur-xs flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 sm:opacity-90 cursor-pointer hover:scale-105 active:scale-95"
          aria-label="Previous image"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}

      {/* Right Navigation Arrow */}
      {currentIndex < count - 1 && (
        <button
          type="button"
          onClick={handleNext}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 size-8 sm:size-9 rounded-full bg-background/85 hover:bg-background text-foreground shadow-md backdrop-blur-xs flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 sm:opacity-90 cursor-pointer hover:scale-105 active:scale-95"
          aria-label="Next image"
        >
          <ChevronRight className="size-5" />
        </button>
      )}

      {/* Bottom Instagram-Style Pagination Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm shadow-xs">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              scrollToIndex(i);
            }}
            className={cn(
              "rounded-full transition-all duration-200 cursor-pointer",
              currentIndex === i
                ? "size-2 bg-primary ring-1 ring-primary/40 scale-110"
                : "size-1.5 bg-white/60 hover:bg-white"
            )}
            aria-label={`Go to image ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
