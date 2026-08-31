"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink, Globe } from "lucide-react";
import api from "@/lib/api";
import { extractVideoFromContent } from "./VideoEmbed";

interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  site_name: string | null;
  domain: string | null;
}

const previewCache = new Map<string, LinkPreviewData | null>();

export function extractUrlsFromText(text: string): string[] {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s<>"'{}|\\^`]+)/gi;
  const matches = text.match(urlRegex);
  if (!matches) return [];

  // Filter out youtube/instagram/direct video links already handled by VideoEmbed
  const videoMatch = extractVideoFromContent(text);
  const videoUrl = videoMatch?.url;

  return matches.filter((url) => {
    if (videoUrl && url.includes(videoUrl)) return false;
    // Basic clean
    return url.startsWith("http://") || url.startsWith("https://");
  });
}

export default function LinkPreviewCard({ content }: { content: string }) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(false);

  const urls = extractUrlsFromText(content);
  const targetUrl = urls[0] || null;

  useEffect(() => {
    if (!targetUrl) {
      setPreview(null);
      return;
    }

    if (previewCache.has(targetUrl)) {
      setPreview(previewCache.get(targetUrl) || null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    api
      .get("/api/posts/preview-link", {
        params: { url: targetUrl },
      })
      .then((res) => {
        if (isMounted && res.data) {
          previewCache.set(targetUrl, res.data);
          setPreview(res.data);
        }
      })
      .catch(() => {
        if (isMounted) {
          previewCache.set(targetUrl, null);
          setPreview(null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [targetUrl]);

  if (!targetUrl || loading || !preview || (!preview.title && !preview.image)) {
    return null;
  }

  return (
    <div className="mt-3 relative z-10">
      <a
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="group block rounded-2xl overflow-hidden border border-border/80 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200"
      >
        {preview.image && (
          <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-muted">
            <img
              src={preview.image}
              alt={preview.title || "Link preview image"}
              className="size-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                // Hide broken image container
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
        )}

        <div className="p-3.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <Globe className="size-3 text-primary shrink-0" />
            <span className="truncate">{preview.site_name || preview.domain}</span>
            <ExternalLink className="size-3 ml-auto text-muted-foreground/60 group-hover:text-primary transition-colors" />
          </div>

          {preview.title && (
            <h4 className="text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {preview.title}
            </h4>
          )}

          {preview.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {preview.description}
            </p>
          )}
        </div>
      </a>
    </div>
  );
}
