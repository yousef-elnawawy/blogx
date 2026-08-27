"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Folder, Plus, Check, Loader2, Bookmark } from "lucide-react";
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

  useEffect(() => {
    if (open) {
      setSelectedId(currentCollectionId);
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
      toast.success(colId ? "Added to collection" : "Removed from collection");
      onAssigned?.(colId);
      onOpenChange(false);
    } catch {
      toast.error("Failed to update collection");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] p-0 gap-0 overflow-hidden rounded-2xl border-border bg-card shadow-2xl">
        <DialogHeader className="p-4 pb-3 border-b border-border/60">
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <Bookmark className="size-4 text-brand-bookmark fill-brand-bookmark" />
            <span>Save to Collection</span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-3 max-h-72 overflow-y-auto divide-y divide-border/40">
          {/* Uncategorized Option */}
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSelect(null)}
            className={`w-full p-2.5 rounded-xl flex items-center justify-between hover:bg-muted/60 transition-colors text-left cursor-pointer ${
              selectedId === null ? "bg-muted font-bold text-foreground" : "text-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                <Bookmark className="size-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">All Bookmarks (General)</div>
                <div className="text-[11px] text-muted-foreground">No specific collection</div>
              </div>
            </div>
            {selectedId === null && <Check className="size-4 text-primary" />}
          </button>

          {/* User Collections */}
          {loading ? (
            <div className="p-6 text-center">
              <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : collections.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No custom collections yet. Create collections on your Bookmarks page!
            </div>
          ) : (
            collections.map((col) => (
              <button
                key={col.id}
                type="button"
                disabled={saving}
                onClick={() => handleSelect(col.id)}
                className={`w-full p-2.5 rounded-xl flex items-center justify-between hover:bg-muted/60 transition-colors text-left cursor-pointer ${
                  selectedId === col.id ? "bg-muted font-bold text-foreground" : "text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`size-8 rounded-lg flex items-center justify-center border ${getCollectionColorBadge(col.color)}`}>
                    <Folder className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">{col.name}</div>
                    {col.description && (
                      <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                        {col.description}
                      </div>
                    )}
                  </div>
                </div>
                {selectedId === col.id && <Check className="size-4 text-primary" />}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
