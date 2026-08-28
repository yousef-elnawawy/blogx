"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Image as ImageIcon, FileText, Link as LinkIcon, Download, Film, ExternalLink, BookOpen, Layers } from "lucide-react";
import { messagesService, DirectMessage, MediaGalleryResponse } from "@/services/messages";
import ImageLightbox from "@/components/post/ImageLightbox";
import { getAvatarUrl } from "@/lib/utils";

interface SharedMediaDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: number | string;
  userName: string;
}

export default function SharedMediaDrawer({
  open,
  onOpenChange,
  conversationId,
  userName,
}: SharedMediaDrawerProps) {
  const router = useRouter();
  const [data, setData] = useState<MediaGalleryResponse>({ media: [], files: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("media");

  // Lightbox for media gallery
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (open && conversationId) {
      setLoading(true);
      messagesService
        .getMediaGallery(conversationId)
        .then((res) => setData(res))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open, conversationId]);

  const allMediaImages = data.media.flatMap((m) => m.images || (m.image ? [m.image] : []));

  const handleNavigate = (url: string) => {
    onOpenChange(false);
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const urlObj = new URL(url);
      if (typeof window !== "undefined" && urlObj.origin === window.location.origin) {
        router.push(urlObj.pathname + urlObj.search);
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(url);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 rounded-2xl overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/60">
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Shared Content</span>
              <span className="text-xs font-normal text-muted-foreground">{userName}</span>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-6 pt-2 border-b border-border/40">
              <TabsList className="grid grid-cols-3 w-full bg-muted/60 rounded-xl">
                <TabsTrigger value="media" className="gap-1.5 text-xs rounded-lg cursor-pointer">
                  <ImageIcon className="size-3.5" />
                  <span>Media ({data.media.length})</span>
                </TabsTrigger>
                <TabsTrigger value="files" className="gap-1.5 text-xs rounded-lg cursor-pointer">
                  <FileText className="size-3.5" />
                  <span>Files ({data.files.length})</span>
                </TabsTrigger>
                <TabsTrigger value="links" className="gap-1.5 text-xs rounded-lg cursor-pointer">
                  <LinkIcon className="size-3.5" />
                  <span>Links ({data.links.length})</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-[300px]">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
                  <Loader2 className="size-7 animate-spin text-primary mb-2" />
                  <p className="text-xs">Loading shared items...</p>
                </div>
              ) : (
                <>
                  {/* Media Tab (Photos & Videos) */}
                  <TabsContent value="media" className="m-0">
                    {data.media.length === 0 ? (
                      <div className="py-16 text-center text-muted-foreground">
                        <ImageIcon className="size-10 mx-auto mb-2 opacity-30" />
                        <p className="text-xs font-medium">No photos or videos shared yet</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {data.media.map((msg) => (
                          <React.Fragment key={msg.id}>
                            {msg.images?.map((imgUrl, imgIdx) => (
                              <div
                                key={`${msg.id}-${imgIdx}`}
                                onClick={() => {
                                  setLightboxImages(allMediaImages);
                                  setLightboxIndex(allMediaImages.indexOf(imgUrl));
                                  setLightboxOpen(true);
                                }}
                                className="aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity relative group"
                              >
                                <img
                                  src={imgUrl}
                                  alt="Media"
                                  className="size-full object-cover group-hover:scale-105 transition-transform"
                                />
                              </div>
                            ))}

                            {msg.video_url && (
                              <div className="aspect-square rounded-xl overflow-hidden bg-black relative flex items-center justify-center group">
                                <video
                                  src={msg.video_url}
                                  className="size-full object-cover opacity-80"
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Film className="size-6 text-white" />
                                </div>
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Files Tab */}
                  <TabsContent value="files" className="m-0">
                    {data.files.length === 0 ? (
                      <div className="py-16 text-center text-muted-foreground">
                        <FileText className="size-10 mx-auto mb-2 opacity-30" />
                        <p className="text-xs font-medium">No files or documents shared yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {data.files.map((msg) => (
                          <a
                            key={msg.id}
                            href={msg.file_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={msg.file_name || undefined}
                            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/70 hover:bg-muted/70 transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <FileText className="size-4.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate group-hover:underline">
                                  {msg.file_name || "Attachment"}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {msg.file_type?.toUpperCase()} • {msg.created_at_human}
                                </p>
                              </div>
                            </div>
                            <Download className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Links Tab */}
                  <TabsContent value="links" className="m-0">
                    {data.links.length === 0 ? (
                      <div className="py-16 text-center text-muted-foreground">
                        <LinkIcon className="size-10 mx-auto mb-2 opacity-30" />
                        <p className="text-xs font-medium">No links or shared content yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {data.links.map((msg) => {
                          const linksFound = (msg.text || "").match(/https?:\/\/[^\s]+/g) || [];
                          const shared = msg.shared_data;
                          const targetUrl = shared
                            ? shared.url || (shared.type === "series" || shared.type === "story" ? `/series/${shared.id}` : shared.type === "blog" ? `/blog/${shared.id}` : `/post/${shared.id}`)
                            : null;

                          return (
                            <div
                              key={msg.id}
                              className="p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors"
                            >
                              {shared && targetUrl && (
                                <div
                                  onClick={() => handleNavigate(targetUrl)}
                                  className="mb-2.5 p-2.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/70 cursor-pointer transition-all flex items-start justify-between gap-2 group"
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-primary/10 text-primary flex items-center gap-1">
                                        {shared.type === "series" || shared.type === "story" ? <Layers className="size-2.5" /> : shared.type === "blog" ? <BookOpen className="size-2.5" /> : <FileText className="size-2.5" />}
                                        <span>{shared.type || "Post"}</span>
                                      </span>
                                    </div>
                                    <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                      {shared.title || "Shared Item"}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                      By {shared.author_name || "User"}
                                    </p>
                                  </div>
                                  <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                                </div>
                              )}

                              {linksFound.map((url, uIdx) => (
                                <div
                                  key={uIdx}
                                  onClick={() => handleNavigate(url)}
                                  className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline break-all cursor-pointer my-1"
                                >
                                  <ExternalLink className="size-3 shrink-0" />
                                  <span>{url}</span>
                                </div>
                              ))}

                              <p className="text-[10px] text-muted-foreground mt-1.5">
                                Sent {msg.created_at_human}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
