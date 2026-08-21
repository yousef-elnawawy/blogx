"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface TwitterEmbedProps {
  url: string;
  className?: string;
}

export function extractTweetId(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();

  if (/^\d+$/.test(clean)) return clean;

  const match = clean.match(/(?:twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/i);
  if (match && match[2]) {
    return match[2];
  }
  return null;
}

export function extractTweetInfo(url: string) {
  if (!url) return null;
  const clean = url.trim();
  const match = clean.match(/(?:twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/i);
  if (match) {
    return {
      handle: match[1],
      id: match[2],
    };
  }
  return null;
}

declare global {
  interface Window {
    twttr?: any;
  }
}

export default function TwitterEmbed({ url, className }: TwitterEmbedProps) {
  const tweetInfo = extractTweetInfo(url);
  const containerRef = useRef<HTMLDivElement>(null);
  const [embedHtml, setEmbedHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { resolvedTheme } = useTheme();

  const cleanUrl = url.startsWith("http") ? url : `https://${url}`;

  // 1. Fetch official oEmbed JSON for instant rendering
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(`/api/tweet-oembed?url=${encodeURIComponent(cleanUrl)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.html) {
          setEmbedHtml(data.html);
        }
        setLoading(false);
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cleanUrl]);

  // 2. Load Twitter widgets.js and hydrate
  useEffect(() => {
    if (!embedHtml || !containerRef.current) return;

    if (!window.twttr) {
      const script = document.createElement("script");
      script.id = "twitter-wjs";
      script.src = "https://platform.twitter.com/widgets.js";
      script.async = true;
      script.onload = () => {
        if (window.twttr?.widgets && containerRef.current) {
          window.twttr.widgets.load(containerRef.current);
        }
      };
      document.head.appendChild(script);
    } else if (window.twttr?.widgets) {
      window.twttr.widgets.load(containerRef.current);
    }
  }, [embedHtml, resolvedTheme]);

  return (
    <div className={cn("my-6 w-full flex flex-col items-center justify-center", className)}>
      {/* Instant Render Container */}
      <div
        ref={containerRef}
        className="w-full max-w-[550px] overflow-hidden flex justify-center [&_.twitter-tweet]:!mx-auto [&_.twitter-tweet]:!my-0"
      >
        {embedHtml ? (
          <div
            className="w-full flex justify-center"
            dangerouslySetInnerHTML={{ __html: embedHtml }}
          />
        ) : loading ? (
          <div className="w-full p-4 rounded-lg border border-border/70 bg-card/40 flex items-center justify-between gap-3 text-xs text-muted-foreground animate-pulse">
            <span>Loading post from @{tweetInfo?.handle || "X"}...</span>
            <span className="text-[11px] opacity-70">X (Twitter)</span>
          </div>
        ) : (
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full p-3.5 rounded-lg border border-border/80 bg-card/60 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-6 rounded-full bg-zinc-900 text-white flex items-center justify-center shrink-0">
                <svg className="size-3 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <span className="font-semibold text-foreground truncate">
                View post by @{tweetInfo?.handle || "creator"} on X
              </span>
            </div>
            <ExternalLink className="size-3.5 text-muted-foreground shrink-0" />
          </a>
        )}
      </div>
    </div>
  );
}
