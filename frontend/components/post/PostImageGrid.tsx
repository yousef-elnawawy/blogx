"use client";

import { useState, useRef } from "react";

interface PostImageGridProps {
  images: string[];
  onImageClick: (index: number) => void;
}

export default function PostImageGrid({
  images,
  onImageClick,
}: PostImageGridProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!images || images.length === 0) return null;

  const handleTileClick = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onImageClick(index);
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const scrollLeft = el.scrollLeft;
    const itemWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).clientWidth + 10
      : el.clientWidth;
    const index = Math.round(scrollLeft / itemWidth);
    setActiveIndex(Math.min(Math.max(0, index), images.length - 1));
  };

  const count = images.length;

  // Single Image: Natural Aspect Ratio without Cropping (Max Height 520px)
  if (count === 1) {
    return (
      <div
        onClick={handleTileClick(0)}
        className="relative w-full max-h-[520px] rounded-2xl overflow-hidden cursor-pointer group z-10 pointer-events-auto border border-border/50 bg-muted/30 flex items-center justify-center"
      >
        <img
          src={images[0]}
          alt="Post asset 1"
          className="w-full h-auto max-h-[520px] object-contain transition-transform duration-500 group-hover:scale-[1.01]"
        />
      </div>
    );
  }

  // 2+ Images: Fixed Aspect Ratio Horizontal Scrollable Carousel
  return (
    <div className="relative z-10 pointer-events-auto group/carousel">
      {/* Image Count Badge */}
      <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-xs font-semibold select-none shadow-sm pointer-events-none">
        {activeIndex + 1} / {count}
      </div>

      {/* Horizontal Scroll Track */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory py-1 px-0.5 rounded-2xl scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {images.map((img, i) => (
          <div
            key={i}
            onClick={handleTileClick(i)}
            className="relative w-[85%] sm:w-[75%] lg:w-[70%] aspect-[16/9] sm:aspect-[2/1] shrink-0 snap-center rounded-2xl overflow-hidden cursor-pointer group border border-border/60 bg-muted shadow-sm"
          >
            <img
              src={img}
              alt={`Post asset ${i + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
