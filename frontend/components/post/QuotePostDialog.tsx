"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Loader2, Quote, X } from "lucide-react";
import { getAvatarUrl, getAvatarGradient, getInitials } from "@/lib/utils";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import PostImageGrid from "@/components/post/PostImageGrid";
import api from "@/lib/api";
import { toast } from "sonner";

interface QuotePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPost: {
    id: string | number;
    content: string;
    images?: string[];
    created_at?: string;
    author: {
      name: string;
      username: string;
      avatar: string | null;
      verified?: boolean;
    };
  };
  currentUser?: {
    name: string;
    username: string;
    avatar: string | null;
  } | null;
  onPostCreated?: (post: any) => void;
}

export default function QuotePostDialog({
  open,
  onOpenChange,
  targetPost,
  currentUser,
  onPostCreated,
}: QuotePostDialogProps) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    if (images.length + newFiles.length > 4) {
      toast.error("You can attach up to 4 images.");
      return;
    }

    setImages((prev) => [...prev, ...newFiles]);
    const previews = newFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...previews]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0) {
      toast.error("Please enter some text for your quote post.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("content", content);
      images.forEach((img) => formData.append("images[]", img));

      const res = await api.post(`/api/posts/${targetPost.id}/quote`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Quote post published!");
      setContent("");
      setImages([]);
      setImagePreviews([]);
      onOpenChange(false);

      if (onPostCreated) {
        onPostCreated(res.data.post);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to publish quote post";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const userAvatarSrc = getAvatarUrl(currentUser?.avatar);
  const targetAvatarSrc = getAvatarUrl(targetPost.author.avatar);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-5 bg-card border-border shadow-2xl rounded-3xl overflow-hidden">
        <DialogHeader className="pb-2 border-b border-border/60">
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Quote className="size-4 text-primary" />
            <span>Quote Post</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* User composer row */}
          <div className="flex items-start gap-3">
            <Avatar className="size-9 ring-2 ring-border/40 shrink-0">
              <AvatarImage src={userAvatarSrc} alt={currentUser?.name || "User"} />
              <AvatarFallback className={`text-xs font-bold ${getAvatarGradient(currentUser?.username || "user")}`}>
                {getInitials(currentUser?.name || "U")}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Add your comment or thoughts..."
                rows={3}
                className="w-full resize-none border-none p-0 focus-visible:ring-0 text-sm bg-transparent placeholder:text-muted-foreground/70"
                autoFocus
              />

              {/* Uploaded images preview */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden group aspect-video bg-muted">
                      <img src={src} alt="Upload preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Embedded Target Post Card Preview */}
          <div className="rounded-2xl border border-border/80 bg-muted/30 p-3.5 space-y-2">
            <div className="flex items-center gap-2">
              <Avatar className="size-6 ring-1 ring-border/40">
                <AvatarImage src={targetAvatarSrc} alt={targetPost.author.name} />
                <AvatarFallback className="text-[10px] font-bold">
                  {getInitials(targetPost.author.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-bold text-foreground">
                {targetPost.author.name}
              </span>
              {Boolean(targetPost.author.verified) && <VerifiedBadge size="xs" />}
              <span className="text-xs text-muted-foreground">
                @{targetPost.author.username}
              </span>
            </div>

            {targetPost.content && (
              <p className="text-xs text-foreground/90 leading-relaxed line-clamp-3">
                {targetPost.content}
              </p>
            )}

            {targetPost.images && targetPost.images.length > 0 && (
              <div className="mt-2 rounded-xl overflow-hidden max-h-48">
                <PostImageGrid images={targetPost.images} onImageClick={() => {}} />
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="-mx-5 -mb-5 flex items-center justify-between border-t border-border/60 bg-muted/40 p-4 rounded-b-3xl">
            <div>
              <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/70 transition-colors">
                <ImagePlus className="size-4 text-primary" />
                <span>Add media</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={submitting || images.length >= 4}
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="rounded-full px-4 text-xs font-semibold cursor-pointer shadow-2xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || (!content.trim() && images.length === 0)}
                className="rounded-full px-5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
                <span>Post</span>
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
