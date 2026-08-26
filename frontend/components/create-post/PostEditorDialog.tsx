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
import { Loader2, PenSquare, Check, Image as ImageIcon, RotateCcw, Camera, Sparkles } from "lucide-react";
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
import PollCreator, { PollDraft } from "@/components/post/PollCreator";
import api from "@/lib/api";
import { PostCardProps } from "@/components/PostCard";
import { getAvatarUrl } from "@/lib/utils";
import { compressImage } from "@/lib/image-compress";
import { captureVideoFirstFrame } from "@/lib/video-thumbnail";
import { useRouter } from "next/navigation";

export interface PostToEdit {
  id: string | number;
  content: string;
  images?: string[];
  video?: {
    url: string;
    thumbnail?: string | null;
    duration?: number | null;
  } | null;
}

interface PostEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent?: string;
  postToEdit?: PostToEdit | null;
  communityId?: number | string | null;
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

/** Escape plain text for contenteditable HTML */
function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

/** Extract plain text from editor content */
function extractPlainText(node: Node): string {
  let result = "";
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (child.nodeType === Node.TEXT_NODE) {
      result += child.textContent || "";
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      if (el.tagName === "BR") {
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
  communityId = null,
  onPostCreated,
  onPostUpdated,
}: PostEditorDialogProps) {
  const { user } = useAuth();
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [editorElement, setEditorElement] = useState<HTMLDivElement | null>(null);
  const [contentLength, setContentLength] = useState(0);
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [existingVideo, setExistingVideo] = useState<{
    url: string;
    thumbnail?: string | null;
    duration?: number | null;
  } | null>(null);
  const [videoRemoved, setVideoRemoved] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoThumbnailFile, setVideoThumbnailFile] = useState<File | null>(null);
  const [videoThumbnailPreviewUrl, setVideoThumbnailPreviewUrl] = useState<string | null>(null);
  const [autoThumbnailFile, setAutoThumbnailFile] = useState<File | null>(null);
  const [autoThumbnailPreviewUrl, setAutoThumbnailPreviewUrl] = useState<string | null>(null);
  const [isCustomThumbnail, setIsCustomThumbnail] = useState(false);
  const [extractingThumbnail, setExtractingThumbnail] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [pollDraft, setPollDraft] = useState<PollDraft | null>(null);
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

  // Remember last searched query to prevent unnecessary API refetches and selection resets on arrow keys
  const lastMentionQueryRef = useRef<string | null>(null);
  const lastHashtagQueryRef = useRef<string | null>(null);

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

        editorElement.innerHTML = escapeHtml(raw);
        setContentLength(raw.length);

        if (postToEdit) {
          setImages(
            (postToEdit.images || []).map((url) => ({
              preview: url,
              isExisting: true,
            }))
          );
          setRemovedImages([]);

          if (postToEdit.video && postToEdit.video.url) {
            setExistingVideo(postToEdit.video);
            setVideoPreviewUrl(postToEdit.video.url);
            setVideoThumbnailPreviewUrl(postToEdit.video.thumbnail || null);
            setVideoDuration(postToEdit.video.duration || null);
            setIsCustomThumbnail(Boolean(postToEdit.video.thumbnail));
            setVideoRemoved(false);
          } else {
            setExistingVideo(null);
            setVideoFile(null);
            setVideoPreviewUrl(null);
            setVideoThumbnailFile(null);
            setVideoThumbnailPreviewUrl(null);
            setVideoDuration(null);
            setIsCustomThumbnail(false);
            setVideoRemoved(false);
          }
        } else {
          setImages([]);
          setRemovedImages([]);
          setExistingVideo(null);
          setVideoFile(null);
          setVideoPreviewUrl(null);
          setVideoThumbnailFile(null);
          setVideoThumbnailPreviewUrl(null);
          setVideoDuration(null);
          setIsCustomThumbnail(false);
          setVideoRemoved(false);
        }
        setHashtagVisible(false);
        setHashtagSuggestions([]);
        setMentionVisible(false);
        setMentionSuggestions([]);
        lastMentionQueryRef.current = null;
        lastHashtagQueryRef.current = null;

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
      let rect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      // If collapsed range rect is 0 (can happen at line boundaries), measure with temporary marker
      if (rect.width === 0 && rect.height === 0) {
        try {
          const span = document.createElement("span");
          span.appendChild(document.createTextNode("\u200b"));
          const tempRange = range.cloneRange();
          tempRange.insertNode(span);
          rect = span.getBoundingClientRect();
          span.parentNode?.removeChild(span);
        } catch {
          // fallback
        }
      }

      if (rect.width !== 0 || rect.height !== 0 || rect.top !== 0) {
        const top = rect.bottom - containerRect.top + containerRef.current.scrollTop + 6;
        const left = rect.left - containerRect.left + containerRef.current.scrollLeft;
        setPopupPos({ top, left });
      }
    }

    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) {
      lastMentionQueryRef.current = null;
      lastHashtagQueryRef.current = null;
      setMentionVisible(false);
      setHashtagVisible(false);
      return;
    }

    const text = node.textContent || "";
    const cursor = range.startOffset;
    const before = text.slice(0, cursor);

    const htMatch = before.match(/#([\p{L}\p{N}_]*)$/u);
    const mtMatch = before.match(/@([\p{L}\p{N}_.-]*)$/u);

    if (htMatch) {
      const word = htMatch[1];
      const start = before.length - htMatch[0].length;
      setHashtagRange({ node: node as Text, start, end: cursor, word });
      setMentionVisible(false);
      setMentionRange(null);
      lastMentionQueryRef.current = null;

      // Only refetch if the hashtag query word actually changed
      if (lastHashtagQueryRef.current !== word) {
        lastHashtagQueryRef.current = word;
        if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
        suggestDebounceRef.current = setTimeout(() => {
          fetchHashtags(word);
        }, 100);
      }
    } else if (mtMatch) {
      const word = mtMatch[1];
      const start = before.length - mtMatch[0].length;
      setMentionRange({ node: node as Text, start, end: cursor, word });
      setHashtagVisible(false);
      setHashtagRange(null);
      lastHashtagQueryRef.current = null;

      // Only refetch if the mention query word actually changed
      if (lastMentionQueryRef.current !== word) {
        lastMentionQueryRef.current = word;
        if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
        suggestDebounceRef.current = setTimeout(() => {
          fetchMentions(word);
        }, 100);
      }
    } else {
      if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
      lastHashtagQueryRef.current = null;
      lastMentionQueryRef.current = null;
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

    // Normal plain text insertion with trailing space
    node.textContent = `${before}@${username} ${after}`;

    const sel = window.getSelection();
    if (sel) {
      const newRange = document.createRange();
      const pos = before.length + username.length + 2; // '@' + username + ' '
      newRange.setStart(node, Math.min(pos, node.textContent.length));
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    setMentionVisible(false);
    setMentionSuggestions([]);
    setMentionRange(null);
    lastMentionQueryRef.current = null;

    const text = extractPlainText(editorRef.current);
    setContentLength(text.length);
    saveDraft(text);
  };

  const handleSelectHashtag = (tag: string) => {
    if (!hashtagRange || !editorRef.current) return;
    const { node, start, end } = hashtagRange;

    const fullText = node.textContent || "";
    const before = fullText.slice(0, start);
    const after = fullText.slice(end);

    // Normal plain text insertion with trailing space
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
    lastHashtagQueryRef.current = null;

    const text = extractPlainText(editorRef.current);
    setContentLength(text.length);
    saveDraft(text);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Ignore navigation keys on keyup so we don't trigger refetches or reset activeIndex
    if (
      e.key === "ArrowDown" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Enter" ||
      e.key === "Tab" ||
      e.key === "Escape"
    ) {
      return;
    }
    checkTriggersAtCursor();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Keyboard navigation for Hashtags
    if (hashtagVisible && hashtagSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHashtagActiveIdx((i) => (i + 1) % hashtagSuggestions.length);
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHashtagActiveIdx((i) => (i - 1 + hashtagSuggestions.length) % hashtagSuggestions.length);
        return;
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const chosen = hashtagSuggestions[hashtagActiveIdx];
        if (chosen) handleSelectHashtag(chosen.tag);
        return;
      } else if (e.key === "Escape") {
        e.preventDefault();
        setHashtagVisible(false);
        return;
      }
    }

    // Keyboard navigation for Mentions
    if (mentionVisible && mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionActiveIdx((i) => (i + 1) % mentionSuggestions.length);
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionActiveIdx((i) => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length);
        return;
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const chosen = mentionSuggestions[mentionActiveIdx];
        if (chosen) handleSelectMention(chosen.username);
        return;
      } else if (e.key === "Escape") {
        e.preventDefault();
        setMentionVisible(false);
        return;
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const handleImageSelect = async (files: FileList) => {
    const maxImages = 10;
    const remaining = maxImages - images.length;
    if (files.length > remaining) {
      toast.info(`You can attach up to ${maxImages} images per post.`);
    }
    const selected = Array.from(files).slice(0, remaining);

    try {
      const entries = await Promise.all(
        selected.map(async (file) => {
          let optimizedFile = file;
          try {
            optimizedFile = await compressImage(file, {
              maxWidth: 2560,
              maxHeight: 2560,
              quality: 0.88,
              maxSizeBytes: 1.8 * 1024 * 1024,
            });
          } catch {
            optimizedFile = file;
          }

          return new Promise<ImageEntry>((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({ preview: reader.result as string, file: optimizedFile, isExisting: false });
            reader.readAsDataURL(optimizedFile);
          });
        })
      );
      setImages((prev) => [...prev, ...entries]);
    } catch {
      toast.error("Failed to load some images.");
    }
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

  const insertMention = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand("insertText", false, "@");
    handleInput();
  };

  const insertEmoji = (emoji: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand("insertText", false, emoji);
    handleInput();
  };

  const insertCodeSnippet = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const codeTemplate = "\n```ts\n// Enter code or command here\nconsole.log('Hello BlogX');\n```\n";
    document.execCommand("insertText", false, codeTemplate);
    handleInput();
  };

  const handleVideoSelect = async (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoPreviewUrl(url);

    // Extract duration
    const tempVid = document.createElement("video");
    tempVid.src = url;
    tempVid.onloadedmetadata = () => {
      if (tempVid.duration && !isNaN(tempVid.duration)) {
        setVideoDuration(Math.round(tempVid.duration));
      }
    };

    // Automatically extract first frame as default thumbnail
    setExtractingThumbnail(true);
    try {
      const extracted = await captureVideoFirstFrame(file);
      setAutoThumbnailFile(extracted.file);
      setAutoThumbnailPreviewUrl(extracted.previewUrl);
      setVideoThumbnailFile(extracted.file);
      setVideoThumbnailPreviewUrl(extracted.previewUrl);
      setIsCustomThumbnail(false);
    } catch (err) {
      console.warn("Could not auto-extract video thumbnail:", err);
    } finally {
      setExtractingThumbnail(false);
    }
  };

  const handleCustomThumbnailSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      const compressed = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.88,
      });
      const preview = URL.createObjectURL(compressed);
      setVideoThumbnailFile(compressed);
      setVideoThumbnailPreviewUrl(preview);
      setIsCustomThumbnail(true);
      toast.success("Custom thumbnail uploaded!");
    } catch {
      toast.error("Failed to process custom thumbnail");
    } finally {
      e.target.value = "";
    }
  };

  const handleResetToAutoThumbnail = () => {
    if (autoThumbnailFile && autoThumbnailPreviewUrl) {
      setVideoThumbnailFile(autoThumbnailFile);
      setVideoThumbnailPreviewUrl(autoThumbnailPreviewUrl);
      setIsCustomThumbnail(false);
      toast.info("Reverted to automatic video frame thumbnail");
    }
  };

  const removeVideo = () => {
    if (videoPreviewUrl && !existingVideo) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    if (videoThumbnailPreviewUrl && !isCustomThumbnail && !existingVideo) {
      URL.revokeObjectURL(videoThumbnailPreviewUrl);
    }
    if (existingVideo) {
      setVideoRemoved(true);
      setExistingVideo(null);
    }
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setVideoDuration(null);
    setVideoThumbnailFile(null);
    setVideoThumbnailPreviewUrl(null);
    setAutoThumbnailFile(null);
    setAutoThumbnailPreviewUrl(null);
    setIsCustomThumbnail(false);
  };

  const handlePost = async (status: "published" | "draft" = "published") => {
    if (!editorRef.current) return;
    const content = extractPlainText(editorRef.current).trim();

    const validPollOptions = pollDraft ? pollDraft.options.filter((o) => o.trim() !== "") : [];
    const hasValidPoll = Boolean(pollDraft && validPollOptions.length >= 2);

    if (!content && images.length === 0 && !videoFile && !existingVideo && !hasValidPoll) {
      toast.error("Please enter text, attach an image/video, or add at least 2 options to your poll.");
      return;
    }

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

      if (videoFile) {
        formData.append("video", videoFile);
        if (videoDuration) {
          formData.append("video_duration", String(videoDuration));
        }
        if (videoThumbnailFile) {
          formData.append("video_thumbnail", videoThumbnailFile);
        }
      } else if (existingVideo && videoThumbnailFile) {
        // Thumbnail updated for existing video
        formData.append("video_thumbnail", videoThumbnailFile);
      }

      if (videoRemoved) {
        formData.append("remove_video", "1");
      }

      images.forEach((entry) => {
        if (entry.file) {
          formData.append("images[]", entry.file);
        }
      });

      if (pollDraft) {
        if (validPollOptions.length < 2) {
          toast.error("A poll requires at least 2 options.");
          setSubmitting(false);
          setSubmittingAction(null);
          return;
        }
        formData.append("poll[duration_days]", String(pollDraft.duration_days || 1));
        if (pollDraft.question && pollDraft.question.trim()) {
          formData.append("poll[question]", pollDraft.question.trim());
        }
        validPollOptions.forEach((opt, idx) => {
          formData.append(`poll[options][${idx}]`, opt.trim());
        });
      }

      if (postToEdit) {
        removedImages.forEach((url) => {
          formData.append("removed_images[]", url);
        });

        const res = await api.post(`/api/posts/${postToEdit.id}/update`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        toast.success(status === "draft" ? "Draft updated!" : "Post updated successfully!");
        onPostUpdated?.(res.data.post);
        window.dispatchEvent(new CustomEvent("post-updated", { detail: res.data.post }));
      } else {
        if (communityId) {
          formData.append("community_id", String(communityId));
        }

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
      setExistingVideo(null);
      setVideoRemoved(false);
      setVideoFile(null);
      setVideoPreviewUrl(null);
      setVideoThumbnailFile(null);
      setVideoThumbnailPreviewUrl(null);
      setPollDraft(null);
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
  const validPollOptions = pollDraft ? pollDraft.options.filter((o) => o.trim() !== "") : [];
  const hasPollDraftOrContent = Boolean(pollDraft && (pollDraft.question?.trim() || validPollOptions.length > 0));
  const canPost = (contentLength > 0 || images.length > 0 || Boolean(videoFile) || hasPollDraftOrContent) && !submitting;

  const containerWidth = containerRef.current?.clientWidth ?? 450;
  const popupWidth = 320;
  const clampedLeft = Math.max(12, Math.min(popupPos.left, Math.max(12, containerWidth - popupWidth - 12)));

  const computedPopupStyle: React.CSSProperties = {
    top: `${Math.max(popupPos.top, 36)}px`,
    left: `${clampedLeft}px`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          flex
          flex-col
          h-[100dvh]
          w-screen
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
            onKeyUp={handleKeyUp}
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
            onActiveIndexChange={setMentionActiveIdx}
            onSelect={handleSelectMention}
            visible={mentionVisible}
            style={computedPopupStyle}
          />

          <HashtagSuggestions
            suggestions={hashtagSuggestions}
            activeIndex={hashtagActiveIdx}
            onActiveIndexChange={setHashtagActiveIdx}
            onSelect={handleSelectHashtag}
            visible={hashtagVisible}
            style={computedPopupStyle}
          />
        </div>

        {/* Image previews */}
        {images.length > 0 && (
          <div className="shrink-0 max-h-[30vh] overflow-y-auto px-4 sm:px-6 mb-2">
            <ImagePreview images={images} onRemove={removeImage} />
          </div>
        )}

        {/* Video Preview & Thumbnail Selection */}
        {videoPreviewUrl && (
          <div className="shrink-0 px-4 sm:px-6 mb-3 space-y-2">
            <div className="relative rounded-2xl overflow-hidden bg-black/90 aspect-video max-h-56 border border-border/70 group">
              <video
                src={videoPreviewUrl}
                controls
                className="size-full object-contain"
              />
              <button
                type="button"
                onClick={removeVideo}
                className="absolute top-2 right-2 size-8 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer z-10"
                title="Remove video"
              >
                <span className="text-sm font-bold">✕</span>
              </button>
            </div>

            {/* Thumbnail Controls Bar */}
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-card border border-border/80 text-xs shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Thumbnail Preview Box */}
                <div className="relative size-11 rounded-lg overflow-hidden border border-border/80 shrink-0 bg-muted flex items-center justify-center shadow-inner">
                  {extractingThumbnail ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : videoThumbnailPreviewUrl ? (
                    <img
                      src={videoThumbnailPreviewUrl}
                      alt="Thumbnail"
                      className="size-full object-cover"
                    />
                  ) : (
                    <Camera className="size-4 text-muted-foreground" />
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-foreground text-xs">Video Thumbnail</span>
                    {isCustomThumbnail ? (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium border border-emerald-500/20">
                        Custom
                      </span>
                    ) : (
                      <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-medium border border-primary/20">
                        Auto 1st Frame
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {isCustomThumbnail
                      ? "Custom cover image selected"
                      : "First frame captured automatically as cover"}
                  </span>
                </div>
              </div>

              {/* Hidden File Input for Custom Thumbnail */}
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCustomThumbnailSelect}
              />

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isCustomThumbnail && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetToAutoThumbnail}
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                    title="Reset to automatic video frame"
                  >
                    <RotateCcw className="size-3" />
                    <span className="hidden sm:inline">Reset Auto</span>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 border-border hover:bg-muted cursor-pointer"
                >
                  <ImageIcon className="size-3 text-primary" />
                  <span>{isCustomThumbnail ? "Change Thumbnail" : "Upload Thumbnail"}</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Poll Creator */}
        {pollDraft && (
          <div className="shrink-0 px-4 sm:px-6 mb-3">
            <PollCreator poll={pollDraft} onChange={setPollDraft} />
          </div>
        )}

        {/* Bottom toolbar */}
        <div className="shrink-0 relative flex items-center justify-between px-3 py-2 sm:px-5 sm:py-2.5 border-t border-border bg-background">
          <div className="flex items-center gap-1 sm:gap-2">
            <Toolbar
              onImageSelect={handleImageSelect}
              onVideoSelect={handleVideoSelect}
              hasVideo={Boolean(videoFile)}
              onInsertHashtag={insertHashtag}
              onInsertMention={insertMention}
              onInsertCode={insertCodeSnippet}
              onInsertEmoji={insertEmoji}
              onAddPoll={() =>
                setPollDraft(
                  pollDraft ? null : { options: ["", ""], duration_days: 1 }
                )
              }
              hasPoll={Boolean(pollDraft)}
              onOpenArticleEditor={() => {
                onOpenChange(false);
                router.push("/blogs/new");
              }}
              imageCount={images.length}
              contentLength={contentLength}
              maxContentLength={1000}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handlePost("draft")}
              disabled={!canPost}
              size="sm"
              className="rounded-xl px-3 sm:px-4 h-9 text-xs sm:text-sm font-semibold border-border text-foreground hover:bg-muted transition-all cursor-pointer"
            >
              {submitting && submittingAction === "draft" ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                "Save Draft"
              )}
            </Button>

            <Button
              type="button"
              onClick={() => handlePost("published")}
              disabled={!canPost}
              size="sm"
              className="rounded-xl px-4 sm:px-5 h-9 text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-xs hover:shadow-sm"
            >
              {submitting && submittingAction === "published" ? (
                <Loader2 className="size-4 animate-spin" />
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