"use client";

import React from "react";
import { FileText, Download, FileCode, FileArchive, FileSpreadsheet, Film } from "lucide-react";

interface ChatFileCardProps {
  fileUrl: string;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  isMe?: boolean;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(ext?: string | null) {
  const lower = (ext || "").toLowerCase();
  if (["pdf", "doc", "docx", "txt", "rtf"].includes(lower)) {
    return <FileText className="size-5 text-red-500" />;
  }
  if (["xls", "xlsx", "csv"].includes(lower)) {
    return <FileSpreadsheet className="size-5 text-emerald-500" />;
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(lower)) {
    return <FileArchive className="size-5 text-amber-500" />;
  }
  if (["js", "ts", "tsx", "jsx", "html", "css", "json", "py", "php", "sql"].includes(lower)) {
    return <FileCode className="size-5 text-blue-500" />;
  }
  return <FileText className="size-5 text-muted-foreground" />;
}

export default function ChatFileCard({
  fileUrl,
  fileName = "Attachment",
  fileSize,
  fileType,
  isMe = false,
}: ChatFileCardProps) {
  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      download={fileName || undefined}
      onClick={(e) => e.stopPropagation()}
      className={`my-1.5 flex items-center gap-3 p-3 rounded-2xl border transition-all max-w-xs sm:max-w-sm group shadow-xs ${
        isMe
          ? "bg-white/10 hover:bg-white/20 border-white/20 text-white"
          : "bg-muted/70 hover:bg-muted border-border/80 text-foreground"
      }`}
    >
      <div
        className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
          isMe ? "bg-white/20" : "bg-card shadow-2xs"
        }`}
      >
        {getFileIcon(fileType)}
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <span className="text-xs font-bold truncate group-hover:underline">
          {fileName}
        </span>
        <div className="flex items-center gap-2 text-[10px] opacity-80 mt-0.5">
          {fileType && <span className="uppercase font-semibold tracking-wider">{fileType}</span>}
          {fileSize && <span>{formatBytes(fileSize)}</span>}
        </div>
      </div>

      <div
        className={`size-7 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
          isMe ? "bg-white text-primary" : "bg-primary text-primary-foreground"
        }`}
        title="Download File"
      >
        <Download className="size-3.5" />
      </div>
    </a>
  );
}
