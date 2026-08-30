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
  Type,
  Sliders,
  Eye,
  Bookmark,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface AppearanceSettingsProps {
  onBack: () => void;
}

const ACCENT_COLORS = [
  { id: "default", name: "Classic Amber", color: "bg-[#d97706]", hex: "#d97706" },
  { id: "indigo", name: "Indigo Blue", color: "bg-[#4f46e5]", hex: "#4f46e5" },
  { id: "emerald", name: "Emerald Forest", color: "bg-[#059669]", hex: "#059669" },
  { id: "rose", name: "Crimson Rose", color: "bg-[#e11d48]", hex: "#e11d48" },
  { id: "cyan", name: "Cyan Ocean", color: "bg-[#0891b2]", hex: "#0891b2" },
  { id: "purple", name: "Purple Orchid", color: "bg-[#9333ea]", hex: "#9333ea" },
];

const FONT_FAMILIES = [
  { id: "default", name: "Editorial Modern (Default)", preview: "قراءة مقالات BlogX المتميزة" },
  { id: "cairo", name: "Cairo", preview: "قراءة مقالات BlogX المتميزة" },
  { id: "ibm", name: "IBM Plex Arabic", preview: "قراءة مقالات BlogX المتميزة" },
  { id: "tajawal", name: "Tajawal", preview: "قراءة مقالات BlogX المتميزة" },
];

