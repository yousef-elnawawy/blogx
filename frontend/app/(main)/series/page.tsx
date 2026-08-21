"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Layers,
  Search,
  Loader2,
  Plus,
  ArrowLeft,
  Sparkles,
  BookOpen,
  X,
  Upload,
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
import SeriesCard, { SeriesCardProps } from "@/components/blog/SeriesCard";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";
import { cn } from "@/lib/utils";

type TabType = "all" | "my";

export default function SeriesPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [seriesList, setSeriesList] = useState<SeriesCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");

  // Create Series Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    document.title = "Series & Reading Lists — BlogX";
  }, []);

  const fetchSeries = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "my" && user) {
        const res = await api.get("/api/user/series");
        const list = res.data?.series || res.data?.data || [];
        setSeriesList(
          list.map((s: any) => ({
            ...s,
            author: s.author || {
              name: user.name,
              username: user.username,
              avatar: user.avatar,
              verified: user.verified,
              equipped_badges: user.equipped_badges,
            },
          }))
        );
      } else {
        const res = await api.get("/api/series", {
          params: { q: searchQuery || undefined },
        });
        setSeriesList(res.data?.data || res.data?.series || []);
      }
    } catch (err) {
      console.error(err);
      setSeriesList([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, user, searchQuery]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSeries();
  };

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 675,
        quality: 0.85,
      });
      setCoverFile(compressed);
      setCoverPreview(URL.createObjectURL(compressed));
    } catch {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateSeries = async () => {
    if (!newTitle.trim()) {
      toast.error("Please enter a series title");
      return;
    }

    setCreating(true);
    try {
      const formData = new FormData();
      formData.append("title", newTitle.trim());
      if (newDescription.trim()) {
        formData.append("description", newDescription.trim());
      }
      if (coverFile) {
        formData.append("cover_image", coverFile);
      }

      const res = await api.post("/api/series", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Series created successfully!");
      setCreateDialogOpen(false);
      setNewTitle("");
      setNewDescription("");
      setCoverFile(null);
      setCoverPreview(null);
      fetchSeries();

      const created = res.data?.series;
      if (created?.slug) {
        router.push(`/series/${encodeURIComponent(created.slug)}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create series");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* ── 1. Top Header Bar ── */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60 px-4 py-3 sm:px-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Layers className="size-4" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight font-[family-name:var(--font-fraunces)]">
              Blog Series
            </h1>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Multi-part learning paths, step-by-step guides, and connected stories
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {user && (
            <Button
              onClick={() => setCreateDialogOpen(true)}
              variant="outline"
              size="sm"
              className="rounded-lg text-xs font-bold gap-1.5 h-8.5 px-3"
            >
              <Plus className="size-3.5 text-primary" />
              <span>New Series</span>
            </Button>
          )}

          <Button
            onClick={() => router.push("/blogs/new")}
            size="sm"
            className="rounded-lg text-xs font-bold gap-1.5 h-8.5 px-3.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
          >
            <BookOpen className="size-3.5" />
            <span>Write Blog</span>
          </Button>
        </div>
      </div>

      {/* ── 2. Search Bar ── */}
      <div className="p-4 sm:p-5 bg-card/30 border-b border-border/60 space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search series by title or topic..."
            className="w-full h-10 pl-9 pr-4 text-xs sm:text-sm bg-background border border-border/80 rounded-md placeholder:text-muted-foreground/70 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </form>

        {/* Tabs: All / My Series */}
        {user && (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer",
                activeTab === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              )}
            >
              All Series
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("my")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer",
                activeTab === "my"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              )}
            >
              My Series
            </button>
          </div>
        )}
      </div>

      {/* ── 3. Series List Stream ── */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="size-8 animate-spin mx-auto text-primary" />
          <p className="text-xs text-muted-foreground mt-2">Loading series...</p>
        </div>
      ) : seriesList.length > 0 ? (
        <div className="divide-y divide-border/60">
          {seriesList.map((series) => (
            <SeriesCard key={series.id} series={series} />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center max-w-sm mx-auto">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Layers className="size-7" />
          </div>
          <h3 className="mb-1 text-base font-bold text-foreground font-[family-name:var(--font-fraunces)]">
            {searchQuery
              ? "No series match your search"
              : activeTab === "my"
              ? "You haven't created any series yet"
              : "No series published yet"}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            {activeTab === "my"
              ? "Create a series to organize multiple blogs into a continuous learning path."
              : "Create multi-part connected stories and tutorials for your readers."}
          </p>
          {user && (
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="rounded-lg text-xs font-bold gap-1.5"
            >
              <Plus className="size-3.5" />
              <span>Create Series</span>
            </Button>
          )}
        </div>
      )}

      {/* ── 4. Create Series Modal Dialog ── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-[family-name:var(--font-fraunces)]">
              <Layers className="size-5 text-primary" />
              <span>Create New Series</span>
            </DialogTitle>
            <DialogDescription>
              Group your related blog posts into an ordered course or story.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">
                Series Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Learn Next.js 15 from Scratch"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground outline-hidden focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">
                Description (Optional)
              </label>
              <textarea
                placeholder="Brief summary of what readers will learn in this series..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground outline-hidden focus:border-primary resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">
                Cover Image (Optional)
              </label>
              {coverPreview ? (
                <div className="relative h-32 w-full rounded-xl overflow-hidden border border-border">
                  <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverFile(null);
                      setCoverPreview(null);
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-destructive hover:text-white text-foreground transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <label className="h-20 w-full border border-dashed border-border hover:border-primary/50 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer">
                  <Upload className="size-4 text-primary" />
                  <span className="text-[11px] font-semibold">Upload Cover Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverSelect}
                  />
                </label>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateSeries}
              disabled={creating || !newTitle.trim()}
            >
              {creating && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              <span>Create Series</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
