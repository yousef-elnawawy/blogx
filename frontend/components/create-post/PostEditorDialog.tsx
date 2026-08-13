"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, PenSquare, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import Toolbar from "./Toolbar";
import ImagePreview, { ImageEntry } from "./ImagePreview";
import HashtagSuggestions, {
  HashtagSuggestion,
} from "./HashtagSuggestions";
import MentionSuggestions, {
  MentionSuggestion,
} from "./MentionSuggestions";
import api from "@/lib/api";
import { PostCardProps } from "@/components/PostCard";
import { getAvatarUrl } from "@/lib/utils";

export interface PostToEdit {
  id: string | number;
  content: string;
  images?: string[];
}

interface PostEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent?: string;
  postToEdit?: PostToEdit | null;
  onPostCreated?: (post: PostCardProps) => void;
  onPostUpdated?: (post: PostCardProps) => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Convert plain text to HTML with atomic mention blocks */
function textToHtmlWithChips(text: string): string {
  if (!text) return "";
  const parts = text.split(/(@[\p{L}\p{N}_.-]+)/gu);
  return parts
    .map((part) => {
      if (part.startsWith("@") && part.length > 1) {
        const username = part.slice(1);
        return `<span class="mention-chip inline-flex items-center px-2 py-0.5 mx-0.5 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold border border-sky-500/30 text-[0.92em] align-baseline select-none" contenteditable="false" data-mention="${username}">@${username}</span>`;
      }
      // escape HTML
      return part
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
    })
    .join("");
}

/** Extract plain text from editor content containing mention chips */
function extractPlainText(node: Node): string {
  let result = "";
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (child.nodeType === Node.TEXT_NODE) {
      result += child.textContent || "";
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      if (el.classList.contains("mention-chip") && el.dataset.mention) {
        result += `@${el.dataset.mention}`;
      } else if (el.tagName === "BR") {
        result += "\n";
      } else if (el.tagName === "DIV" || el.tagName === "P") {
        const inner = extractPlainText(el);
        result += (result.length > 0 && !result.endsWith("\n") ? "\n" : "") + inner;
      } else {
        result += extractPlainText(el);
      }
    }
  }
  return result;
}

