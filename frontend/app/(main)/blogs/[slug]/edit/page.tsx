"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  X,
  Eye,
  Edit3,
  Heading3,
  Bold,
  Italic,
  Quote,
  List,
  Code2,
  Table as TableIcon,
  Minus,
  Sparkles,
  Loader2,
  Bookmark,
  Send,
  Video,
  Layers,
  Clock,
  Terminal,
  Info,
  AlertTriangle,
  CheckSquare,
  Strikethrough,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn, getAvatarUrl } from "@/lib/utils";
import { compressImage } from "@/lib/image-compress";
import RichBlogContent from "@/components/blog/RichBlogContent";
import SlashMenu from "@/components/blog/SlashMenu";

export default function EditBlogPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;
  const { user } = useAuth();

  const [blogId, setBlogId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);

  // Compact series state
  const [userSeries, setUserSeries] = useState<Array<{ id: number; title: string; blogs_count: number }>>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<number | "none">("none");
  const [seriesOrder, setSeriesOrder] = useState<number>(1);

  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<"draft" | "published" | null>(null);

  // Dialogs
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);
  const [youtubeInput, setYoutubeInput] = useState("");
  const [twitterDialogOpen, setTwitterDialogOpen] = useState(false);
  const [twitterInput, setTwitterInput] = useState("");
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState("typescript");
  const [codeSnippet, setCodeSnippet] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 450)}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [content, adjustHeight]);

  useEffect(() => {
    if (!user) return;
    api
      .get("/api/user/series")
      .then((res) => {
        setUserSeries(res.data?.series || res.data?.data || []);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);

    api
      .get(`/api/blogs/${encodeURIComponent(slug)}`)
      .then((res) => {
        const blog = res.data?.blog || res.data;
        if (blog) {
          setBlogId(blog.id);
          setTitle(blog.title || "");
          setContent(blog.content || "");
          setExcerpt(blog.excerpt || "");
          setTags(blog.tags || []);
          if (blog.series_id) {
            setSelectedSeriesId(blog.series_id);
            setSeriesOrder(blog.series_order || 1);
          }
          if (blog.cover_image) {
            setCoverPreview(getAvatarUrl(blog.cover_image) || null);
          }
        }
      })
      .catch(() => {
        toast.error("Failed to load blog post for editing");
        router.push("/blogs");
      })
      .finally(() => setIsLoading(false));
  }, [slug, router]);

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
      setRemoveCover(false);
    } catch {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
      setRemoveCover(false);
    }
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setRemoveCover(true);
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

  const handleSlashSelect = (commandId: string) => {
    switch (commandId) {
      case "h1":
        insertFormatting("\n# ", "\n", "Heading 1");
        break;
      case "h2":
        insertFormatting("\n## ", "\n", "Heading 2");
        break;
      case "h3":
        insertFormatting("\n### ", "\n", "Heading 3");
        break;
      case "code":
        setCodeDialogOpen(true);
        break;
      case "youtube":
        setYoutubeDialogOpen(true);
        break;
      case "twitter":
        setTwitterDialogOpen(true);
        break;
      case "table":
        insertFormatting(
          "\n| Feature | Status | Notes |\n| --- | --- | --- |\n| Item 1 | Active | Details |\n| Item 2 | Coming Soon | Details |\n",
          "",
          ""
        );
        break;
      case "note":
        insertFormatting("\n> [!NOTE]\n> ", "\n", "Write your note information here...");
        break;
      case "tip":
        insertFormatting("\n> [!TIP]\n> ", "\n", "Share a helpful tip or trick...");
        break;
      case "warning":
        insertFormatting("\n> [!WARNING]\n> ", "\n", "Warning: Important caution to pay attention to...");
        break;
      case "important":
        insertFormatting("\n> [!IMPORTANT]\n> ", "\n", "Crucial information that should not be missed...");
        break;
      case "caution":
        insertFormatting("\n> [!CAUTION]\n> ", "\n", "Caution: High risk action or breaking change...");
        break;
      case "task-list":
        insertFormatting("\n- [ ] ", "\n", "New checklist task");
        break;
      case "timestamp":
        insertFormatting("01:23", "", "");
        break;
      case "strikethrough":
        insertFormatting("~~", "~~", "strikethrough text");
        break;
      case "callout":
        insertFormatting("\n> ", "\n", "Enter quote or takeaway here...");
        break;
      case "bullet-list":
        insertFormatting("\n- ", "\n", "List item");
        break;
      case "numbered-list":
        insertFormatting("\n1. ", "\n", "Step one");
        break;
      case "divider":
        insertFormatting("\n---\n", "", "");
        break;
      default:
        break;
    }
  };

  const handleInsertYouTube = () => {
    if (!youtubeInput.trim()) return;
    insertFormatting(`\n\n${youtubeInput.trim()}\n\n`, "", "");
    setYoutubeInput("");
    setYoutubeDialogOpen(false);
  };

  const handleInsertTwitter = () => {
    if (!twitterInput.trim()) return;
    insertFormatting(`\n\n${twitterInput.trim()}\n\n`, "", "");
    setTwitterInput("");
    setTwitterDialogOpen(false);
  };

  const handleInsertCode = () => {
    const code = codeSnippet.trim() || "// write code here";
    insertFormatting(`\n\`\`\`${codeLanguage}\n${code}\n\`\`\`\n`, "", "");
    setCodeSnippet("");
    setCodeDialogOpen(false);
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
    if (!blogId) return;
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
      formData.append("excerpt", excerpt.trim());
      formData.append("status", status);

      if (removeCover) {
        formData.append("remove_cover", "1");
      } else if (coverFile) {
        formData.append("cover_image", coverFile);
      }

      if (selectedSeriesId !== "none") {
        formData.append("series_id", String(selectedSeriesId));
        formData.append("series_order", String(seriesOrder));
      } else {
        formData.append("series_id", "");
      }

      tags.forEach((tag, idx) => {
        formData.append(`tags[${idx}]`, tag);
      });

      const res = await api.post(`/api/blogs/${blogId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updatedBlog = res.data?.blog || res.data;
      toast.success(
        status === "published"
          ? "Blog post updated and published!"
          : "Draft updated successfully."
      );

      if (updatedBlog?.slug) {
        router.push(`/blog/${encodeURIComponent(updatedBlog.slug)}`);
      } else {
        router.push("/blogs");
      }
    } catch (err: any) {
      let msg = "Failed to update blog post";
      if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="text-xs font-medium">Loading blog editor...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 selection:bg-primary/20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/70 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Link
            href="/blogs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Blogs</span>
          </Link>
          <span className="text-muted-foreground/40 text-xs">/</span>
          <span className="text-xs font-bold text-foreground truncate max-w-[180px] sm:max-w-[280px]">
            Edit: {title}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
            className="h-8 px-2.5 text-xs font-semibold rounded-md gap-1.5 hover:bg-muted text-muted-foreground hover:text-foreground"
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
            className="h-8 px-3 text-xs font-semibold rounded-md gap-1.5"
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
            className="h-8 px-3.5 text-xs font-bold rounded-md gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
          >
            {isSubmitting && submittingAction === "published" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            <span>Publish Update</span>
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
        {/* Cover Image Upload */}
        <div className="mb-6 group">
          {coverPreview ? (
            <div className="relative h-44 sm:h-64 w-full rounded-lg overflow-hidden border border-border/70 shadow-xs">
              <img
                src={coverPreview}
                alt="Cover"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveCover}
                className="absolute top-2.5 right-2.5 p-1 rounded-md bg-background/80 hover:bg-destructive hover:text-white text-foreground backdrop-blur-sm transition-colors shadow-xs"
                title="Remove cover"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="w-full h-20 sm:h-24 border border-dashed border-border/80 hover:border-primary/50 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Upload className="size-4 text-primary" />
              <span className="text-xs font-semibold">Add cover image (Optional)</span>
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

        {/* Title */}
        <input
          type="text"
          placeholder="Title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-2xl sm:text-4xl font-extrabold tracking-tight bg-transparent text-foreground placeholder:text-muted-foreground/40 outline-hidden font-[family-name:var(--font-fraunces)] mb-4"
        />

        {/* Clean Standard Toolbar */}
        {!isPreview && (
          <div className="sticky top-12 z-30 mb-4 p-1 rounded-lg border border-border/70 bg-background/95 backdrop-blur-md flex flex-wrap items-center gap-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setSlashMenuOpen(true)}
              className="px-2 py-1 rounded-md text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="size-3.5" />
              <span>/ Blocks</span>
            </button>

            <div className="h-4 w-px bg-border mx-1" />

            <button
              type="button"
              onClick={() => insertFormatting("### ", "", "Heading")}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Heading"
            >
              <Heading3 className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() => insertFormatting("**", "**", "bold text")}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Bold"
            >
              <Bold className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() => insertFormatting("*", "*", "italic text")}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Italic"
            >
              <Italic className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() => insertFormatting("~~", "~~", "strikethrough text")}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Strikethrough"
            >
              <Strikethrough className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() => insertFormatting("`", "`", "code")}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Inline Code"
            >
              <Terminal className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setCodeDialogOpen(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Code Block"
            >
              <Code2 className="size-3.5 text-purple-500" />
            </button>

            <button
              type="button"
              onClick={() => setYoutubeDialogOpen(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Embed YouTube Video"
            >
              <Video className="size-3.5 text-red-500" />
            </button>

            <button
              type="button"
              onClick={() => setTwitterDialogOpen(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Embed Tweet from X"
            >
              <Sparkles className="size-3.5 text-blue-400" />
            </button>

            <button
              type="button"
              onClick={() =>
                insertFormatting(
                  "\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Item A | Value 1 | Details |\n| Item B | Value 2 | Details |\n",
                  "",
                  ""
                )
              }
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Insert Table"
            >
              <TableIcon className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() => insertFormatting("\n> [!NOTE]\n> ", "\n", "Write your note or key takeaways here...")}
              className="p-1.5 rounded-md text-sky-500 hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
              title="Note Alert Box (> [!NOTE])"
            >
              <Info className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() => insertFormatting("\n> [!WARNING]\n> ", "\n", "Important warning to keep in mind...")}
              className="p-1.5 rounded-md text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
              title="Warning Alert Box (> [!WARNING])"
            >
              <AlertTriangle className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() => insertFormatting("\n- [ ] ", "\n", "Checklist task")}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Task Checklist (- [ ])"
            >
              <CheckSquare className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() => insertFormatting("\n> ", "\n", "Note or quote...")}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Quote"
            >
              <Quote className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() => insertFormatting("\n- ", "\n", "List item")}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Bullet list"
            >
              <List className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() => insertFormatting("\n---\n", "", "")}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Divider"
            >
              <Minus className="size-3.5" />
            </button>
          </div>
        )}

        {/* Content Area / Preview */}
        {isPreview ? (
          <div className="min-h-[450px] p-5 rounded-lg border border-border/80 bg-card/40">
            <RichBlogContent content={content} />
          </div>
        ) : (
          <div className="relative">
            <textarea
              ref={textareaRef}
              placeholder="Tell your story... (Type '/' for block commands)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-transparent text-base sm:text-lg leading-relaxed text-foreground placeholder:text-muted-foreground/40 outline-hidden resize-none min-h-[450px]"
            />
          </div>
        )}

        {/* Tags & Excerpt */}
        <div className="mt-10 pt-6 border-t border-border/70 space-y-4">
          {/* Small Discrete Series Selector */}
          {userSeries.length > 0 && (
            <div className="flex items-center gap-2.5 text-xs flex-wrap">
              <label className="font-semibold text-muted-foreground flex items-center gap-1.5 shrink-0">
                <Layers className="size-3.5 text-primary" />
                <span>Add to Series:</span>
              </label>
              <select
                value={selectedSeriesId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedSeriesId(val === "none" ? "none" : Number(val));
                }}
                className="h-7 px-2 rounded-md border border-border bg-background text-xs text-foreground outline-hidden focus:border-primary max-w-[200px]"
              >
                <option value="none">None (Standalone)</option>
                {userSeries.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>

              {selectedSeriesId !== "none" && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-[11px]">Part #:</span>
                  <input
                    type="number"
                    min={1}
                    value={seriesOrder}
                    onChange={(e) => setSeriesOrder(Math.max(1, Number(e.target.value)))}
                    className="h-8 w-14 px-2 rounded-xl border border-border bg-card text-xs font-bold text-center text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Excerpt</label>
            <textarea
              placeholder="Short summary for feeds (Optional)..."
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className="w-full p-3 rounded-xl border border-border bg-card text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Tags ({tags.length}/5)</label>
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}

              {tags.length < 5 && (
                <input
                  type="text"
                  placeholder="Add tag + Enter..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="h-8 px-3 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              <span>{readTime} min read</span>
            </span>
            <span>·</span>
            <span>{wordCount} words</span>
          </div>
        </div>
      </main>

      {/* Slash Menu */}
      <SlashMenu
        isOpen={slashMenuOpen}
        onClose={() => setSlashMenuOpen(false)}
        onSelect={handleSlashSelect}
      />

      {/* YouTube Dialog */}
      <Dialog open={youtubeDialogOpen} onOpenChange={setYoutubeDialogOpen}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <Video className="size-4 text-red-500" />
              <span>Embed YouTube Video</span>
            </DialogTitle>
            <DialogDescription className="text-xs">Paste YouTube video link</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeInput}
              onChange={(e) => setYoutubeInput(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs text-foreground outline-hidden focus:border-primary"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setYoutubeDialogOpen(false)} className="rounded-md h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleInsertYouTube} disabled={!youtubeInput.trim()} className="rounded-md h-8 text-xs">
              Insert Video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Twitter Dialog */}
      <Dialog open={twitterDialogOpen} onOpenChange={setTwitterDialogOpen}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <Sparkles className="size-4 text-blue-400" />
              <span>Embed Tweet from X</span>
            </DialogTitle>
            <DialogDescription className="text-xs">Paste tweet URL</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <input
              type="text"
              placeholder="https://x.com/.../status/..."
              value={twitterInput}
              onChange={(e) => setTwitterInput(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs text-foreground outline-hidden focus:border-primary"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTwitterDialogOpen(false)} className="rounded-md h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleInsertTwitter} disabled={!twitterInput.trim()} className="rounded-md h-8 text-xs">
              Insert Tweet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Code Dialog */}
      <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <Code2 className="size-4 text-purple-400" />
              <span>Insert Code Block</span>
            </DialogTitle>
            <DialogDescription className="text-xs">Select language and paste snippet</DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5 py-2">
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">Language</label>
              <select
                value={codeLanguage}
                onChange={(e) => setCodeLanguage(e.target.value)}
                className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs font-medium text-foreground outline-hidden focus:border-primary"
              >
                <option value="typescript">TypeScript / JavaScript</option>
                <option value="php">PHP (Laravel)</option>
                <option value="python">Python</option>
                <option value="html">HTML / CSS</option>
                <option value="sql">SQL</option>
                <option value="bash">Bash / Shell</option>
                <option value="json">JSON</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">Code</label>
              <textarea
                placeholder="// Enter code..."
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                rows={5}
                className="w-full p-2.5 rounded-md border border-border bg-zinc-950 text-zinc-100 font-mono text-xs outline-hidden focus:border-primary resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCodeDialogOpen(false)} className="rounded-md h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleInsertCode} className="rounded-md h-8 text-xs">
              Insert Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
