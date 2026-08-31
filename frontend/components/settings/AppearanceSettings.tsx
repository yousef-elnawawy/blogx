"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Check,
  Palette,
  Sparkles,
  Loader2,
  BadgeCheck,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import BlogXLogo from "@/components/ui/BlogXLogo";
import { Button } from "@/components/ui/button";

interface AppearanceSettingsProps {
  onBack: () => void;
}

const ACCENT_COLORS = [
  {
    id: "default",
    name: "Classic Amber",
    description: "Default Original Brand",
    color: "bg-[#d97706]",
  },
  {
    id: "indigo",
    name: "Indigo Blue",
    description: "Deep Tech & Modern",
    color: "bg-[#4f46e5]",
  },
  {
    id: "emerald",
    name: "Emerald Forest",
    description: "Natural & Balanced",
    color: "bg-[#059669]",
  },
  {
    id: "rose",
    name: "Crimson Rose",
    description: "Vibrant & Expressive",
    color: "bg-[#e11d48]",
  },
  {
    id: "cyan",
    name: "Cyan Ocean",
    description: "Fresh & Futuristic",
    color: "bg-[#0891b2]",
  },
  {
    id: "purple",
    name: "Purple Orchid",
    description: "Creative & Premium",
    color: "bg-[#9333ea]",
  },
];

export default function AppearanceSettings({ onBack }: AppearanceSettingsProps) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [accentColor, setAccentColor] = useState<string>("default");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load saved accent color from user preferences or localStorage
    const savedAccent = localStorage.getItem("blogx_accent_color") || user?.preferences?.accent_color || "default";
    setAccentColor(savedAccent);
    document.documentElement.setAttribute("data-accent", savedAccent);
  }, [user]);

  const handleSelectAccent = async (colorId: string) => {
    setAccentColor(colorId);
    document.documentElement.setAttribute("data-accent", colorId);
    localStorage.setItem("blogx_accent_color", colorId);

    setSaving(true);
    try {
      if (user) {
        await api.post("/api/user/preferences", { accent_color: colorId });
      }
      toast.success("Theme accent updated successfully");
    } catch (err) {
      console.error("Failed to sync preferences", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 divide-y divide-border/60 animate-in fade-in duration-200">
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 rounded-full hover:bg-muted transition-colors text-foreground cursor-pointer"
              aria-label="Back to Settings"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">
                Appearance & Theme
              </h1>
              <p className="text-xs text-muted-foreground">
                Customize your display mode and platform accent colors
              </p>
            </div>
          </div>

          {saving && <Loader2 className="size-4 animate-spin text-primary" />}
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-7 max-w-2xl mx-auto">
        {/* 1. Theme Mode */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sun className="size-4 text-primary" />
              <span>Display Theme</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose between light, dark, or system default mode.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {/* System */}
            <button
              type="button"
              onClick={() => {
                setTheme("system");
                toast.success("Theme set to System Default");
              }}
              className={cn(
                "flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all cursor-pointer text-center",
                theme === "system"
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                  : "border-border/70 text-foreground hover:border-border hover:bg-muted/40"
              )}
            >
              <Monitor className="size-5 mb-1.5 opacity-80" />
              <span className="text-xs font-semibold">System</span>
              {theme === "system" && <Check className="size-3.5 text-primary mt-1" />}
            </button>

            {/* Light */}
            <button
              type="button"
              onClick={() => {
                setTheme("light");
                toast.success("Light Mode activated");
              }}
              className={cn(
                "flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all cursor-pointer text-center",
                theme === "light"
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                  : "border-border/70 text-foreground hover:border-border hover:bg-muted/40"
              )}
            >
              <Sun className="size-5 mb-1.5 opacity-80 text-amber-500" />
              <span className="text-xs font-semibold">Light</span>
              {theme === "light" && <Check className="size-3.5 text-primary mt-1" />}
            </button>

            {/* Dark */}
            <button
              type="button"
              onClick={() => {
                setTheme("dark");
                toast.success("Dark Mode activated");
              }}
              className={cn(
                "flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all cursor-pointer text-center",
                theme === "dark"
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                  : "border-border/70 text-foreground hover:border-border hover:bg-muted/40"
              )}
            >
              <Moon className="size-5 mb-1.5 opacity-80 text-amber-400" />
              <span className="text-xs font-semibold">Dark</span>
              {theme === "dark" && <Check className="size-3.5 text-primary mt-1" />}
            </button>
          </div>
        </div>

        {/* 2. Accent Color Palette */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Palette className="size-4 text-primary" />
              <span>Accent Color</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select your primary color for buttons, badges, highlights, and the BlogX logo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ACCENT_COLORS.map((c) => {
              const isSelected = accentColor === c.id;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectAccent(c.id)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer text-left group",
                    isSelected
                      ? "border-primary bg-primary/10 font-bold shadow-xs"
                      : "border-border/60 hover:border-border hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "size-7 rounded-full shrink-0 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110",
                        c.color
                      )}
                    >
                      {isSelected && <Check className="size-4 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {c.description}
                      </div>
                    </div>
                  </div>

                  {c.id === "default" && (
                    <span className="text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Default
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Live Preview Card */}
        <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              <span>Live Theme Preview</span>
            </h3>
            <span className="text-xs text-primary font-semibold">Instant Active</span>
          </div>

          <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3 shadow-xs">
            {/* Dynamic BlogX Logo Preview */}
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <BlogXLogo className="h-6 w-auto" />
                <span className="text-xs text-muted-foreground font-medium">
                  Dynamic Adaptive Logo
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-primary">
                <BadgeCheck className="size-4" />
                <span>Verified Author</span>
              </div>
            </div>

            {/* Elements preview */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button size="sm" className="rounded-full text-xs font-bold px-4 shadow-sm">
                Primary Button
              </Button>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                <Hash className="size-3" />
                <span>engineering</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Sample link with{" "}
                <span className="text-primary font-bold underline cursor-pointer">
                  accent highlight
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
