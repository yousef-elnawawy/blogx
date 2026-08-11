"use client";

import { X } from "lucide-react";

export interface ImageEntry {
  preview: string; // URL or base64 data URL for display
  file?: File;      // original File for upload (if new)
  isExisting?: boolean;
}

interface ImagePreviewProps {
  images: ImageEntry[];
  onRemove: (index: number) => void;
}

export default function ImagePreview({ images, onRemove }: ImagePreviewProps) {
  if (images.length === 0) return null;

  return (
    <div className="flex items-center gap-2.5 overflow-x-auto py-2.5 px-1">
      {images.map((entry, i) => (
        <div
          key={i}
          className="relative shrink-0 size-24 sm:size-28 rounded-2xl overflow-hidden border border-border/80 group shadow-sm bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.preview}
            alt={`upload-${i}`}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label="Remove image"
            className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors flex items-center justify-center shadow-md"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}