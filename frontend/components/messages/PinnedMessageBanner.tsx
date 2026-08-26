"use client";

import React from "react";
import { Pin, X, ChevronRight, FileText, Image as ImageIcon, Video, Mic } from "lucide-react";
import { DirectMessage } from "@/services/messages";

interface PinnedMessageBannerProps {
  pinnedMessage: DirectMessage | null;
  onJumpToMessage: (messageId: number) => void;
  onUnpin: () => void;
  isMeSender?: boolean;
}

export default function PinnedMessageBanner({
  pinnedMessage,
  onJumpToMessage,
  onUnpin,
}: PinnedMessageBannerProps) {
  if (!pinnedMessage) return null;

  const senderName = pinnedMessage.sender?.display_name || pinnedMessage.sender?.name || "User";

  let snippet = pinnedMessage.text;
  if (!snippet) {
    if (pinnedMessage.audio_url) snippet = "Voice note";
    else if (pinnedMessage.file_url) snippet = pinnedMessage.file_name || "Attachment";
    else if (pinnedMessage.video_url) snippet = "Video message";
    else if (pinnedMessage.images && pinnedMessage.images.length > 0) snippet = "Photo";
    else snippet = "Message";
  }

  return (
    <div className="bg-muted/70 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2 flex items-center justify-between gap-3 text-xs transition-all z-20 shadow-2xs">
      <div
        onClick={() => onJumpToMessage(pinnedMessage.id)}
        className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group hover:opacity-85"
      >
        <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <Pin className="size-3.5 fill-primary/20 rotate-45" />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-foreground truncate text-[11px]">
              Pinned Message: {senderName}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
            {pinnedMessage.file_url && <FileText className="size-3 shrink-0" />}
            {pinnedMessage.video_url && <Video className="size-3 shrink-0" />}
            {pinnedMessage.images && pinnedMessage.images.length > 0 && <ImageIcon className="size-3 shrink-0" />}
            {pinnedMessage.audio_url && <Mic className="size-3 shrink-0" />}
            <span className="truncate">{snippet}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onJumpToMessage(pinnedMessage.id)}
          className="px-2 py-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>Jump</span>
          <ChevronRight className="size-3" />
        </button>

        <button
          type="button"
          onClick={onUnpin}
          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
          title="Unpin Message"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
