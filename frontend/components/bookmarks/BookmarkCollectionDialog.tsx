"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Folder, Bookmark, Tag, Sparkles, BookOpen, Film, Code, Star, Heart, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export interface CollectionItem {
  id: number;
  name: string;
  description?: string | null;
  color: string;
  icon: string;
  posts_count?: number;
  blogs_count?: number;
}

const COLOR_OPTIONS = [
  { key: "blue", label: "Blue", bg: "bg-sky-500", text: "text-sky-500", border: "border-sky-500", badge: "bg-sky-500/10 text-sky-500 border-sky-500/20" },
  { key: "emerald", label: "Green", bg: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-500", badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  { key: "purple", label: "Purple", bg: "bg-purple-500", text: "text-purple-500", border: "border-purple-500", badge: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  { key: "amber", label: "Amber", bg: "bg-amber-500", text: "text-amber-500", border: "border-amber-500", badge: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  { key: "rose", label: "Rose", bg: "bg-rose-500", text: "text-rose-500", border: "border-rose-500", badge: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
  { key: "cyan", label: "Cyan", bg: "bg-cyan-500", text: "text-cyan-500", border: "border-cyan-500", badge: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" },
];

export function getCollectionColorBadge(colorKey?: string) {
  const found = COLOR_OPTIONS.find((c) => c.key === colorKey);
  return found?.badge || COLOR_OPTIONS[0].badge;
}

export function getCollectionColorText(colorKey?: string) {
  const found = COLOR_OPTIONS.find((c) => c.key === colorKey);
  return found?.text || COLOR_OPTIONS[0].text;
}

interface BookmarkCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionToEdit?: CollectionItem | null;
  onSaved: (collection: CollectionItem) => void;
}

export default function BookmarkCollectionDialog({
  open,
  onOpenChange,
  collectionToEdit,
  onSaved,
}: BookmarkCollectionDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState("blue");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (collectionToEdit) {
      setName(collectionToEdit.name);
      setDescription(collectionToEdit.description || "");
      setSelectedColor(collectionToEdit.color || "blue");
    } else {
      setName("");
      setDescription("");
      setSelectedColor("blue");
    }
  }, [collectionToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a collection name");
      return;
    }

    setLoading(true);
    try {
      if (collectionToEdit) {
        const res = await api.put(`/api/bookmark-collections/${collectionToEdit.id}`, {
          name: name.trim(),
          description: description.trim() || null,
          color: selectedColor,
          icon: "folder",
        });
        toast.success("Collection updated successfully");
        onSaved(res.data.collection);
      } else {
        const res = await api.post("/api/bookmark-collections", {
          name: name.trim(),
          description: description.trim() || null,
          color: selectedColor,
          icon: "folder",
        });
        toast.success("Collection created successfully");
        onSaved(res.data.collection);
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save collection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden rounded-2xl border-border bg-card shadow-2xl">
        <DialogHeader className="p-5 pb-4 border-b border-border/60">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Folder className="size-4.5 text-primary" />
            <span>{collectionToEdit ? "Edit Collection" : "New Saved Collection"}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Collection Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              Collection Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Technology, Books, Inspiration..."
              maxLength={50}
              autoFocus
            />
          </div>

          {/* Optional Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">
              Description (Optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What kind of bookmarks are in this folder?"
              rows={2}
              className="min-h-18"
              maxLength={150}
            />
          </div>

          {/* Color Selection */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-foreground">Theme Color</label>
            <div className="flex items-center gap-2.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setSelectedColor(c.key)}
                  className={`size-7 rounded-full ${c.bg} transition-all flex items-center justify-center cursor-pointer ${
                    selectedColor === c.key ? "ring-2 ring-foreground scale-110 shadow-sm" : "opacity-75 hover:opacity-100"
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !name.trim()}
              className="rounded-xl px-5 font-bold cursor-pointer"
            >
              {loading && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              {collectionToEdit ? "Save Changes" : "Create Collection"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
