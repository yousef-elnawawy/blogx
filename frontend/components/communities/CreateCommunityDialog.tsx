"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Users, Globe, Lock, ImagePlus, Loader2, Plus, X, ShieldAlert } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CreateCommunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommunityCreated?: (community: any) => void;
}

export default function CreateCommunityDialog({
  open,
  onOpenChange,
  onCommunityCreated,
}: CreateCommunityDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"public" | "restricted">("public");
  const [rules, setRules] = useState<string[]>(["Be respectful and kind", "No spam or self-promotion"]);
  const [newRule, setNewRule] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, "-")) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30));
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCover(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const addRule = () => {
    if (newRule.trim() && rules.length < 8) {
      setRules([...rules, newRule.trim()]);
      setNewRule("");
    }
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Community name is required");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      if (slug) formData.append("slug", slug);
      if (description) formData.append("description", description);
      formData.append("type", type);
      rules.forEach((r) => formData.append("rules[]", r));
      if (avatar) formData.append("avatar", avatar);
      if (cover) formData.append("cover", cover);

      const res = await api.post("/api/communities", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Community created successfully!");
      onOpenChange(false);

      if (onCommunityCreated) {
        onCommunityCreated(res.data.community);
      }

      router.push(`/c/${res.data.community.slug}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to create community";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-6 bg-card border-border shadow-2xl rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-border/60">
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <span>Create a Community</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Cover & Avatar upload preview */}
          <div className="relative rounded-2xl overflow-hidden bg-muted/50 border border-border/70 h-28 flex items-center justify-center group">
            {coverPreview ? (
              <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ImagePlus className="size-5" />
                <span>Upload Cover Image</span>
                <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
              </label>
            )}

            {/* Avatar overlay */}
            <div className="absolute bottom-2 left-4 size-14 rounded-2xl border-2 border-card bg-card shadow-md overflow-hidden flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
              ) : (
                <label className="cursor-pointer flex items-center justify-center size-full text-muted-foreground hover:text-primary">
                  <Users className="size-6" />
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Name & Slug */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Community Name</Label>
            <Input
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Web Developers & Tech"
              className="rounded-xl border-border bg-background text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Custom URL Slug</Label>
            <div className="flex items-center rounded-xl border border-border bg-background px-3 text-xs text-muted-foreground">
              <span>blogx.com/c/</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                placeholder="web-dev"
                className="w-full bg-transparent p-2 text-sm text-foreground focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this community about? Who should join?"
              rows={2}
              className="rounded-xl border-border bg-background text-xs resize-none"
            />
          </div>

          {/* Community Rules */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Community Guidelines / Rules</Label>
            <div className="space-y-1.5">
              {rules.map((rule, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-muted/40 text-xs text-foreground">
                  <span>{idx + 1}. {rule}</span>
                  <button type="button" onClick={() => removeRule(idx)} className="text-muted-foreground hover:text-destructive">
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {rules.length < 6 && (
              <div className="flex gap-2 pt-1">
                <Input
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addRule();
                    }
                  }}
                  placeholder="Add a new rule..."
                  className="rounded-xl border-border bg-background text-xs h-8"
                />
                <Button type="button" size="sm" variant="outline" onClick={addRule} className="rounded-xl h-8 text-xs shrink-0">
                  <Plus className="size-3.5 mr-1" /> Add
                </Button>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="-mx-6 -mb-6 mt-6 flex items-center justify-end gap-2 border-t border-border/60 bg-muted/50 p-4 rounded-b-3xl">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="rounded-full px-5 text-xs font-semibold cursor-pointer shadow-2xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !name.trim()}
              className="rounded-full px-6 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
            >
              {submitting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              <span>Create Community</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
