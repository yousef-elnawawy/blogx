"use client";

import React from "react";
import Link from "next/link";
import CodeSnippetBlock from "./CodeSnippetBlock";
import BlogQuoteEmbedCard from "./BlogQuoteEmbedCard";
import { Info, Sparkles, AlertTriangle, AlertCircle, Quote as QuoteIcon, CheckSquare, Square } from "lucide-react";

interface RichPostContentProps {
  content: string;
  validMentions?: string[];
  postId?: number | string;
}

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

/**
 * Render inline elements: timestamps, inline code, bold, italic, strikethrough, mentions, hashtags, URLs
 */
function renderInline(text: string, validMentions?: string[], postId?: number | string) {
  // Regex to detect inline code, timestamps, URLs, mentions, hashtags, bold, italic, strikethrough
  const inlineRegex = /(```[\s\S]*?```|`[^`\n]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|https?:\/\/[^\s]+|www\.[^\s]+|@[a-zA-Z0-9_]+|#[\p{L}\p{N}_]+|\b\d{1,2}:\d{2}(?::\d{2})?\b)/gu;
  const parts = text.split(inlineRegex);

  return parts.map((part, i) => {
    if (!part) return null;

    // Video Timestamp (e.g. 01:23)
    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(part)) {
      const seconds = parseTimeToSeconds(part);
      return (
        <button
          key={i}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(
              new CustomEvent("blogx-video-seek", { detail: { time: seconds, postId } })
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

    // Inline Code: `code`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2 && !part.startsWith("```")) {
      const code = part.slice(1, -1);
      return (
        <code
          key={i}
          onClick={(e) => e.stopPropagation()}
          className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-[13px] text-primary font-semibold border border-border/60 select-all mx-0.5"
        >
          {code}
        </code>
      );
    }

    // Bold: **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={i} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: *text*
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2 && !part.startsWith("**")) {
      return (
        <em key={i} className="italic text-foreground/90">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Strikethrough: ~~text~~
    if (part.startsWith("~~") && part.endsWith("~~") && part.length >= 4) {
      return (
        <del key={i} className="line-through opacity-70">
          {part.slice(2, -2)}
        </del>
      );
    }

    // Hashtags: #tag
    if (part.startsWith("#") && part.length > 1) {
      const tag = part.slice(1);
      return (
        <Link
          key={i}
          href={`/hashtag/${encodeURIComponent(tag)}`}
          onClick={(e) => e.stopPropagation()}
          className="hashtag-link relative z-10 font-semibold"
        >
          {part}
        </Link>
      );
    }

    // Mentions: @username
    if (part.startsWith("@") && part.length > 1) {
      const username = part.slice(1);
      const isValid = validMentions
        ? validMentions.some((m) => m.toLowerCase() === username.toLowerCase())
        : true;

      if (!isValid) {
        return <span key={i}>{part}</span>;
      }

      return (
        <Link
          key={i}
          href={`/@${username}`}
          onClick={(e) => e.stopPropagation()}
          className="mention-link relative z-10 font-semibold"
        >
          {part}
        </Link>
      );
    }

    // URLs
    if (/^(https?:\/\/|www\.)/i.test(part)) {
      let cleanUrl = part;
      let trailing = "";
      const matchTrailing = cleanUrl.match(/[.,!?:;)]+$/);
      if (matchTrailing) {
        trailing = matchTrailing[0];
        cleanUrl = cleanUrl.slice(0, -trailing.length);
      }

      const safeHref = cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`;

      return (
        <span key={i} className="inline">
          <a
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="url-link relative z-10 hover:underline"
          >
            {cleanUrl}
          </a>
          {trailing}
        </span>
      );
    }

    return <span key={i}>{part}</span>;
  });
}

/**
 * Parses markdown table block into table elements
 */
function renderMarkdownTable(tableText: string, key: any, validMentions?: string[], postId?: number | string) {
  const rows = tableText.trim().split("\n").map(r => r.trim()).filter(Boolean);
  if (rows.length < 2) return <span>{tableText}</span>;

  // Header row
  const headerCells = rows[0].split("|").map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
  // Check if row 1 is delimiter (|---|---|)
  const isDelimiter = /^\|?(\s*:?-+:?\s*\|?)+$/.test(rows[1]);
  const dataRows = isDelimiter ? rows.slice(2) : rows.slice(1);

  return (
    <div key={key} className="my-3 overflow-x-auto rounded-xl border border-border/80 bg-card/60 shadow-xs">
      <table className="w-full text-left text-xs sm:text-sm border-collapse">
        <thead className="bg-muted/60 border-b border-border/70 text-foreground font-bold">
          <tr>
            {headerCells.map((cell, idx) => (
              <th key={idx} className="px-3.5 py-2.5 font-semibold">
                {renderInline(cell, validMentions, postId)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {dataRows.map((row, rIdx) => {
            const cells = row.split("|").map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
            return (
              <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                {cells.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3.5 py-2 text-foreground/90">
                    {renderInline(cell, validMentions, postId)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Main Rich Post Content Renderer
 */
export default function RichPostContent({
  content,
  validMentions = [],
  postId,
}: RichPostContentProps) {
  if (!content) return null;

  const normalized = content.replace(/\r\n/g, "\n");

  // Split code blocks first
  const codeBlockRegex = /(```[\s\S]*?```)/g;
  const sections = normalized.split(codeBlockRegex);

  return (
    <div className="space-y-1">
      {sections.map((section, sIdx) => {
        if (!section) return null;

        // Code Snippet Block (```lang ... ```)
        if (section.startsWith("```") && section.endsWith("```")) {
          const inner = section.slice(3, -3);
          const firstNewline = inner.indexOf("\n");
          let lang = "";
          let code = inner;

          if (firstNewline !== -1) {
            const potentialLang = inner.slice(0, firstNewline).trim();
            if (/^[a-zA-Z0-9_-]+$/.test(potentialLang)) {
              lang = potentialLang;
              code = inner.slice(firstNewline + 1);
            }
          }

          return <CodeSnippetBlock key={sIdx} code={code} language={lang} />;
        }

        // Parse lines for Headings, Callouts, Tables, Tasklists, Dividers
        const lines = section.split("\n");
        const renderedElements: React.ReactNode[] = [];
        let i = 0;

        while (i < lines.length) {
          const line = lines[i];
          const trimmedLine = line.trim();

          // Blog Quote Card (e.g. ::blog-quote[slug?quote=encodedQuote])
          const blogQuoteMatch = trimmedLine.match(/^::blog-quote\[([^?\]]+)(?:\?quote=([^\]]+))?\]$/i);
          if (blogQuoteMatch) {
            const blogSlug = blogQuoteMatch[1];
            const rawQuote = blogQuoteMatch[2] ? decodeURIComponent(blogQuoteMatch[2]) : "";
            renderedElements.push(
              <BlogQuoteEmbedCard
                key={`blog-quote-${sIdx}-${i}`}
                slug={blogSlug}
                quote={rawQuote}
              />
            );
            i++;
            continue;
          }

          // Standalone Blog Highlight URL (e.g. /blog/slug?highlight=... or https://.../blog/slug?highlight=...)
          const blogHighlightUrlMatch = trimmedLine.match(/^(?:https?:\/\/[^\s]+)?\/blog(?:s)?\/([a-zA-Z0-9_-]+)\?(?:highlight|quote)=([^\s]+)$/i);
          if (blogHighlightUrlMatch) {
            const blogSlug = blogHighlightUrlMatch[1];
            const rawQuote = decodeURIComponent(blogHighlightUrlMatch[2]);
            renderedElements.push(
              <BlogQuoteEmbedCard
                key={`blog-quote-url-${sIdx}-${i}`}
                slug={blogSlug}
                quote={rawQuote}
              />
            );
            i++;
            continue;
          }

          // Markdown Table detection (starts with | and has at least one more |)
          if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|") && i + 1 < lines.length && lines[i + 1].includes("---")) {
            let tableLines = [];
            while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
              tableLines.push(lines[i]);
              i++;
            }
            renderedElements.push(renderMarkdownTable(tableLines.join("\n"), `tbl_${sIdx}_${i}`, validMentions, postId));
            continue;
          }

          // Horizontal Divider (--- or ***)
          if (/^(\s*[-*_]\s*){3,}$/.test(line)) {
            renderedElements.push(
              <hr key={`hr_${sIdx}_${i}`} className="my-3 border-t border-border/70" />
            );
            i++;
            continue;
          }

          // Headings
          if (line.startsWith("# ")) {
            renderedElements.push(
              <h1 key={`h1_${sIdx}_${i}`} className="text-xl sm:text-2xl font-black text-foreground mt-3.5 mb-1.5 tracking-tight font-[family-name:var(--font-fraunces)]">
                {renderInline(line.slice(2), validMentions, postId)}
              </h1>
            );
            i++;
            continue;
          }

          if (line.startsWith("## ")) {
            renderedElements.push(
              <h2 key={`h2_${sIdx}_${i}`} className="text-lg sm:text-xl font-extrabold text-foreground mt-3 mb-1 tracking-tight font-[family-name:var(--font-fraunces)]">
                {renderInline(line.slice(3), validMentions, postId)}
              </h2>
            );
            i++;
            continue;
          }

          if (line.startsWith("### ")) {
            renderedElements.push(
              <h3 key={`h3_${sIdx}_${i}`} className="text-base sm:text-lg font-bold text-foreground mt-2.5 mb-0.5 tracking-tight">
                {renderInline(line.slice(4), validMentions, postId)}
              </h3>
            );
            i++;
            continue;
          }

          // Callout Boxes & Blockquotes (> [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT], > Quote)
          if (line.startsWith("> ") || line === ">") {
            let quoteLines = [];
            while (i < lines.length && (lines[i].startsWith("> ") || lines[i] === ">")) {
              quoteLines.push(lines[i].replace(/^>\s?/, ""));
              i++;
            }
            const fullQuote = quoteLines.join("\n");

            // GitHub style Callout detection
            const calloutMatch = fullQuote.match(/^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*\n?([\s\S]*)/i);

            if (calloutMatch) {
              const type = calloutMatch[1].toUpperCase();
              const quoteContent = calloutMatch[2].trim();

              const calloutStyles: Record<string, { bg: string; border: string; text: string; icon: any; title: string }> = {
                NOTE: { bg: "bg-sky-500/10 dark:bg-sky-500/15", border: "border-sky-500/40", text: "text-sky-600 dark:text-sky-400", icon: Info, title: "Note" },
                TIP: { bg: "bg-emerald-500/10 dark:bg-emerald-500/15", border: "border-emerald-500/40", text: "text-emerald-600 dark:text-emerald-400", icon: Sparkles, title: "Tip" },
                WARNING: { bg: "bg-amber-500/10 dark:bg-amber-500/15", border: "border-amber-500/40", text: "text-amber-600 dark:text-amber-400", icon: AlertTriangle, title: "Warning" },
                IMPORTANT: { bg: "bg-rose-500/10 dark:bg-rose-500/15", border: "border-rose-500/40", text: "text-rose-600 dark:text-rose-400", icon: AlertCircle, title: "Important" },
                CAUTION: { bg: "bg-red-500/10 dark:bg-red-500/15", border: "border-red-500/40", text: "text-red-600 dark:text-red-400", icon: AlertCircle, title: "Caution" },
              };

              const style = calloutStyles[type] || calloutStyles.NOTE;
              const IconComp = style.icon;

              renderedElements.push(
                <div
                  key={`callout_${sIdx}_${i}`}
                  className={`my-3 p-3.5 sm:p-4 rounded-2xl border ${style.border} ${style.bg} space-y-1.5 shadow-xs`}
                >
                  <div className={`flex items-center gap-1.5 font-bold text-xs ${style.text}`}>
                    <IconComp className="size-4 shrink-0" />
                    <span>{style.title}</span>
                  </div>
                  <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {renderInline(quoteContent, validMentions, postId)}
                  </div>
                </div>
              );
            } else {
              // Standard Blockquote
              renderedElements.push(
                <blockquote
                  key={`quote_${sIdx}_${i}`}
                  className="my-3 pl-3.5 pr-2 py-1 border-l-4 border-primary/50 bg-primary/5 rounded-r-xl italic text-foreground/90 text-sm leading-relaxed"
                >
                  {renderInline(fullQuote, validMentions, postId)}
                </blockquote>
              );
            }
            continue;
          }

          // Tasklist / Checklists (- [ ] or - [x])
          const taskMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)/);
          if (taskMatch) {
            const isChecked = taskMatch[1].toLowerCase() === "x";
            const taskText = taskMatch[2];

            renderedElements.push(
              <div key={`task_${sIdx}_${i}`} className="flex items-start gap-2 my-1 text-sm">
                <span className="mt-0.5 text-primary">
                  {isChecked ? (
                    <CheckSquare className="size-4 text-primary fill-primary/20" />
                  ) : (
                    <Square className="size-4 text-muted-foreground" />
                  )}
                </span>
                <span className={isChecked ? "line-through text-muted-foreground" : "text-foreground"}>
                  {renderInline(taskText, validMentions, postId)}
                </span>
              </div>
            );
            i++;
            continue;
          }

          // Standard bullet line (- or *)
          const bulletMatch = line.match(/^[-*]\s+(.*)/);
          if (bulletMatch) {
            renderedElements.push(
              <div key={`bullet_${sIdx}_${i}`} className="flex items-start gap-2 my-1 text-sm text-foreground pl-1">
                <span className="text-primary font-black">•</span>
                <span className="flex-1">{renderInline(bulletMatch[1], validMentions, postId)}</span>
              </div>
            );
            i++;
            continue;
          }

          // Standard paragraph line
          renderedElements.push(
            <div key={`line_${sIdx}_${i}`} className="leading-[1.6]">
              {renderInline(line, validMentions, postId)}
            </div>
          );
          i++;
        }

        return <React.Fragment key={sIdx}>{renderedElements}</React.Fragment>;
      })}
    </div>
  );
}
