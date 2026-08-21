"use client";

import { ExternalLink, Video } from "lucide-react";
import { cn } from "@/lib/utils";

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("fill-current", className)} viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

interface YouTubeEmbedProps {
  urlOrId: string;
  caption?: string;
  className?: string;
}

export function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const clean = input.trim();

  // Already a clean 11 char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  // youtu.be/ID
  const shortMatch = clean.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (shortMatch) return shortMatch[1];

  // youtube.com/watch?v=ID or /embed/ID or /v/ID
  const standardMatch = clean.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (standardMatch) return standardMatch[1];

  return null;
}

export default function YouTubeEmbed({ urlOrId, caption, className }: YouTubeEmbedProps) {
  const videoId = extractYouTubeId(urlOrId);

  if (!videoId) {
    return (
      <div className="my-6 p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm flex items-center gap-2">
        <Video className="size-5" />
        <span>Invalid YouTube URL or Video ID: {urlOrId}</span>
      </div>
    );
  }

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <figure className={cn("my-6 w-full group", className)}>
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border/80 bg-zinc-950 shadow-lg">
        <iframe
          src={embedUrl}
          title={caption || "YouTube video player"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute top-0 left-0 w-full h-full border-0"
        />
      </div>

      <div className="mt-2.5 flex items-center justify-between px-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-semibold text-red-500">
            <YouTubeIcon className="size-3.5" />
            <span>YouTube</span>
          </span>
          {caption && <span className="text-foreground/80 italic">{caption}</span>}
        </div>

        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground text-[11px] transition-colors"
        >
          <span>Watch on YouTube</span>
          <ExternalLink className="size-3" />
        </a>
      </div>
    </figure>
  );
}