export default function AppearanceSettings({ onBack }: AppearanceSettingsProps) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const [accentColor, setAccentColor] = useState<string>("default");
  const [fontFamily, setFontFamily] = useState<string>("default");
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
  const [defaultFeedTab, setDefaultFeedTab] = useState<string>("for_you");
  const [readingMode, setReadingMode] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load existing preferences from user or localStorage
    const savedAccent = localStorage.getItem("blogx_accent_color") || user?.preferences?.accent_color || "default";
    const savedFont = localStorage.getItem("blogx_font_family") || user?.preferences?.font_family || "default";
    const savedSize = (localStorage.getItem("blogx_font_size") || user?.preferences?.blog_font_size || "medium") as any;
    const savedTab = localStorage.getItem("blogx_default_tab") || user?.preferences?.default_feed_tab || "for_you";
    const savedReading = localStorage.getItem("blogx_reading_mode") === "true" || !!user?.preferences?.reading_mode_enabled;

    setAccentColor(savedAccent);
    setFontFamily(savedFont);
    setFontSize(savedSize);
    setDefaultFeedTab(savedTab);
    setReadingMode(savedReading);
  }, [user]);

  const handleSavePreferences = async (updates: Record<string, any>) => {
    setSaving(true);
    try {
      // 1. LocalStorage
      if (updates.accent_color) {
        localStorage.setItem("blogx_accent_color", updates.accent_color);
        document.documentElement.setAttribute("data-accent", updates.accent_color);
      }
      if (updates.font_family) {
        localStorage.setItem("blogx_font_family", updates.font_family);
        document.documentElement.setAttribute("data-font", updates.font_family);
      }
      if (updates.blog_font_size) {
        localStorage.setItem("blogx_font_size", updates.blog_font_size);
      }
      if (updates.default_feed_tab) {
        localStorage.setItem("blogx_default_tab", updates.default_feed_tab);
      }
      if (updates.reading_mode_enabled !== undefined) {
        localStorage.setItem("blogx_reading_mode", String(updates.reading_mode_enabled));
      }

      // 2. Remote API sync if logged in
      if (user) {
        await api.post("/api/user/preferences", updates);
      }
      toast.success("Preferences updated successfully");
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
        <div className="flex items-center justify-between">
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
                Appearance & Personalization
              </h1>
              <p className="text-xs text-muted-foreground">
                Themes, typography, colors, and layout preferences
              </p>
            </div>
          </div>

          {saving && <Loader2 className="size-4 animate-spin text-primary" />}
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-8 max-w-2xl mx-auto">
        {/* 1. Theme Selection */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sun className="size-4 text-primary" />
              <span>Theme Mode</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose between light, dark, or system default.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* System */}
            <button
              type="button"
              onClick={() => {
                setTheme("system");
                toast.success("Theme set to System Default");
              }}
              className={cn(
                "flex flex-col items-center p-4 rounded-2xl border-2 transition-all cursor-pointer text-left relative overflow-hidden group",
                theme === "system"
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border/70 hover:border-border hover:bg-muted/40"
              )}
            >
              <div className="size-10 rounded-xl bg-background border border-border/80 flex items-center justify-center text-primary mb-2 shadow-inner">
                <Monitor className="size-5" />
              </div>
              <p className="text-xs font-bold text-foreground flex items-center gap-1">
                <span>System</span>
                {theme === "system" && <Check className="size-3 text-primary shrink-0" />}
              </p>
            </button>

            {/* Light */}
            <button
              type="button"
              onClick={() => {
                setTheme("light");
                toast.success("Light Mode activated");
              }}
              className={cn(
                "flex flex-col items-center p-4 rounded-2xl border-2 transition-all cursor-pointer text-left relative overflow-hidden group",
                theme === "light"
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border/70 hover:border-border hover:bg-muted/40"
              )}
            >
              <div className="size-10 rounded-xl bg-[#f7f2eb] border border-amber-900/10 flex items-center justify-center text-amber-600 mb-2 shadow-inner">
                <Sun className="size-5" />
              </div>
              <p className="text-xs font-bold text-foreground flex items-center gap-1">
                <span>Light</span>
                {theme === "light" && <Check className="size-3 text-primary shrink-0" />}
              </p>
            </button>

            {/* Dark */}
            <button
              type="button"
              onClick={() => {
                setTheme("dark");
                toast.success("Dark Mode activated");
              }}
              className={cn(
                "flex flex-col items-center p-4 rounded-2xl border-2 transition-all cursor-pointer text-left relative overflow-hidden group",
                theme === "dark"
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border/70 hover:border-border hover:bg-muted/40"
              )}
            >
              <div className="size-10 rounded-xl bg-[#161412] border border-white/10 flex items-center justify-center text-amber-400 mb-2 shadow-inner">
                <Moon className="size-5" />
              </div>
              <p className="text-xs font-bold text-foreground flex items-center gap-1">
                <span>Dark</span>
                {theme === "dark" && <Check className="size-3 text-primary shrink-0" />}
              </p>
            </button>
          </div>
        </div>

        {/* 2. Accent Color Palette */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Palette className="size-4 text-primary" />
              <span>Accent Color</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose your primary highlight color for buttons, links, and active badges.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {ACCENT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setAccentColor(c.id);
                  handleSavePreferences({ accent_color: c.id });
                }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer text-left",
                  accentColor === c.id
                    ? "border-primary bg-primary/10 font-bold"
                    : "border-border/70 hover:border-border hover:bg-muted/40"
                )}
              >
                <div className={`size-6 rounded-full shrink-0 ${c.color} flex items-center justify-center text-white shadow-sm`}>
                  {accentColor === c.id && <Check className="size-3.5" />}
                </div>
                <span className="text-xs font-medium text-foreground truncate">
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Typography & Reading Font */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Type className="size-4 text-primary" />
              <span>Typography & Reading Font</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select your preferred font family for reading articles and long-form blogs.
            </p>
          </div>

          <div className="space-y-2">
            {FONT_FAMILIES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFontFamily(f.id);
                  handleSavePreferences({ font_family: f.id });
                }}
                className={cn(
                  "w-full flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer text-left",
                  fontFamily === f.id
                    ? "border-primary bg-primary/10"
                    : "border-border/70 hover:border-border hover:bg-muted/30"
                )}
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground">
                    {f.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {f.preview}
                  </div>
                </div>
                {fontFamily === f.id && <Check className="size-4 text-primary shrink-0 ml-2" />}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Reading Font Size */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Eye className="size-4 text-primary" />
              <span>Article Font Size</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adjust comfortable text size for articles and comments.
            </p>
          </div>

          <div className="flex rounded-xl bg-muted/60 p-1 border border-border/50">
            {(["small", "medium", "large"] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setFontSize(size);
                  handleSavePreferences({ blog_font_size: size });
                }}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold capitalize transition-all cursor-pointer text-center",
                  fontSize === size
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Default Home Feed Tab */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sliders className="size-4 text-primary" />
              <span>Default Feed View</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose which tab opens automatically when visiting the homepage.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "for_you", label: "For You" },
              { id: "following", label: "Following" },
              { id: "trending", label: "Trending" },
              { id: "latest", label: "Latest" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setDefaultFeedTab(tab.id);
                  handleSavePreferences({ default_feed_tab: tab.id });
                }}
                className={cn(
                  "py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center",
                  defaultFeedTab === tab.id
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                    : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/40"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
