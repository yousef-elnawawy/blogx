"use client";

import { useEffect, useState, useRef } from "react";
import {
  Highlighter,
  MessageSquarePlus,
  Quote,
  Check,
  Loader2,
  X,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface BlogTextSelectionToolbarProps {
  blogId: number;
  containerRef: React.RefObject<HTMLElement | null>;
  onHighlightAdded?: (annotation: any) => void;
  onQuoteRequested?: (text: string) => void;
}

const COLOR_OPTIONS = [
  { id: "amber", bg: "bg-amber-400", border: "border-amber-400" },
  { id: "emerald", bg: "bg-emerald-400", border: "border-emerald-400" },
  { id: "sky", bg: "bg-sky-400", border: "border-sky-400" },
  { id: "rose", bg: "bg-rose-400", border: "border-rose-400" },
  { id: "purple", bg: "bg-purple-400", border: "border-purple-400" },
];

export default function BlogTextSelectionToolbar({
  blogId,
  containerRef,
  onHighlightAdded,
  onQuoteRequested,
}: BlogTextSelectionToolbarProps) {
  const { user } = useAuth();
  const [selectedText, setSelectedText] = useState("");
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null);
  const [isNoteInputOpen, setIsNoteInputOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [selectedColor, setSelectedColor] = useState("amber");
  const [loading, setLoading] = useState(false);

  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      // Don't close if currently typing in the note input
      if (isNoteInputOpen) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setToolbarPosition(null);
        setSelectedText("");
        return;
      }

      const text = selection.toString().trim();
      if (text.length < 3) {
        setToolbarPosition(null);
        setSelectedText("");
        return;
      }

      // Ensure selection is inside containerRef
      if (containerRef.current) {
        const range = selection.getRangeAt(0);
        const commonAncestor = range.commonAncestorContainer;
        if (!containerRef.current.contains(commonAncestor)) {
          setToolbarPosition(null);
          setSelectedText("");
          return;
        }

        const rect = range.getBoundingClientRect();
        // Position toolbar centered above selection
        const x = rect.left + rect.width / 2;
        const y = rect.top - 10;

        setSelectedText(text);
        setToolbarPosition({ x, y });
      }
    };

    const handleDocumentMouseDown = (e: MouseEvent) => {
      if (toolbarRef.current && toolbarRef.current.contains(e.target as Node)) {
        return;
      }
      if (isNoteInputOpen) {
        setIsNoteInputOpen(false);
        setToolbarPosition(null);
      }
    };

    document.addEventListener("mouseup", handleSelectionChange);
    document.addEventListener("touchend", handleSelectionChange);
    document.addEventListener("mousedown", handleDocumentMouseDown);

    return () => {
      document.removeEventListener("mouseup", handleSelectionChange);
      document.removeEventListener("touchend", handleSelectionChange);
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, [containerRef, isNoteInputOpen]);

  const handleQuickHighlight = async () => {
    if (!user) {
      toast.error("Please sign in to save highlights");
      return;
    }
    if (!selectedText) return;

    setLoading(true);
    try {
      const res = await api.post(`/api/blogs/${blogId}/annotations`, {
        highlighted_text: selectedText,
        color: selectedColor,
      });

      toast.success("Text highlighted and saved!");
      if (onHighlightAdded) {
        onHighlightAdded(res.data.annotation);
      }
      setToolbarPosition(null);
      window.getSelection()?.removeAllRanges();
    } catch {
      toast.error("Failed to save highlight");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to add notes");
      return;
    }
    if (!selectedText) return;

    setLoading(true);
    try {
      const res = await api.post(`/api/blogs/${blogId}/annotations`, {
        highlighted_text: selectedText,
        note: noteText.trim(),
        color: selectedColor,
      });

      toast.success("Note and highlight saved!");
      if (onHighlightAdded) {
        onHighlightAdded(res.data.annotation);
      }
      setIsNoteInputOpen(false);
      setNoteText("");
      setToolbarPosition(null);
      window.getSelection()?.removeAllRanges();
    } catch {
      toast.error("Failed to save note");
    } finally {
      setLoading(false);
    }
  };

  const handleQuoteClick = () => {
    if (!user) {
      toast.error("Please sign in to quote excerpts");
      return;
    }
    if (onQuoteRequested && selectedText) {
      onQuoteRequested(selectedText);
      setToolbarPosition(null);
    }
  };

  if (!toolbarPosition) return null;

  return (
    <div
      ref={toolbarRef}
      style={{
        position: "fixed",
        left: `${toolbarPosition.x}px`,
        top: `${toolbarPosition.y}px`,
        transform: "translate(-50%, -100%)",
        zIndex: 60,
      }}
      className="animate-in fade-in zoom-in-95 duration-150"
    >
      {!isNoteInputOpen ? (
        /* Floating Quick Action Toolbar */
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-zinc-950/90 dark:bg-zinc-900/90 text-white backdrop-blur-md shadow-2xl border border-white/15">
          {/* Quick Highlight */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleQuickHighlight}
            disabled={loading}
            className="h-8 px-2.5 rounded-xl gap-1.5 text-xs font-semibold text-zinc-100 hover:text-white hover:bg-white/10 cursor-pointer"
            title="Highlight text"
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Highlighter className="size-3.5 text-amber-400" />
            )}
            <span>Highlight</span>
          </Button>

          <div className="w-px h-4 bg-white/20" />

          {/* Add Note / Comment */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsNoteInputOpen(true)}
            className="h-8 px-2.5 rounded-xl gap-1.5 text-xs font-semibold text-zinc-100 hover:text-white hover:bg-white/10 cursor-pointer"
            title="Add note"
          >
            <MessageSquarePlus className="size-3.5 text-sky-400" />
            <span>Note</span>
          </Button>

          <div className="w-px h-4 bg-white/20" />

          {/* Quote Post */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleQuoteClick}
            className="h-8 px-2.5 rounded-xl gap-1.5 text-xs font-semibold text-zinc-100 hover:text-white hover:bg-white/10 cursor-pointer"
            title="Quote as post"
          >
            <Quote className="size-3.5 text-emerald-400" />
            <span>Quote</span>
          </Button>
        </div>
      ) : (
        /* Expanded Note Input Popover */
        <div className="w-72 sm:w-80 p-3.5 rounded-2xl bg-zinc-950/95 dark:bg-zinc-900/95 text-white backdrop-blur-md shadow-2xl border border-white/20 space-y-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-white/10">
            <span className="text-xs font-bold text-zinc-200">Add note to selection</span>
            <button
              onClick={() => setIsNoteInputOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <form onSubmit={handleSaveNote} className="space-y-2.5">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write your note or reaction here..."
              rows={2}
              autoFocus
              className="resize-none text-xs rounded-xl bg-white/10 border-white/15 text-white placeholder:text-zinc-400 focus-visible:ring-amber-400"
            />

            <div className="flex items-center justify-between pt-1">
              {/* Color picker */}
              <div className="flex items-center gap-1.5">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.id)}
                    className={cn(
                      "size-4 rounded-full transition-transform",
                      c.bg,
                      selectedColor === c.id ? "ring-2 ring-white scale-110" : "opacity-70 hover:opacity-100"
                    )}
                  />
                ))}
              </div>

              <Button
                type="submit"
                size="sm"
                variant="default"
                disabled={loading}
                className="h-7 px-3 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-zinc-950"
              >
                {loading ? <Loader2 className="size-3 animate-spin" /> : "Save Note"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
