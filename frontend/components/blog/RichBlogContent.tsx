"use client";

import React from "react";
import CodeBlock from "./CodeBlock";
import YouTubeEmbed, { extractYouTubeId } from "./YouTubeEmbed";
import TwitterEmbed, { extractTweetInfo } from "./TwitterEmbed";

function formatInlineText(text: string): React.ReactNode {
  if (!text) return null;

  // Match bold (**text**), italic (*text*), inline code (`code`), and links ([title](url) or naked https://...)
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\)|https?:\/\/[^\s]+)/g);

  return parts.map((part, i) => {
    if (!part) return null;

    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return <em key={i} className="italic text-foreground/95">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-xs text-primary font-semibold border border-border/50">
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      let href = linkMatch[2].trim();
      if (!href.startsWith("http://") && !href.startsWith("https://")) {
        href = `https://${href}`;
      }
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80 font-medium transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
    }
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
    if (ytId && (trimmed.startsWith("https://") || trimmed.startsWith("http://") || trimmed.startsWith("www.") || trimmed.startsWith("> [!YOUTUBE"))) {
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

    // 5. Headings with Fraunces font
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={index} className="text-lg sm:text-xl font-bold text-foreground mt-8 mb-2 font-[family-name:var(--font-fraunces)]">
          {formatInlineText(line.replace(/^###\s+/, ""))}
        </h3>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={index} className="text-xl sm:text-2xl font-bold text-foreground mt-10 mb-3 font-[family-name:var(--font-fraunces)]">
          {formatInlineText(line.replace(/^##\s+/, ""))}
        </h2>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={index} className="text-2xl sm:text-3xl font-extrabold text-foreground mt-12 mb-4 font-[family-name:var(--font-fraunces)]">
          {formatInlineText(line.replace(/^#\s+/, ""))}
        </h1>
      );
      continue;
    }

    // 6. Blockquote & Callout
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

    // 7. Divider
    if (trimmed === "---" || trimmed === "***") {
      elements.push(<hr key={index} className="my-8 border-border/60" />);
      continue;
    }

    // 8. Image markdown: ![alt](url)
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

    // 9. Bullet List
    if (line.match(/^[-*]\s+/)) {
      elements.push(
        <li key={index} className="ml-5 list-disc text-[15px] sm:text-base leading-relaxed text-foreground/90 my-1">
          {formatInlineText(line.replace(/^[-*]\s+/, ""))}
        </li>
      );
      continue;
    }

    // 10. Numbered List
    if (line.match(/^\d+\.\s+/)) {
      elements.push(
        <li key={index} className="ml-5 list-decimal text-[15px] sm:text-base leading-relaxed text-foreground/90 my-1">
          {formatInlineText(line.replace(/^\d+\.\s+/, ""))}
        </li>
      );
      continue;
    }

    // 11. Empty lines
    if (!trimmed) {
      elements.push(<div key={index} className="h-3" />);
      continue;
    }

    // 12. Standard paragraph
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
