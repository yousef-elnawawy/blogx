"use client";

import React from "react";
import Link from "next/link";
import CodeBlock from "./CodeBlock";
import YouTubeEmbed, { extractYouTubeId } from "./YouTubeEmbed";
import TwitterEmbed, { extractTweetInfo } from "./TwitterEmbed";
import InternalPostEmbed from "./InternalPostEmbed";
import InternalBlogEmbed from "./InternalBlogEmbed";
import {
  Info,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  CheckSquare,
  Square,
} from "lucide-react";

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

function formatInlineText(text: string): React.ReactNode {
  if (!text) return null;

  // Match bold (**text**), italic (*text*), strikethrough (~~text~~), inline code (`code`), markdown links ([title](url)), URLs, mentions (@username), hashtags (#tag), timestamps (01:23)
  const parts = text.split(
    /(\*\*.*?\*\*|\*.*?\*|~~.*?~~|`.*?`|\[.*?\]\(.*?\)|https?:\/\/[^\s]+|@[a-zA-Z0-9_]+|#[\p{L}\p{N}_]+|\b\d{1,2}:\d{2}(?::\d{2})?\b)/gu
  );

  return parts.map((part, i) => {
    if (!part) return null;

    // Timestamps (e.g., 01:23)
    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(part)) {
      const seconds = parseTimeToSeconds(part);
      return (
        <button
          key={i}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(
              new CustomEvent("blogx-video-seek", { detail: { time: seconds } })
            );
          }}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-mono text-xs font-bold transition-colors cursor-pointer relative z-10 mx-0.5"
          title={`Jump video to ${part}`}
        >
          <span className="text-[10px]">▶</span>
          <span>{part}</span>
        </button>
      );
    }

    // Bold
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={i} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2 && !part.startsWith("**")) {
      return (
        <em key={i} className="italic text-foreground/95">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Strikethrough
    if (part.startsWith("~~") && part.endsWith("~~") && part.length >= 4) {
      return (
        <del key={i} className="line-through opacity-70">
          {part.slice(2, -2)}
        </del>
      );
    }

    // Inline code
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2 && !part.startsWith("```")) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-xs text-primary font-semibold border border-border/50 select-all"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Mentions
    if (part.startsWith("@") && part.length > 1) {
      const username = part.slice(1);
      return (
        <Link
          key={i}
          href={`/@${username}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-primary hover:underline"
        >
          {part}
        </Link>
      );
    }

    // Hashtags
    if (part.startsWith("#") && part.length > 1) {
      const tag = part.slice(1);
      return (
        <Link
          key={i}
          href={`/hashtag/${encodeURIComponent(tag)}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-amber-600 dark:text-amber-400 hover:underline"
        >
          {part}
        </Link>
      );
    }

    // Markdown link
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      let href = linkMatch[2].trim();
      const isInternal =
        !href.startsWith("http://") && !href.startsWith("https://") && href.startsWith("/");
      if (!isInternal && !href.startsWith("http://") && !href.startsWith("https://")) {
        href = `https://${href}`;
      }
      return (
        <a
          key={i}
          href={href}
          target={isInternal ? undefined : "_blank"}
          rel={isInternal ? undefined : "noopener noreferrer"}
          className="text-primary underline hover:text-primary/80 font-medium transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
    }

    // Raw URL
    if (/^https?:\/\//i.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80 font-medium break-all transition-colors"
        >
          {part}
        </a>
      );
    }

    return <span key={i}>{part}</span>;
  });
}

