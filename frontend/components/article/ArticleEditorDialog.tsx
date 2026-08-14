"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
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
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
  Eye,
  Edit3,
  X,
  Upload,
  Loader2,
  Bookmark,
  Sparkles,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn, getAvatarUrl } from "@/lib/utils";
import { compressImage } from "@/lib/image-compress";
import { useRouter } from "next/navigation";

export interface ArticleEditorInitialData {
  id?: number;
  title?: string;
  content?: string;
  excerpt?: string;
  cover_image?: string | null;
  tags?: string[];
  status?: string;
}

interface ArticleEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: ArticleEditorInitialData | null;
  onSaved?: (article: any) => void;
}

export default function ArticleEditorDialog({
  open,
  onOpenChange,
  initialData,
  onSaved,
}: ArticleEditorDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [removeExistingCover, setRemoveExistingCover] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<"draft" | "published" | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setContent(initialData.content || "");
      setExcerpt(initialData.excerpt || "");
      setTags(initialData.tags || []);
      setCoverPreview(initialData.cover_image ? (getAvatarUrl(initialData.cover_image) || null) : null);
      setCoverFile(null);
      setRemoveExistingCover(false);
    } else {
      setTitle("");
      setContent("");
      setExcerpt("");
      setTags([]);
      setCoverFile(null);
      setCoverPreview(null);
      setRemoveExistingCover(false);
    }
    setIsPreview(false);
  }, [initialData, open]);

  // Handle Cover Image
  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        toast.error("Cover image must be under 100MB");
        return;
      }
      try {
        const optimized = await compressImage(file, { maxWidth: 3840, maxHeight: 2160, quality: 0.90 });
        setCoverFile(optimized);
        setCoverPreview(URL.createObjectURL(optimized));
        setRemoveExistingCover(false);
      } catch {
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
        setRemoveExistingCover(false);
      }
    }
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setRemoveExistingCover(true);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  // Tag Helpers
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

  // Text formatting insertion helpers
  const insertFormatting = (prefix: string, suffix: string = "", defaultText: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length
      );
    }, 10);
  };

  const handleInsertLink = () => {
    const url = prompt("Enter URL:", "https://");
    if (!url) return;
    const text = prompt("Enter link text:", "link") || url;
    insertFormatting(`[${text}](${url})`);
  };

  const handleInsertImage = () => {
    const url = prompt("Enter Image URL:", "https://");
    if (!url) return;
    const alt = prompt("Enter Image description (alt):", "image") || "image";
    insertFormatting(`![${alt}](${url})`);
  };

  // Calculate stats
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  // Save or Publish
  const handleSave = async (status: "published" | "draft") => {
    if (!title.trim()) {
      toast.error("Please provide an article title");
      return;
    }
    if (!content.trim()) {
      toast.error("Article content cannot be empty");
      return;
    }

    setIsSubmitting(true);
    setSubmittingAction(status);

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("content", content);
    formData.append("status", status);
    if (excerpt.trim()) formData.append("excerpt", excerpt.trim());

    tags.forEach((tag, idx) => {
      formData.append(`tags[${idx}]`, tag);
    });

    if (coverFile) {
      // Ensure file is compressed under 1.5MB before sending
      const readyFile = coverFile.size > 1.5 * 1024 * 1024
        ? await compressImage(coverFile, { maxWidth: 2000, maxHeight: 1800, quality: 0.85 })
        : coverFile;
      formData.append("cover_image", readyFile);
    }
    if (removeExistingCover) {
      formData.append("remove_cover", "1");
    }

    try {
      let res;
      if (initialData?.id) {
        res = await api.post(`/api/articles/${initialData.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success(status === "published" ? "Article published successfully!" : "Draft updated successfully");
      } else {
        res = await api.post("/api/articles", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success(status === "published" ? "Article published successfully!" : "Draft saved to your private drafts");
      }

      onSaved?.(res.data.article);
      window.dispatchEvent(new CustomEvent("articles-updated"));
      onOpenChange(false);

      if (status === "published" && res.data.article?.slug) {
        router.push(`/article/${encodeURIComponent(res.data.article.slug)}`);
      }
    } catch (err: any) {
      let msg = "Failed to save article";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background border-border">
        {/* Header */}
        <DialogHeader className="px-5 py-3.5 border-b border-border/60 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="grid place-items-center size-8 rounded-lg bg-primary/10 text-primary">
              <Edit3 className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground leading-tight">
                {initialData?.id ? "Edit Article" : "Write an Article"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {wordCount} words · ~{readTime} min read
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mr-6">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsPreview(!isPreview)}
              className="h-8 px-2.5 gap-1.5 text-xs font-semibold"
            >
              {isPreview ? (
                <>
                  <Edit3 className="size-3.5" />
                  Editor
                </>
              ) : (
                <>
                  <Eye className="size-3.5" />
                  Preview
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Cover Image Uploader */}
          <div className="relative">
            {coverPreview ? (
              <div className="relative h-44 sm:h-56 w-full rounded-2xl overflow-hidden border border-border/60 group">
                <img
                  src={coverPreview}
                  alt="Article Cover"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground text-foreground backdrop-blur-sm transition-colors shadow-md"
                  aria-label="Remove cover"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="w-full h-28 border-2 border-dashed border-border/70 hover:border-primary/60 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors bg-muted/20 hover:bg-muted/40"
              >
                <Upload className="size-5" />
                <span className="text-xs font-semibold">Add a Cover Image (Optional)</span>
                <span className="text-[11px] text-muted-foreground/70">PNG, JPG, WebP up to 25MB</span>
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
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article Title..."
            className="w-full text-xl sm:text-2xl font-black bg-transparent border-0 focus:outline-none placeholder:text-muted-foreground/50 text-foreground"
          />

          {/* Tags */}
          <div className="flex items-center flex-wrap gap-2 pt-1 border-t border-border/40">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-destructive"
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
                placeholder="Add tags (press Enter)..."
                className="text-xs bg-transparent border-0 focus:outline-none text-foreground placeholder:text-muted-foreground/60 w-36"
              />
            )}
          </div>

          {/* Editor or Preview Mode */}
          {isPreview ? (
            <div className="prose dark:prose-invert max-w-none min-h-[220px] p-4 rounded-xl bg-muted/20 border border-border/50">
              <h1 className="text-2xl font-bold">{title || "Untitled Article"}</h1>
              <div className="whitespace-pre-wrap leading-relaxed text-sm text-foreground/90 mt-4 font-sans">
                {content || "No content yet..."}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Formatting Toolbar */}
              <div className="flex items-center gap-0.5 p-1 rounded-xl bg-muted/40 border border-border/50 flex-wrap">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting("# ", "", "Heading 1")}
                  className="size-8 p-0"
                  title="Heading 1"
                >
                  <Heading1 className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting("## ", "", "Heading 2")}
                  className="size-8 p-0"
                  title="Heading 2"
                >
                  <Heading2 className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting("### ", "", "Heading 3")}
                  className="size-8 p-0"
                  title="Heading 3"
                >
                  <Heading3 className="size-4" />
                </Button>
                <div className="w-px h-4 bg-border/60 mx-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting("**", "**", "bold text")}
                  className="size-8 p-0"
                  title="Bold"
                >
                  <Bold className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting("*", "*", "italic text")}
                  className="size-8 p-0"
                  title="Italic"
                >
                  <Italic className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting("~~", "~~", "strikethrough")}
                  className="size-8 p-0"
                  title="Strikethrough"
                >
                  <Strikethrough className="size-4" />
                </Button>
                <div className="w-px h-4 bg-border/60 mx-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting("> ", "", "quote text")}
                  className="size-8 p-0"
                  title="Quote"
                >
                  <Quote className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting("- ", "", "list item")}
                  className="size-8 p-0"
                  title="Bullet List"
                >
                  <List className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting("1. ", "", "list item")}
                  className="size-8 p-0"
                  title="Numbered List"
                >
                  <ListOrdered className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting("```\n", "\n```", "code block")}
                  className="size-8 p-0"
                  title="Code Block"
                >
                  <Code className="size-4" />
                </Button>
                <div className="w-px h-4 bg-border/60 mx-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleInsertLink}
                  className="size-8 p-0"
                  title="Insert Link"
                >
                  <LinkIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleInsertImage}
                  className="size-8 p-0"
                  title="Insert Image"
                >
                  <ImageIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => insertFormatting("\n---\n")}
                  className="size-8 p-0"
                  title="Divider"
                >
                  <Minus className="size-4" />
                </Button>
              </div>

              {/* Text Area */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your story here... You can use headings, lists, quotes, images, and links."
                rows={12}
                className="w-full p-4 rounded-xl bg-muted/20 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 resize-y font-mono"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-border/60 flex items-center justify-between bg-muted/10 shrink-0">
          <div className="text-xs text-muted-foreground">
            {statusText(initialData?.status)}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleSave("draft")}
              className="rounded-full text-xs font-semibold px-4 h-9"
            >
              {isSubmitting && submittingAction === "draft" ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <Bookmark className="size-3.5 mr-1 text-violet-500" />
              )}
              Save as Draft
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleSave("published")}
              className="rounded-full text-xs font-bold px-5 h-9 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              {isSubmitting && submittingAction === "published" ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <Sparkles className="size-3.5 mr-1" />
              )}
              Publish Article
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function statusText(status?: string) {
  if (status === "draft") return "Currently saved as Private Draft";
  if (status === "published") return "Currently Published";
  return "New Article";
}