export default function PostEditorDialog({
  open,
  onOpenChange,
  initialContent = "",
  postToEdit = null,
  onPostCreated,
  onPostUpdated,
}: PostEditorDialogProps) {
  const { user } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [editorElement, setEditorElement] = useState<HTMLDivElement | null>(null);
  const [contentLength, setContentLength] = useState(0);
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<"published" | "draft" | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);
  const lastPostIdRef = useRef<string | number | null>(null);

  // ── Hashtag suggestions state ──────────────────────────────────
  const [hashtagSuggestions, setHashtagSuggestions] = useState<HashtagSuggestion[]>([]);
  const [hashtagVisible, setHashtagVisible] = useState(false);
  const [hashtagActiveIdx, setHashtagActiveIdx] = useState(0);
  const [hashtagRange, setHashtagRange] = useState<{ node: Text; start: number; end: number; word: string } | null>(null);

  // ── Mention suggestions state ──────────────────────────────────
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [mentionVisible, setMentionVisible] = useState(false);
  const [mentionActiveIdx, setMentionActiveIdx] = useState(0);
  const [mentionRange, setMentionRange] = useState<{ node: Text; start: number; end: number; word: string } | null>(null);

  // Caret popup coordinates
  const [popupPos, setPopupPos] = useState<{ top: number; left: number }>({ top: 35, left: 16 });

  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setEditorRef = useCallback((node: HTMLDivElement | null) => {
    editorRef.current = node;
    setEditorElement(node);
  }, []);

  // Initialize editor content & restore draft if creating new post
  useEffect(() => {
    if (!open) {
      isInitializedRef.current = false;
      lastPostIdRef.current = null;
      return;
    }

    if (open && editorElement) {
      const currentEditId = postToEdit ? postToEdit.id : null;
      if (!isInitializedRef.current || lastPostIdRef.current !== currentEditId) {
        isInitializedRef.current = true;
        lastPostIdRef.current = currentEditId;

        let raw = postToEdit ? postToEdit.content || "" : initialContent || "";

        // Check saved draft if creating new post without initial content
        if (!postToEdit && !initialContent && typeof window !== "undefined") {
          try {
            const savedDraft = localStorage.getItem("blogx_composer_draft");
            if (savedDraft) {
              const parsed = JSON.parse(savedDraft);
              if (parsed.content) {
                raw = parsed.content;
              }
            }
          } catch {
            // Ignored
          }
        }

        editorElement.innerHTML = textToHtmlWithChips(raw);
        setContentLength(raw.length);

        if (postToEdit) {
          setImages(
            (postToEdit.images || []).map((url) => ({
              preview: url,
              isExisting: true,
            }))
          );
          setRemovedImages([]);
        } else {
          setImages([]);
          setRemovedImages([]);
        }
        setHashtagVisible(false);
        setHashtagSuggestions([]);
        setMentionVisible(false);
        setMentionSuggestions([]);

        // Focus and place cursor at end
        requestAnimationFrame(() => {
          if (editorElement) {
            editorElement.focus();
            try {
              const range = document.createRange();
              const sel = window.getSelection();
              range.selectNodeContents(editorElement);
              range.collapse(false);
              sel?.removeAllRanges();
              sel?.addRange(range);
            } catch {
              // Ignored
            }
          }
        });
      }
    }
  }, [open, postToEdit, initialContent, editorElement]);

  // Auto-save draft on changes (when not editing existing post)
  const saveDraft = useCallback((text: string) => {
    if (postToEdit || typeof window === "undefined") return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);

    draftTimerRef.current = setTimeout(() => {
      if (text.trim()) {
        localStorage.setItem(
          "blogx_composer_draft",
          JSON.stringify({ content: text })
        );
        setDraftSaved(true);
      } else {
        localStorage.removeItem("blogx_composer_draft");
        setDraftSaved(false);
      }
    }, 600);
  }, [postToEdit]);

  // ── Hashtag suggestion fetch ───────────────────────────────────
  const fetchHashtags = useCallback(async (q: string) => {
    try {
      const res = await api.get(`/api/hashtags/suggest?q=${encodeURIComponent(q)}`);
      const items = res.data.hashtags || [];
      setHashtagSuggestions(items);
      setHashtagActiveIdx(0);
      setHashtagVisible(items.length > 0);
    } catch {
      setHashtagSuggestions([]);
      setHashtagVisible(false);
    }
  }, []);

  // ── Mention suggestion fetch ───────────────────────────────────
  const fetchMentions = useCallback(async (q: string) => {
    try {
      const res = await api.get(`/api/users/suggest?q=${encodeURIComponent(q)}`);
      const items = res.data.users || [];
      setMentionSuggestions(items);
      setMentionActiveIdx(0);
      setMentionVisible(items.length > 0);
    } catch {
      setMentionSuggestions([]);
      setMentionVisible(false);
    }
  }, []);

  // Inspect current cursor position in text node
  const checkTriggersAtCursor = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    // Calculate screen position for popup
    if (containerRef.current) {
      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      if (rect.width !== 0 || rect.height !== 0) {
        setPopupPos({
          top: rect.bottom - containerRect.top + 4,
          left: Math.max(rect.left - containerRect.left, 8),
        });
      }
    }

    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) {
      setMentionVisible(false);
      setHashtagVisible(false);
      return;
    }

    const text = node.textContent || "";
    const cursor = range.startOffset;
    const before = text.slice(0, cursor);

    const htMatch = before.match(/#([\p{L}\p{N}_]*)$/u);
    const mtMatch = before.match(/@([\p{L}\p{N}_.-]*)$/u);

    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);

    if (htMatch) {
      const word = htMatch[1];
      const start = before.length - htMatch[0].length;
      setHashtagRange({ node: node as Text, start, end: cursor, word });
      setMentionVisible(false);
      setMentionRange(null);
      suggestDebounceRef.current = setTimeout(() => {
        fetchHashtags(word);
      }, 100);
    } else if (mtMatch) {
      const word = mtMatch[1];
      const start = before.length - mtMatch[0].length;
      setMentionRange({ node: node as Text, start, end: cursor, word });
      setHashtagVisible(false);
      setHashtagRange(null);
      suggestDebounceRef.current = setTimeout(() => {
        fetchMentions(word);
      }, 100);
    } else {
      setHashtagVisible(false);
      setHashtagSuggestions([]);
      setHashtagRange(null);
      setMentionVisible(false);
      setMentionSuggestions([]);
      setMentionRange(null);
    }
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    const text = extractPlainText(editorRef.current);
    setContentLength(text.length);
    checkTriggersAtCursor();
    saveDraft(text);
  };

  const handleSelectMention = (username: string) => {
    if (!mentionRange || !editorRef.current) return;
    const { node, start, end } = mentionRange;

    const fullText = node.textContent || "";
    const before = fullText.slice(0, start);
    const after = fullText.slice(end);

    // Create chip element (Atomic block)
    const chip = document.createElement("span");
    chip.className =
      "mention-chip inline-flex items-center px-2 py-0.5 mx-0.5 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold border border-sky-500/30 text-[0.92em] align-baseline select-none";
    chip.contentEditable = "false";
    chip.dataset.mention = username;
    chip.textContent = `@${username}`;

    const parent = node.parentNode;
    if (!parent) return;

    const textBefore = document.createTextNode(before);
    const spaceAfter = document.createTextNode("\u00A0"); // non-breaking space
    const textAfter = document.createTextNode(after);

    parent.insertBefore(textBefore, node);
    parent.insertBefore(chip, node);
    parent.insertBefore(spaceAfter, node);
    parent.insertBefore(textAfter, node);
    parent.removeChild(node);

    // Place caret after spaceAfter
    const sel = window.getSelection();
    if (sel) {
      const newRange = document.createRange();
      newRange.setStartAfter(spaceAfter);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    setMentionVisible(false);
    setMentionSuggestions([]);
    setMentionRange(null);

    const text = extractPlainText(editorRef.current);
    setContentLength(text.length);
  };

  const handleSelectHashtag = (tag: string) => {
    if (!hashtagRange || !editorRef.current) return;
    const { node, start, end } = hashtagRange;

    const fullText = node.textContent || "";
    const before = fullText.slice(0, start);
    const after = fullText.slice(end);

    node.textContent = `${before}#${tag} ${after}`;

    const sel = window.getSelection();
    if (sel) {
      const newRange = document.createRange();
      const pos = before.length + tag.length + 2; // '#' + tag + ' '
      newRange.setStart(node, Math.min(pos, node.textContent.length));
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    setHashtagVisible(false);
    setHashtagSuggestions([]);
    setHashtagRange(null);

    const text = extractPlainText(editorRef.current);
    setContentLength(text.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Keyboard navigation for Hashtags
    if (hashtagVisible && hashtagSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHashtagActiveIdx((i) => Math.min(i + 1, hashtagSuggestions.length - 1));
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHashtagActiveIdx((i) => Math.max(i - 1, 0));
        return;
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const chosen = hashtagSuggestions[hashtagActiveIdx];
        if (chosen) handleSelectHashtag(chosen.tag);
        return;
      } else if (e.key === "Escape") {
        setHashtagVisible(false);
        return;
      }
    }

    // Keyboard navigation for Mentions
    if (mentionVisible && mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionActiveIdx((i) => Math.min(i + 1, mentionSuggestions.length - 1));
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionActiveIdx((i) => Math.max(i - 1, 0));
        return;
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const chosen = mentionSuggestions[mentionActiveIdx];
        if (chosen) handleSelectMention(chosen.username);
        return;
      } else if (e.key === "Escape") {
        setMentionVisible(false);
        return;
      }
    }

    // Direct Backspace deletion of Mention Chip Blocks
    if (e.key === "Backspace") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && editorRef.current) {
        const range = sel.getRangeAt(0);
        if (range.collapsed) {
          const container = range.startContainer;
          const offset = range.startOffset;

          // Case 1: inside text node at offset 0 and previous sibling is a mention chip
          if (container.nodeType === Node.TEXT_NODE && offset === 0) {
            const prev = container.previousSibling as HTMLElement | null;
            if (prev && prev.nodeType === Node.ELEMENT_NODE && prev.classList.contains("mention-chip")) {
              e.preventDefault();
              prev.remove();
              handleInput();
              return;
            }
          }

          // Case 2: inside text node at offset 1 and char is space (\u00A0 or ' ') right after chip
          if (container.nodeType === Node.TEXT_NODE && offset <= 1) {
            const text = container.textContent || "";
            if (text === "" || text[0] === "\u00A0" || text[0] === " ") {
              const prev = container.previousSibling as HTMLElement | null;
              if (prev && prev.nodeType === Node.ELEMENT_NODE && prev.classList.contains("mention-chip")) {
                e.preventDefault();
                if (text.length > 0) {
                  container.textContent = text.slice(1);
                }
                prev.remove();
                handleInput();
                return;
              }
            }
          }

          // Case 3: container is parent element and previous child is mention chip
          if (container.nodeType === Node.ELEMENT_NODE) {
            const el = container as HTMLElement;
            if (offset > 0) {
              const prevChild = el.childNodes[offset - 1] as HTMLElement | undefined;
              if (prevChild && prevChild.nodeType === Node.ELEMENT_NODE && prevChild.classList.contains("mention-chip")) {
                e.preventDefault();
                prevChild.remove();
                handleInput();
                return;
              }
            }
          }
        }
      }
    }

    // Direct Delete key deletion of Mention Chip Blocks
    if (e.key === "Delete") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && editorRef.current) {
        const range = sel.getRangeAt(0);
        if (range.collapsed) {
          const container = range.startContainer;
          const offset = range.startOffset;

          if (container.nodeType === Node.TEXT_NODE && offset === (container.textContent?.length || 0)) {
            const next = container.nextSibling as HTMLElement | null;
            if (next && next.nodeType === Node.ELEMENT_NODE && next.classList.contains("mention-chip")) {
              e.preventDefault();
              next.remove();
              handleInput();
              return;
            }
          }

          if (container.nodeType === Node.ELEMENT_NODE) {
            const el = container as HTMLElement;
            const nextChild = el.childNodes[offset] as HTMLElement | undefined;
            if (nextChild && nextChild.nodeType === Node.ELEMENT_NODE && nextChild.classList.contains("mention-chip")) {
              e.preventDefault();
              nextChild.remove();
              handleInput();
              return;
            }
          }
        }
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const handleImageSelect = (files: FileList) => {
    const maxImages = 10;
    const remaining = maxImages - images.length;
    if (files.length > remaining) {
      toast.info(`You can attach up to ${maxImages} images per post.`);
    }
    const selected = Array.from(files).slice(0, remaining);

    const readers = selected.map(
      (file) =>
        new Promise<ImageEntry>((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({ preview: reader.result as string, file, isExisting: false });
          reader.readAsDataURL(file);
        })
    );
    Promise.all(readers).then((entries) =>
      setImages((prev) => [...prev, ...entries])
    );
  };

  const removeImage = (index: number) => {
    const removed = images[index];
    if (removed && removed.isExisting) {
      setRemovedImages((prev) => [...prev, removed.preview]);
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const insertHashtag = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand("insertText", false, "#");
    handleInput();
  };

  const handlePost = async (status: "published" | "draft" = "published") => {
    if (!editorRef.current) return;
    const content = extractPlainText(editorRef.current).trim();

    if (!content && images.length === 0) return;
    if (!user) {
      toast.error("You must be logged in to post.");
      return;
    }

    setSubmitting(true);
    setSubmittingAction(status);
    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("status", status);

      images.forEach((entry) => {
        if (entry.file) {
          formData.append("images[]", entry.file);
        }
      });

      if (postToEdit) {
        removedImages.forEach((url) => {
          formData.append("removed_images[]", url);
        });

        const res = await api.post(`/api/posts/${postToEdit.id}/update`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        toast.success(status === "draft" ? "Draft updated!" : "Post published!");
        onPostUpdated?.(res.data.post);
        window.dispatchEvent(new CustomEvent("post-updated", { detail: res.data.post }));
      } else {
        const res = await api.post("/api/posts", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        toast.success(status === "draft" ? "Saved to private drafts!" : "Post published!");
        if (status === "published") {
          onPostCreated?.(res.data.post);
          window.dispatchEvent(new CustomEvent("post-created", { detail: res.data.post }));
        }

        // Clear saved draft from localStorage
        if (typeof window !== "undefined") {
          localStorage.removeItem("blogx_composer_draft");
        }
      }

      window.dispatchEvent(new CustomEvent("drafts-updated"));
      if (editorRef.current) editorRef.current.innerHTML = "";
      setImages([]);
      setRemovedImages([]);
      setDraftSaved(false);
      onOpenChange(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message ?? "Failed to save post. Try again.");
    } finally {
      setSubmitting(false);
      setSubmittingAction(null);
    }
  };

  const avatarSrc = getAvatarUrl(user?.avatar);
  const canPost = (contentLength > 0 || images.length > 0) && !submitting;

  const computedPopupStyle: React.CSSProperties = {
    top: `${Math.max(popupPos.top, 36)}px`,
    left: `${Math.min(popupPos.left, 240)}px`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          flex flex-col
          w-[100vw]
          h-[100dvh]
          max-w-none
          rounded-none
          p-0
          gap-0
          overflow-hidden

          sm:h-auto
          sm:max-h-[92vh]
          sm:w-[92vw]
          sm:max-w-2xl
          sm:rounded-3xl

          lg:max-w-4xl
          xl:max-w-5xl
        "
      >
        <DialogHeader className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-b border-border/70 bg-muted/20">
          <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <PenSquare className="size-5 text-primary" />
            <span>{postToEdit ? "Edit Post" : "Create Post"}</span>
          </DialogTitle>
        </DialogHeader>

        {/* User info */}
        <div className="flex items-center gap-3 px-4 pt-4 sm:px-6 sm:pt-5 shrink-0">
          <Avatar className="size-10 sm:size-11 ring-2 ring-primary/20">
            <AvatarImage src={avatarSrc} />
            <AvatarFallback className="bg-muted text-xs font-bold">
              {user ? getInitials(user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-semibold text-foreground leading-tight">
              {user?.name ?? ""}
            </span>
            <span className="text-xs text-muted-foreground">
              @{user?.username ?? ""}
            </span>
          </div>
        </div>

        {/* Editor area with YouTube-style atomic chips and inline suggestions */}
        <div
          ref={containerRef}
          className="relative flex-1 min-h-0 px-4 pt-3 pb-2 sm:px-6 sm:pt-4 sm:pb-3 overflow-y-auto"
        >
          <div
            ref={setEditorRef}
            contentEditable="true"
            dir="auto"
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyUp={checkTriggersAtCursor}
            onClick={checkTriggersAtCursor}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            data-placeholder="What's on your mind?"
            className="
              w-full
              h-full
              min-h-[220px]
              sm:min-h-[280px]
              lg:min-h-[340px]
              xl:min-h-[380px]
              bg-transparent
              text-foreground
              text-base
              sm:text-lg
              leading-relaxed
              outline-none
              font-sans
              empty:before:content-[attr(data-placeholder)]
              empty:before:text-muted-foreground
              empty:before:pointer-events-none
            "
          />

          {/* Autocomplete Dropdowns anchored precisely under cursor */}
          <MentionSuggestions
            suggestions={mentionSuggestions}
            activeIndex={mentionActiveIdx}
            onSelect={handleSelectMention}
            visible={mentionVisible}
            style={computedPopupStyle}
          />

          <HashtagSuggestions
            suggestions={hashtagSuggestions}
            activeIndex={hashtagActiveIdx}
            onSelect={handleSelectHashtag}
            visible={hashtagVisible}
            style={computedPopupStyle}
          />
        </div>

        {/* Image previews */}
        {images.length > 0 && (
          <div className="shrink-0 max-h-[25vh] overflow-y-auto px-4 sm:px-6 mb-2">
            <ImagePreview images={images} onRemove={removeImage} />
          </div>
        )}

        {/* Bottom toolbar */}
        <div className="shrink-0 relative flex items-center justify-between px-3 py-2.5 sm:px-5 sm:py-3.5 border-t border-border bg-background">
          <div className="flex items-center gap-3">
            <Toolbar
              onImageSelect={handleImageSelect}
              onInsertHashtag={insertHashtag}
              imageCount={images.length}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handlePost("draft")}
              disabled={!canPost}
              size="sm"
              className="h-8 sm:h-9 rounded-full px-3 sm:px-4 text-xs font-semibold"
            >
              {submitting && submittingAction === "draft" ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : null}
              Save Draft
            </Button>

            <Button
              onClick={() => handlePost("published")}
              disabled={!canPost}
              size="sm"
              className="h-8 sm:h-9 rounded-full px-5 sm:px-6 text-sm bg-primary text-primary-foreground hover:bg-primary/90 min-w-[72px] cursor-pointer font-bold shadow-sm"
            >
              {submitting && submittingAction === "published" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : postToEdit ? (
                "Publish"
              ) : (
                "Post"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}