"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  X,
  Eye,
  Edit3,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Strikethrough,
  Quote,
  List,
  ListOrdered,
  Code,
  Table as TableIcon,
  Minus,
  Sparkles,
  Loader2,
  Bookmark,
  Send,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn, getAvatarUrl } from "@/lib/utils";
import { compressImage } from "@/lib/image-compress";

function formatInlineText(line: string): React.ReactNode {
  const regex = /(\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s]+|www\.[^\s]+)/gu;
  const parts = line.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;

    const mdMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (mdMatch) {
      const label = mdMatch[1];
      let href = mdMatch[2].trim();
      if (!href.startsWith("http://") && !href.startsWith("https://")) {
        href = `https://${href}`;
      }
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline font-medium"
        >
          {label}
        </a>
      );
    }

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
            className="text-primary underline"
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

// Markdown & Table & Callout Renderer for Rich Blog Preview
function renderRichContent(text: string) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = (keyPrefix: number) => {
    if (tableRows.length > 0) {
      const headerRow = tableRows[0];
      const bodyRows = tableRows.slice(1);

      elements.push(
        <div key={`table-${keyPrefix}`} className="my-6 overflow-x-auto rounded-lg border border-border/70 shadow-2xs">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/60">
                {headerRow.map((cell, idx) => (
                  <th key={idx} className="px-4 py-3 font-bold text-foreground font-[family-name:var(--font-fraunces)]">
                    {formatInlineText(cell.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-muted/20 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-2.5 text-foreground/90 leading-relaxed">
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
    }
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];

    // Code block check
    if (line.trim().startsWith("```")) {
      if (inTable) flushTable(index);
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${index}`}
            className="p-4 my-4 rounded-lg bg-muted/80 text-foreground font-mono text-xs sm:text-sm overflow-x-auto border border-border/60"
          >
            <code>{codeBuffer.join("\n")}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Markdown Table row: | Col 1 | Col 2 |
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const isDivider = /^\|\s*[-:]+[-| :]*\|$/.test(line.trim());
      if (isDivider) {
        continue;
      }
      const cells = line.split("|").slice(1, -1);
      tableRows.push(cells);
      inTable = true;
      continue;
    } else if (inTable) {
      flushTable(index);
    }

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={index} className="text-lg sm:text-xl font-bold text-foreground mt-6 mb-2 font-[family-name:var(--font-fraunces)]">
          {formatInlineText(line.replace(/^###\s+/, ""))}
        </h3>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={index} className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-3 font-[family-name:var(--font-fraunces)]">
          {formatInlineText(line.replace(/^##\s+/, ""))}
        </h2>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={index} className="text-2xl sm:text-3xl font-extrabold text-foreground mt-10 mb-4 font-[family-name:var(--font-fraunces)]">
          {formatInlineText(line.replace(/^#\s+/, ""))}
        </h1>
      );
      continue;
    }

    // Callout / Note: > [!NOTE] or > [!TIP] or standard Blockquote
    if (line.startsWith("> ")) {
      const quoteText = line.replace(/^>\s+/, "");
      elements.push(
        <blockquote
          key={index}
          className="border-l-3 border-primary pl-4 py-2 my-4 italic text-foreground/80 bg-primary/5 rounded-r-md"
        >
          {formatInlineText(quoteText)}
        </blockquote>
      );
      continue;
    }

    // Divider
    if (line.trim() === "---" || line.trim() === "***") {
      elements.push(<hr key={index} className="my-8 border-border/60" />);
      continue;
    }

    // Image markdown: ![alt](url)
    const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const src = imgMatch[2];
      elements.push(
        <figure key={index} className="my-6">
          <img
            src={src}
            alt={alt}
            className="w-full max-h-[500px] object-cover rounded-lg border border-border/60"
          />
          {alt && alt !== "image" && (
            <figcaption className="text-center text-xs text-muted-foreground mt-2">
              {alt}
            </figcaption>
          )}
        </figure>
      );
      continue;
    }

    // Bullet List
    if (line.match(/^[-*]\s+/)) {
      elements.push(
        <li key={index} className="ml-5 list-disc text-[15px] leading-relaxed text-foreground/90 my-1">
          {formatInlineText(line.replace(/^[-*]\s+/, ""))}
        </li>
      );
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\.\s+/)) {
      elements.push(
        <li key={index} className="ml-5 list-decimal text-[15px] leading-relaxed text-foreground/90 my-1">
          {formatInlineText(line.replace(/^\d+\.\s+/, ""))}
        </li>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={index} className="h-3" />);
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={index} className="text-[15px] sm:text-base leading-relaxed text-foreground/90 my-2">
        {formatInlineText(line)}
      </p>
    );
  }

  if (inTable) {
    flushTable(lines.length);
  }

  return elements;
}

export default function NewBlogPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<"draft" | "published" | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 400)}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [content, adjustHeight]);

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 900,
        quality: 0.85,
      });
      setCoverFile(compressed);
      setCoverPreview(URL.createObjectURL(compressed));
    } catch {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const insertFormatting = (prefix: string, suffix = "", placeholder = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const textToInsert = selectedText || placeholder;
    const replacement = `${prefix}${textToInsert}${suffix}`;

    const newContent =
      content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + textToInsert.length
      );
      adjustHeight();
    }, 0);
  };

  const insertTable = () => {
    const sampleTable = `\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Item A | Value 1 | Details |\n| Item B | Value 2 | Details |\n`;
    insertFormatting(sampleTable, "", "");
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, "").toLowerCase();
      if (val && !tags.includes(val) && tags.length < 5) {
        setTags([...tags, val]);
        setTagInput("");
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSave = async (status: "draft" | "published") => {
    if (!title.trim()) {
      toast.error("Please enter a blog title.");
      return;
    }
    if (!content.trim()) {
      toast.error("Please write some content for your blog.");
      return;
    }

    setIsSubmitting(true);
    setSubmittingAction(status);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content", content);
      if (excerpt.trim()) formData.append("excerpt", excerpt.trim());
      formData.append("status", status);
      formData.append("read_time", String(readTime));

      tags.forEach((tag, idx) => {
        formData.append(`tags[${idx}]`, tag);
      });

      if (coverFile) {
        formData.append("cover_image", coverFile);
      }

      const res = await api.post("/api/blogs", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const savedBlog = res.data?.blog || res.data?.article || res.data?.data || res.data;
      toast.success(
        status === "published"
          ? "Blog post published successfully!"
          : "Draft saved successfully."
      );

      if (status === "published" && savedBlog?.slug) {
        router.push(`/blog/${encodeURIComponent(savedBlog.slug)}`);
      } else {
        router.push("/blogs");
      }
    } catch (err: any) {
      let msg = "Failed to save blog post";
      if (err.response?.data?.errors) {
        const firstError = Object.values(err.response.data.errors)[0];
        msg = Array.isArray(firstError) ? firstError[0] : String(firstError);
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 selection:bg-primary/20">
      {/* Top Fixed Notion-style Bar */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/70 px-4 sm:px-8 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/blogs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Blog</span>
          </Link>
          <span className="text-muted-foreground/50 text-xs">/</span>
          <span className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-[300px]">
            {title || "Untitled Post"}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
            className="h-8.5 px-3 text-xs font-semibold rounded-md gap-1.5 hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            {isPreview ? (
              <>
                <Edit3 className="size-3.5" />
                <span>Editor</span>
              </>
            ) : (
              <>
                <Eye className="size-3.5" />
                <span>Preview</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={() => handleSave("draft")}
            className="h-8.5 px-3.5 text-xs font-semibold rounded-md gap-1.5"
          >
            {isSubmitting && submittingAction === "draft" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Bookmark className="size-3.5 text-muted-foreground" />
            )}
            <span>Save Draft</span>
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isSubmitting}
            onClick={() => handleSave("published")}
            className="h-8.5 px-4 text-xs font-bold rounded-md gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
          >
            {isSubmitting && submittingAction === "published" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            <span>Publish</span>
          </Button>
        </div>
      </header>

      {/* Main Workspace (Notion-style centered container) */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        {/* Cover Image Upload Area */}
        <div className="mb-6 group">
          {coverPreview ? (
            <div className="relative h-48 sm:h-72 w-full rounded-lg overflow-hidden border border-border/70 group shadow-2xs">
              <img
                src={coverPreview}
                alt="Cover"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveCover}
                className="absolute top-3 right-3 p-1.5 rounded-md bg-background/80 hover:bg-destructive hover:text-destructive-foreground text-foreground backdrop-blur-sm transition-colors shadow-md"
                title="Remove cover"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors border border-dashed border-border/80"
            >
              <ImageIcon className="size-3.5" />
              <span>Add Cover Image</span>
            </button>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverSelect}
          />
        </div>

        {/* Title Input */}
        <div className="mb-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post Title..."
            className="w-full text-3xl sm:text-5xl font-bold bg-transparent border-0 focus:outline-none placeholder:text-muted-foreground/40 text-foreground font-[family-name:var(--font-fraunces)] leading-tight"
          />
        </div>

        {/* Tags & Meta Toolbar */}
        <div className="flex items-center flex-wrap gap-2 py-3 border-y border-border/50 text-xs text-muted-foreground mb-6">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            <span>~{readTime} min read</span>
            <span>·</span>
            <span>{wordCount} words</span>
          </div>

          <div className="h-3 w-px bg-border mx-2" />

          {/* Tags */}
          <div className="flex items-center flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary font-semibold text-xs"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-destructive text-primary/70"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {tags.length < 5 && (
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="+ Add tag (Enter)..."
                className="text-xs bg-transparent border-0 focus:outline-none text-foreground placeholder:text-muted-foreground/60 w-32"
              />
            )}
          </div>
        </div>

        {/* Excerpt optional field */}
        <div className="mb-6">
          <input
            type="text"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Optional subtitle / summary..."
            className="w-full text-sm sm:text-base text-muted-foreground bg-transparent border-0 focus:outline-none placeholder:text-muted-foreground/40 italic"
          />
        </div>

        {/* Formatting Block Toolbar (Sticky in Editor Mode) */}
        {!isPreview && (
          <div className="sticky top-16 z-30 mb-4 p-1.5 rounded-md bg-card/90 backdrop-blur-md border border-border/80 shadow-sm flex items-center gap-0.5 flex-wrap">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting("# ", "", "Large Heading")}
              className="size-7.5 p-0 rounded text-muted-foreground hover:text-foreground"
              title="Heading 1"
            >
              <Heading1 className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting("## ", "", "Medium Heading")}
              className="size-7.5 p-0 rounded text-muted-foreground hover:text-foreground"
              title="Heading 2"
            >
              <Heading2 className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting("### ", "", "Small Heading")}
              className="size-7.5 p-0 rounded text-muted-foreground hover:text-foreground"
              title="Heading 3"
            >
              <Heading3 className="size-4" />
            </Button>

            <div className="w-px h-4 bg-border mx-1 shrink-0" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting("**", "**", "bold")}
              className="size-7.5 p-0 rounded text-muted-foreground hover:text-foreground"
              title="Bold"
            >
              <Bold className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting("*", "*", "italic")}
              className="size-7.5 p-0 rounded text-muted-foreground hover:text-foreground"
              title="Italic"
            >
              <Italic className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting("~~", "~~", "strikethrough")}
              className="size-7.5 p-0 rounded text-muted-foreground hover:text-foreground"
              title="Strikethrough"
            >
              <Strikethrough className="size-4" />
            </Button>

            <div className="w-px h-4 bg-border mx-1 shrink-0" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting("- ", "", "List item")}
              className="size-7.5 p-0 rounded text-muted-foreground hover:text-foreground"
              title="Bullet List"
            >
              <List className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting("1. ", "", "Numbered item")}
              className="size-7.5 p-0 rounded text-muted-foreground hover:text-foreground"
              title="Numbered List"
            >
              <ListOrdered className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting("> ", "", "Insightful quote or note")}
              className="size-7.5 p-0 rounded text-muted-foreground hover:text-foreground"
              title="Quote / Callout"
            >
              <Quote className="size-4" />
            </Button>

            <div className="w-px h-4 bg-border mx-1 shrink-0" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting("```\n", "\n```", "// code snippet")}
              className="size-7.5 p-0 rounded text-muted-foreground hover:text-foreground"
              title="Code Block"
            >
              <Code className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={insertTable}
              className="size-7.5 p-0 rounded text-muted-foreground hover:text-foreground gap-1 px-1.5 w-auto"
              title="Insert Table"
            >
              <TableIcon className="size-4" />
              <span className="text-[11px] font-medium hidden sm:inline">Table</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting("\n---\n", "", "")}
              className="size-7.5 p-0 rounded text-muted-foreground hover:text-foreground"
              title="Divider"
            >
              <Minus className="size-4" />
            </Button>
          </div>
        )}

        {/* Content Area */}
        {isPreview ? (
          <div className="min-h-[500px] p-6 sm:p-8 rounded-lg bg-card/40 border border-border/60 shadow-2xs">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground font-[family-name:var(--font-fraunces)] mb-4">
              {title || "Untitled Post"}
            </h1>
            {excerpt && (
              <p className="text-base text-muted-foreground italic mb-6">
                {excerpt}
              </p>
            )}
            <div className="article-body">
              {renderRichContent(content)}
            </div>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your story here... Use Markdown, Tables, Images, or Code. Type # for headings, | for tables, > for callouts..."
            className="w-full min-h-[450px] bg-transparent border-0 focus:outline-none placeholder:text-muted-foreground/30 text-foreground text-base sm:text-lg leading-relaxed resize-none font-sans"
          />
        )}
      </main>
    </div>
  );
}
