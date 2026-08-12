"use client";

import { useRef } from "react";
import { Image as ImageIcon, Hash } from "lucide-react";

interface ToolbarProps {
  onImageSelect?: (files: FileList) => void;
  onInsertHashtag: () => void;
  imageCount?: number;
}

export default function Toolbar({
  onImageSelect,
  onInsertHashtag,
  imageCount = 0,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxImages = 10;
  const canAddMore = imageCount < maxImages;

  return (
    <div className="flex items-center gap-1 text-primary">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) onImageSelect?.(e.target.files);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        aria-label="Add image"
        disabled={!canAddMore}
        onClick={() => fileInputRef.current?.click()}
        className="p-2 rounded-full hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        title="Add image"
      >
        <ImageIcon className="size-5" />
      </button>

      <button
        type="button"
        aria-label="Add hashtag"
        onClick={onInsertHashtag}
        className="p-2 rounded-full hover:bg-primary/10 transition-colors cursor-pointer"
        title="Add hashtag"
      >
        <Hash className="size-5" />
      </button>

      {imageCount > 0 && (
        <span className="text-xs font-medium text-muted-foreground ml-2">
          {imageCount}/{maxImages}
        </span>
      )}
    </div>
  );
}