"use client";

import { Images as ImagesIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostImageGridProps {
  images: string[];
  onImageClick: (index: number) => void;
}

export default function PostImageGrid({
  images,
  onImageClick,
}: PostImageGridProps) {
  if (!images || images.length === 0) return null;

  const count = images.length;

  const handleTileClick = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onImageClick(index);
  };

  // 1 Image: Adaptive Card
  if (count === 1) {
    return (
      <div
        onClick={handleTileClick(0)}
        className="relative w-full max-h-[460px] sm:max-h-[500px] rounded-2xl overflow-hidden cursor-pointer group z-10 pointer-events-auto border border-border/70 bg-muted/30 flex items-center justify-center shadow-2xs hover:border-primary/40 transition-colors"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[0]}
          alt="Post media 1"
          loading="lazy"
          className="w-full h-auto max-h-[460px] sm:max-h-[500px] object-contain rounded-2xl transition-transform duration-300 group-hover:scale-[1.01]"
        />
      </div>
    );
  }

  // 2 Images: 2 Symmetrical Columns in a Fixed Aspect Ratio Container
  if (count === 2) {
    return (
      <div className="w-full h-[240px] sm:h-[300px] grid grid-cols-2 gap-1 sm:gap-1.5 rounded-2xl overflow-hidden z-10 pointer-events-auto border border-border/70 shadow-2xs">
        {images.map((img, i) => (
          <div
            key={i}
            onClick={handleTileClick(i)}
            className="relative h-full w-full min-h-0 overflow-hidden cursor-pointer group bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img}
              alt={`Post media ${i + 1}`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        ))}
      </div>
    );
  }

  // 3 Images: 1 Tall Left + 2 Stacked Right with strict min-h-0 so all 3 are 100% visible
  if (count === 3) {
    return (
      <div className="w-full h-[260px] sm:h-[320px] grid grid-cols-2 gap-1 sm:gap-1.5 rounded-2xl overflow-hidden z-10 pointer-events-auto border border-border/70 shadow-2xs">
        {/* Large Left Image (takes 50% width and 100% height) */}
        <div
          onClick={handleTileClick(0)}
          className="relative h-full w-full min-h-0 overflow-hidden cursor-pointer group bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[0]}
            alt="Post media 1"
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        {/* 2 Stacked Right Images (each takes 50% height exactly) */}
        <div className="grid grid-rows-2 gap-1 sm:gap-1.5 h-full w-full min-h-0">
          {images.slice(1, 3).map((img, idx) => {
            const actualIndex = idx + 1;
            return (
              <div
                key={actualIndex}
                onClick={handleTileClick(actualIndex)}
                className="relative h-full w-full min-h-0 overflow-hidden cursor-pointer group bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={`Post media ${actualIndex + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 4 Images: Balanced 2x2 Grid with strict min-h-0
  if (count === 4) {
    return (
      <div className="w-full h-[260px] sm:h-[320px] grid grid-cols-2 grid-rows-2 gap-1 sm:gap-1.5 rounded-2xl overflow-hidden z-10 pointer-events-auto border border-border/70 shadow-2xs">
        {images.map((img, i) => (
          <div
            key={i}
            onClick={handleTileClick(i)}
            className="relative h-full w-full min-h-0 overflow-hidden cursor-pointer group bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img}
              alt={`Post media ${i + 1}`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        ))}
      </div>
    );
  }

  // 5+ Images: 2x2 Grid with Frosted Glass "+N more" Overlay on 4th Tile
  const remainingCount = count - 4;
  return (
    <div className="w-full h-[260px] sm:h-[320px] grid grid-cols-2 grid-rows-2 gap-1 sm:gap-1.5 rounded-2xl overflow-hidden z-10 pointer-events-auto border border-border/70 shadow-2xs">
      {images.slice(0, 3).map((img, i) => (
        <div
          key={i}
          onClick={handleTileClick(i)}
          className="relative h-full w-full min-h-0 overflow-hidden cursor-pointer group bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img}
            alt={`Post media ${i + 1}`}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      ))}

      {/* 4th tile with +N Overlay */}
      <div
        onClick={handleTileClick(3)}
        className="relative h-full w-full min-h-0 overflow-hidden cursor-pointer group bg-muted"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[3]}
          alt="Post media 4"
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white transition-colors group-hover:bg-black/50">
          <ImagesIcon className="size-6 sm:size-7 mb-0.5 stroke-[2.2]" />
          <span className="text-base sm:text-lg font-extrabold tracking-wide">
            +{remainingCount + 1}
          </span>
          <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wider">
            Photos
          </span>
        </div>
      </div>
    </div>
  );
}