export function RichBlogContent({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeLanguage = "text";
  let codeBuffer: string[] = [];

  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = (key: string | number) => {
    if (tableRows.length === 0) return;
    const headerRow = tableRows[0];
    const bodyRows = tableRows.slice(1);

    elements.push(
      <div key={`table-${key}`} className="my-6 overflow-x-auto rounded-xl border border-border/80 bg-card shadow-xs">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead className="bg-muted/70 text-foreground font-bold border-b border-border/80">
            <tr>
              {headerRow.map((cell, cIdx) => (
                <th key={cIdx} className="px-4 py-3 border-r last:border-r-0 border-border/50 font-bold">
                  {formatInlineText(cell.trim())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-4 py-3 border-r last:border-r-0 border-border/40 text-foreground/90">
                    {formatInlineText(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();

    // 1. Code Block starts or ends: ```lang
    if (trimmed.startsWith("```")) {
      if (inTable) flushTable(index);

      if (inCodeBlock) {
        elements.push(
          <CodeBlock
            key={`code-${index}`}
            language={codeLanguage}
            code={codeBuffer.join("\n")}
          />
        );
        codeBuffer = [];
        inCodeBlock = false;
        codeLanguage = "text";
      } else {
        inCodeBlock = true;
        codeLanguage = trimmed.replace(/^```/, "").trim() || "javascript";
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // 2. Standalone YouTube URL embed or syntax
    const ytId = extractYouTubeId(trimmed);
    if (
      ytId &&
      (trimmed.startsWith("https://") ||
        trimmed.startsWith("http://") ||
        trimmed.startsWith("www.") ||
        trimmed.startsWith("> [!YOUTUBE"))
    ) {
      if (inTable) flushTable(index);
      elements.push(<YouTubeEmbed key={`yt-${index}`} urlOrId={trimmed} />);
      continue;
    }

    // 3. Standalone Twitter / X URL embed
    const tweetInfo = extractTweetInfo(trimmed);
    if (tweetInfo && (trimmed.includes("twitter.com") || trimmed.includes("x.com"))) {
      if (inTable) flushTable(index);
      elements.push(<TwitterEmbed key={`tweet-${index}`} url={trimmed} />);
      continue;
    }

    // 4. Markdown Table row: | Col 1 | Col 2 |
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (/^\|\s*[-:]+[-| :]*\|$/.test(trimmed)) {
        // Table divider row: ignore
        continue;
      }
      inTable = true;
      const rawCols = trimmed.slice(1, -1).split("|");
      tableRows.push(rawCols);
      continue;
    } else if (inTable) {
      flushTable(index);
    }

    // 5. GitHub-style Alert Callouts (> [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT], > [!CAUTION])
    const alertMatch = trimmed.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i);
    if (alertMatch) {
      const type = alertMatch[1].toUpperCase();
      const firstLineText = alertMatch[2];

      // Read subsequent lines belonging to this blockquote
      const alertLines: string[] = [];
      if (firstLineText) alertLines.push(firstLineText);

      while (index + 1 < lines.length && lines[index + 1].trim().startsWith(">")) {
        index++;
        alertLines.push(lines[index].trim().replace(/^>\s*/, ""));
      }

      const alertConfig = {
        NOTE: {
          icon: <Info className="size-4 text-sky-500 shrink-0" />,
          title: "Note",
          bg: "bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300",
        },
        TIP: {
          icon: <Sparkles className="size-4 text-emerald-500 shrink-0" />,
          title: "Tip",
          bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
        },
        IMPORTANT: {
          icon: <AlertCircle className="size-4 text-purple-500 shrink-0" />,
          title: "Important",
          bg: "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300",
        },
        WARNING: {
          icon: <AlertTriangle className="size-4 text-amber-500 shrink-0" />,
          title: "Warning",
          bg: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300",
        },
        CAUTION: {
          icon: <AlertCircle className="size-4 text-rose-500 shrink-0" />,
          title: "Caution",
          bg: "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300",
        },
      }[type] || {
        icon: <Info className="size-4 text-primary shrink-0" />,
        title: "Note",
        bg: "bg-primary/10 border-primary/30 text-foreground",
      };

      elements.push(
        <div
          key={`alert-${index}`}
          className={`my-5 rounded-2xl p-4 border ${alertConfig.bg} space-y-1.5 shadow-2xs`}
        >
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
            {alertConfig.icon}
            <span>{alertConfig.title}</span>
          </div>
          <div className="text-sm leading-relaxed text-foreground/90 pl-6 space-y-1">
            {alertLines.map((aLine, aIdx) => (
              <p key={aIdx}>{formatInlineText(aLine)}</p>
            ))}
          </div>
        </div>
      );
      continue;
    }

    // 6. Task List Items (- [ ] or - [x])
    const taskMatch = line.match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const isChecked = taskMatch[2].toLowerCase() === "x";
      const taskText = taskMatch[3];
      elements.push(
        <div key={index} className="flex items-start gap-2.5 my-2 pl-2">
          {isChecked ? (
            <CheckSquare className="size-4 text-primary shrink-0 mt-1" />
          ) : (
            <Square className="size-4 text-muted-foreground shrink-0 mt-1" />
          )}
          <span
            className={`text-[15px] sm:text-base leading-relaxed ${
              isChecked ? "line-through text-muted-foreground" : "text-foreground"
            }`}
          >
            {formatInlineText(taskText)}
          </span>
        </div>
      );
      continue;
    }

    // 7. Headings with Fraunces font
    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={index}
          className="text-lg sm:text-xl font-bold text-foreground mt-8 mb-2 font-[family-name:var(--font-fraunces)]"
        >
          {formatInlineText(line.replace(/^###\s+/, ""))}
        </h3>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={index}
          className="text-xl sm:text-2xl font-bold text-foreground mt-10 mb-3 font-[family-name:var(--font-fraunces)]"
        >
          {formatInlineText(line.replace(/^##\s+/, ""))}
        </h2>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={index}
          className="text-2xl sm:text-3xl font-extrabold text-foreground mt-12 mb-4 font-[family-name:var(--font-fraunces)]"
        >
          {formatInlineText(line.replace(/^#\s+/, ""))}
        </h1>
      );
      continue;
    }

    // 8. Standard Blockquote & Callout
    if (line.startsWith("> ")) {
      const quoteContent = line.replace(/^>\s+/, "");
      elements.push(
        <blockquote
          key={index}
          className="border-l-3 border-primary pl-4 py-2.5 my-5 italic text-foreground/90 bg-primary/5 rounded-r-xl"
        >
          {formatInlineText(quoteContent)}
        </blockquote>
      );
      continue;
    }

    // 9. Divider
    if (trimmed === "---" || trimmed === "***") {
      elements.push(<hr key={index} className="my-8 border-border/60" />);
      continue;
    }

    // 10. Image markdown: ![alt](url)
    const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const src = imgMatch[2];
      elements.push(
        <figure key={index} className="my-6">
          <img
            src={src}
            alt={alt}
            className="w-full max-h-[550px] object-cover rounded-2xl border border-border/60 shadow-sm"
          />
          {alt && alt !== "image" && (
            <figcaption className="text-center text-xs text-muted-foreground mt-2 italic">
              {alt}
            </figcaption>
          )}
        </figure>
      );
      continue;
    }

    // 10.1 Internal Post Embed (e.g. ::post[123] or standalone /post/123)
    const postEmbedMatch = trimmed.match(/^::post\[(\d+)\]$/i) || trimmed.match(/^(?:https?:\/\/[^\s]+)?\/post\/(\d+)$/i);
    if (postEmbedMatch) {
      const postId = postEmbedMatch[1];
      elements.push(<InternalPostEmbed key={`post-embed-${index}`} postId={postId} />);
      continue;
    }

    // 10.2 Internal Blog Embed (e.g. ::blog[my-article-slug] or standalone /blogs/my-article-slug)
    const blogEmbedMatch = trimmed.match(/^::blog\[([a-zA-Z0-9_-]+)\]$/i) || trimmed.match(/^(?:https?:\/\/[^\s]+)?\/blogs\/([a-zA-Z0-9_-]+)$/i);
    if (blogEmbedMatch) {
      const blogSlug = blogEmbedMatch[1];
      elements.push(<InternalBlogEmbed key={`blog-embed-${index}`} slug={blogSlug} />);
      continue;
    }

    // 11. Bullet List
    if (line.match(/^[-*]\s+/)) {
      elements.push(
        <li
          key={index}
          className="ml-5 list-disc text-[15px] sm:text-base leading-relaxed text-foreground/90 my-1"
        >
          {formatInlineText(line.replace(/^[-*]\s+/, ""))}
        </li>
      );
      continue;
    }

    // 12. Numbered List
    if (line.match(/^\d+\.\s+/)) {
      elements.push(
        <li
          key={index}
          className="ml-5 list-decimal text-[15px] sm:text-base leading-relaxed text-foreground/90 my-1"
        >
          {formatInlineText(line.replace(/^\d+\.\s+/, ""))}
        </li>
      );
      continue;
    }

    // 13. Empty lines
    if (!trimmed) {
      elements.push(<div key={index} className="h-3" />);
      continue;
    }

    // 14. Standard paragraph
    elements.push(
      <p key={index} className="text-[15px] sm:text-base leading-relaxed text-foreground/90 my-2.5">
        {formatInlineText(line)}
      </p>
    );
  }

  if (inTable) {
    flushTable(lines.length);
  }

  return <div className="rich-blog-body space-y-1">{elements}</div>;
}

export default RichBlogContent;
