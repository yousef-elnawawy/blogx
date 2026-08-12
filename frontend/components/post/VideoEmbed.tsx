"use client";

import { useState } from "react";
import { Play, Film, ExternalLink } from "lucide-react";

interface VideoEmbedProps {
  content: string;
}

export interface VideoMatch {
  type: "youtube" | "instagram" | "direct";
  url: string;
  id?: string;
}

export function extractVideoFromContent(text: string): VideoMatch | null {
  if (!text) return null;

  // 1. YouTube patterns (watch, shorts, embed, youtu.be)
  const ytMatch = text.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: "youtube",
      url: ytMatch[0],
      id: ytMatch[1],
    };
  }

  // 2. Instagram Reels / Posts patterns
  const igMatch = text.match(
    /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:reel|p)\/([a-zA-Z0-9_-]+)/i
  );
  if (igMatch && igMatch[1]) {
    return {
      type: "instagram",
      url: igMatch[0],
      id: igMatch[1],
    };
  }

  // 3. Direct video file links (.mp4, .webm, .mov)
  const directMatch = text.match(
    /(https?:\/\/[^\s"'<>]+\.(?:mp4|webm|mov|ogg)(?:\?[^\s"'<>]*)?)/i
  );
  if (directMatch && directMatch[1]) {
    return {
      type: "direct",
      url: directMatch[1],
    };
  }

  return null;
}

export default function VideoEmbed({ content }: VideoEmbedProps) {
  const video = extractVideoFromContent(content);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>(
    video?.id ? `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg` : ""
  );

  if (!video) return null;

  // YouTube Embed
  if (video.type === "youtube" && video.id) {
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-border/80 bg-card shadow-md relative z-10">
        {!isPlaying ? (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsPlaying(true);
            }}
            className="relative aspect-video w-full bg-black cursor-pointer group overflow-hidden"
          >
            {/* High-res YouTube Thumbnail */}
            <img
              src={imgSrc}
              alt="YouTube Video Preview"
              onError={() => {
                // Fallback to standard quality thumbnail if maxres is unavailable
                setImgSrc(`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`);
              }}
              className="size-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
              loading="lazy"
            />

            {/* Play Button Overlay with Amber/Red glow */}
            <div className="absolute inset-0 bg-black/35 flex items-center justify-center group-hover:bg-black/20 transition-colors">
              <div className="size-14 sm:size-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:bg-red-500 transition-all duration-200 pl-1 ring-4 ring-white/20">
                <Play className="size-6 sm:size-7 fill-current" />
              </div>
            </div>

            {/* Video Badge */}
            <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-2 shadow-lg border border-white/10">
              <div className="size-2 rounded-full bg-red-500 animate-pulse" />
              <span>YouTube Video</span>
            </div>
          </div>
        ) : (
          <div className="relative aspect-video w-full">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="size-full border-0"
            />
          </div>
        )}
      </div>
    );
  }

  // Instagram Reel / Post Embed
  if (video.type === "instagram" && video.id) {
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-border/80 bg-card shadow-md relative z-10">
        <div className="relative w-full aspect-[9/14] max-h-[500px] bg-black/90 flex flex-col items-center justify-center p-4">
          <iframe
            src={`https://www.instagram.com/reel/${video.id}/embed`}
            title="Instagram Reel"
            className="w-full h-full border-0 rounded-xl"
            allowTransparency
            allow="encrypted-media"
          />
        </div>
      </div>
    );
  }

  // Direct HTML5 Video
  if (video.type === "direct" && video.url) {
    return (
      <div className="mt-3 rounded-2xl overflow-hidden border border-border/80 bg-black shadow-md relative z-10">
        <video
          controls
          preload="metadata"
          className="w-full max-h-[460px] object-contain rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <source src={video.url} />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  return null;
}
