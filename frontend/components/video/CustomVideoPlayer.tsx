"use client";

import React, { useRef, useEffect } from "react";
import { getMediaUrl } from "@/lib/utils";

interface CustomVideoPlayerProps {
  src: string;
  poster?: string | null;
  duration?: number | null;
  postId?: number | string;
}

export default function CustomVideoPlayer({
  src,
  poster,
  postId,
}: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const resolvedSrc = getMediaUrl(src);
  const resolvedPoster = poster ? getMediaUrl(poster) : undefined;

  // Listen for timestamp click events in post text (e.g. "01:30")
  useEffect(() => {
    const handleSeekEvent = (e: Event) => {
      const ev = e as CustomEvent;
      if (ev.detail?.postId !== undefined && String(ev.detail.postId) !== String(postId)) return;

      const targetTime = Number(ev.detail?.time);
      if (isNaN(targetTime) || targetTime < 0) return;

      const vid = videoRef.current;
      if (vid) {
        vid.currentTime = targetTime;
        vid.play()?.catch(() => {});
      }
    };

    window.addEventListener("blogx-video-seek", handleSeekEvent);
    return () => window.removeEventListener("blogx-video-seek", handleSeekEvent);
  }, [postId]);

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-border/60 shadow-md my-2.5">
      <video
        ref={videoRef}
        src={resolvedSrc}
        poster={resolvedPoster}
        controls
        preload="metadata"
        playsInline
        className="size-full object-contain"
      />
    </div>
  );
}
