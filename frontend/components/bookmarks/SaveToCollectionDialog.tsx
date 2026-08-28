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
import { Folder, Plus, Check, Loader2, Bookmark, X } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { CollectionItem, getCollectionColorBadge } from "./BookmarkCollectionDialog";

interface SaveToCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId?: number | string | null;
  blogId?: number | string | null;
  currentCollectionId?: number | null;
  onAssigned?: (collectionId: number | null) => void;
}

const COLOR_OPTIONS = [
  { key: "blue", bg: "bg-sky-500" },
  { key: "emerald", bg: "bg-emerald-500" },
  { key: "purple", bg: "bg-purple-500" },
  { key: "amber", bg: "bg-amber-500" },
  { key: "rose", bg: "bg-rose-500" },
  { key: "cyan", bg: "bg-cyan-500" },
];

export default function SaveToCollectionDialog({
  open,
  onOpenChange,
  postId,
  blogId,
  currentCollectionId = null,
  onAssigned,
}: SaveToCollectionDialogProps) {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(currentCollectionId);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Inline "New Collection" creation state
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionColor, setNewCollectionColor] = useState("blue");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedId(currentCollectionId);
      setIsCreatingNew(false);
      setNewCollectionName("");
      setLoading(true);
      api
        .get("/api/bookmark-collections")
        .then((res) => {
          setCollections(res.data.collections || []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open, currentCollectionId]);

  const handleSelect = async (colId: number | null) => {
    setSelectedId(colId);
    setSaving(true);
    try {
      await api.post("/api/bookmarks/assign-collection", {
        post_id: postId || null,
        blog_id: blogId || null,
        collection_id: colId,
      });
      toast.success(colId ? "Added to collection" : "Saved to General Bookmarks");
      onAssigned?.(colId);
    } catch {
      toast.error("Failed to update collection");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) {
      toast.error("Please enter a collection name");
      return;
    }

    setCreating(true);
    try {
      const res = await api.post("/api/bookmark-collections", {
        name: newCollectionName.trim(),
        color: newCollectionColor,
        icon: "folder",
      });
      const createdCol = res.data.collection;
      setCollections((prev) => [createdCol, ...prev]);
      setNewCollectionName("");
      setIsCreatingNew(false);
      toast.success("Collection created!");

      // Immediately assign current item to this newly created collection
      await handleSelect(createdCol.id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create collection");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] p-0 gap-0 overflow-hidden rounded-3xl border-border bg-card shadow-2xl">
        <DialogHeader className="p-4 pb-3 border-b border-border/60 flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Bookmark className="size-4 text-brand-bookmark fill-brand-bookmark" />
            <span>Save to...</span>
          </DialogTitle>
        </DialogHeader>

        {/* Collections List (YouTube style checkboxes) */}
        <div className="p-3 max-h-64 overflow-y-auto space-y-1">
          {/* General Option */}
          <div
            onClick={() => !saving && handleSelect(null)}
            className={`w-full p-2.5 rounded-xl flex items-center justify-between hover:bg-muted/70 transition-colors cursor-pointer select-none ${
              selectedId === null ? "bg-muted/80 font-bold" : "text-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`size-5 rounded-md border flex items-center justify-center transition-all ${
                  selectedId === null
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-border/80 bg-background"
                }`}
              >
                {selectedId === null && <Check className="size-3.5 stroke-[3]" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  All Bookmarks (General)
                </p>
                <p className="text-[10px] text-muted-foreground">Default saved items</p>
              </div>
            </div>
            <Bookmark className="size-3.5 text-muted-foreground shrink-0" />
          </div>

          {/* User Collections */}
          {loading ? (
            <div className="py-6 text-center">
              <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : (
            collections.map((col) => {
              const isChecked = selectedId === col.id;
              return (
                <div
                  key={col.id}
                  onClick={() => !saving && handleSelect(col.id)}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between hover:bg-muted/70 transition-colors cursor-pointer select-none ${
                    isChecked ? "bg-muted/80 font-bold" : "text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`size-5 rounded-md border flex items-center justify-center transition-all ${
                        isChecked
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border/80 bg-background"
                      }`}
                    >
                      {isChecked && <Check className="size-3.5 stroke-[3]" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {col.name}
                      </p>
                      {col.description && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {col.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div
                    className={`size-6 rounded-lg flex items-center justify-center border shrink-0 ${getCollectionColorBadge(
                      col.color
                    )}`}
                  >
                    <Folder className="size-3" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer & Inline Create New Collection Form */}
        <div className="p-3 border-t border-border/60 bg-muted/20 space-y-2">
          {isCreatingNew ? (
            <form onSubmit={handleCreateCollection} className="space-y-2.5 animate-in fade-in-0 slide-in-from-top-1 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">New collection</span>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <Input
                type="text"
                placeholder="Enter collection name..."
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                autoFocus
                maxLength={40}
                className="h-9 text-xs bg-background rounded-xl"
              />

              {/* Color dots picker */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setNewCollectionColor(c.key)}
                      className={`size-5 rounded-full ${c.bg} transition-transform cursor-pointer ${
                        newCollectionColor === c.key ? "ring-2 ring-foreground scale-110" : "opacity-75 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={creating || !newCollectionName.trim()}
                  className="h-7 px-3 text-xs rounded-lg font-bold"
                >
                  {creating ? <Loader2 className="size-3 animate-spin" /> : "Create"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreatingNew(true)}
                className="h-8 px-2.5 text-xs font-semibold gap-1.5 text-primary hover:text-primary hover:bg-primary/10 rounded-xl"
              >
                <Plus className="size-3.5" />
                <span>New collection</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 px-4 text-xs font-bold rounded-xl"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
