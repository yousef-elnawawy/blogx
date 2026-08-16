"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ImageEntry {
  preview: string; // URL or base64 data URL for display
  file?: File;      // original File for upload (if new)
  isExisting?: boolean;
}

interface ImagePreviewProps {
  images: ImageEntry[];
  onRemove: (index: number) => void;
  onPreviewClick?: (index: number) => void;
}

export default function ImagePreview({
  images,
  onRemove,
  onPreviewClick,
}: ImagePreviewProps) {
  if (images.length === 0) return null;

  const count = images.length;

  // 1 Image: Large aesthetic card with full visibility
  if (count === 1) {
    return (
      <div className="relative w-full max-h-[260px] sm:max-h-[280px] rounded-2xl overflow-hidden border border-border/80 bg-muted/40 group shadow-xs flex items-center justify-center">
        <img
          src={images[0].preview}
          alt="Upload preview 1"
          className="w-full h-auto max-h-[260px] sm:max-h-[280px] object-contain mx-auto transition-transform duration-300 group-hover:scale-[1.01]"
        />
        {/* Remove Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(0);
          }}
          aria-label="Remove image"
          className="absolute top-2 right-2 size-7 sm:size-8 rounded-full bg-black/75 hover:bg-red-500 text-white backdrop-blur-md transition-all flex items-center justify-center shadow-lg active:scale-95 cursor-pointer z-10"
        >
          <X className="size-3.5 sm:size-4 stroke-[2.5]" />
        </button>
      </div>
    );
  }

  // 2 Images: 2 columns split with fixed height
  if (count === 2) {
    return (
      <div className="w-full h-[160px] sm:h-[200px] grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
        {images.map((entry, i) => (
          <div
            key={i}
            className="relative h-full w-full min-h-0 rounded-xl overflow-hidden border border-border/80 bg-muted group shadow-xs"
          >
            <img
              src={entry.preview}
              alt={`Upload preview ${i + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(i);
              }}
              aria-label="Remove image"
              className="absolute top-1.5 right-1.5 size-6 sm:size-7 rounded-full bg-black/75 hover:bg-red-500 text-white backdrop-blur-md transition-all flex items-center justify-center shadow-md active:scale-95 cursor-pointer z-10"
            >
              <X className="size-3 stroke-[2.5]" />
            </button>
          </div>
        ))}
      </div>
    );
  }

  // 3 Images: 1 tall left + 2 stacked right with strict min-h-0 so all 3 are 100% visible
  if (count === 3) {
    return (
      <div className="w-full h-[180px] sm:h-[220px] grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
        {/* Left tall image */}
        <div className="relative h-full w-full min-h-0 rounded-xl overflow-hidden border border-border/80 bg-muted group shadow-xs">
          <img
            src={images[0].preview}
            alt="Upload preview 1"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(0);
            }}
            aria-label="Remove image"
            className="absolute top-1.5 right-1.5 size-6 sm:size-7 rounded-full bg-black/75 hover:bg-red-500 text-white backdrop-blur-md transition-all flex items-center justify-center shadow-md active:scale-95 cursor-pointer z-10"
          >
            <X className="size-3 stroke-[2.5]" />
          </button>
        </div>

        {/* Right 2 stacked images */}
        <div className="grid grid-rows-2 gap-2 h-full w-full min-h-0">
          {images.slice(1, 3).map((entry, idx) => {
            const actualIndex = idx + 1;
            return (
              <div
                key={actualIndex}
                className="relative h-full w-full min-h-0 rounded-xl overflow-hidden border border-border/80 bg-muted group shadow-xs"
              >
                <img
                  src={entry.preview}
                  alt={`Upload preview ${actualIndex + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(actualIndex);
                  }}
                  aria-label="Remove image"
                  className="absolute top-1.5 right-1.5 size-6 sm:size-7 rounded-full bg-black/75 hover:bg-red-500 text-white backdrop-blur-md transition-all flex items-center justify-center shadow-md active:scale-95 cursor-pointer z-10"
                >
                  <X className="size-3 stroke-[2.5]" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 4+ Images: Grid layout
  return (
    <div className="w-full h-[180px] sm:h-[220px] grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-2xl overflow-hidden">
      {images.map((entry, i) => (
        <div
          key={i}
          className="relative h-full w-full min-h-0 rounded-xl overflow-hidden border border-border/80 bg-muted group shadow-xs"
        >
          <img
            src={entry.preview}
            alt={`Upload preview ${i + 1}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(i);
            }}
            aria-label="Remove image"
            className="absolute top-1.5 right-1.5 size-6 sm:size-7 rounded-full bg-black/75 hover:bg-red-500 text-white backdrop-blur-md transition-all flex items-center justify-center shadow-md active:scale-95 cursor-pointer z-10"
          >
            <X className="size-3 stroke-[2.5]" />
          </button>
        </div>
      ))}
    </div>
  );
}