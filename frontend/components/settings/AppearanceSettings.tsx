"use client";

import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AppearanceSettingsProps {
  onBack: () => void;
}

export default function AppearanceSettings({ onBack }: AppearanceSettingsProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen pb-24 divide-y divide-border/60 animate-in fade-in duration-200">
      {/* Top Sticky Header with Back Button */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 rounded-full hover:bg-muted transition-colors text-foreground cursor-pointer"
            aria-label="Back to Settings"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">
            Appearance
          </h1>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5 max-w-2xl">
        <div>
          <h3 className="text-sm font-bold text-foreground">Theme & Interface</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customize how BlogX looks on your device. Choose between light, dark, or automatically sync with your system.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* System Theme Card */}
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
            <div className="size-11 rounded-xl bg-background border border-border/80 flex items-center justify-center text-primary mb-3 shadow-inner">
              <Monitor className="size-5" />
            </div>
            <div className="w-full text-center">
              <p className="text-xs font-bold text-foreground flex items-center justify-center gap-1.5">
                <span>System</span>
                {theme === "system" && <Check className="size-3 text-primary shrink-0" />}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Matches your device
              </p>
            </div>
          </button>

          {/* Light Theme Card */}
          <button
            type="button"
            onClick={() => {
              setTheme("light");
              toast.success("Light Theme activated");
            }}
            className={cn(
              "flex flex-col items-center p-4 rounded-2xl border-2 transition-all cursor-pointer text-left relative overflow-hidden group",
              theme === "light"
                ? "border-primary bg-primary/10 shadow-md"
                : "border-border/70 hover:border-border hover:bg-muted/40"
            )}
          >
            <div className="size-11 rounded-xl bg-[#f7f2eb] border border-amber-900/10 flex items-center justify-center text-amber-600 mb-3 shadow-inner">
              <Sun className="size-5" />
            </div>
            <div className="w-full text-center">
              <p className="text-xs font-bold text-foreground flex items-center justify-center gap-1.5">
                <span>Light Mode</span>
                {theme === "light" && <Check className="size-3 text-primary shrink-0" />}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Warm editorial linen
              </p>
            </div>
          </button>

          {/* Dark Theme Card */}
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
            <div className="size-11 rounded-xl bg-[#161412] border border-white/10 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
              <Moon className="size-5" />
            </div>
            <div className="w-full text-center">
              <p className="text-xs font-bold text-foreground flex items-center justify-center gap-1.5">
                <span>Dark Mode</span>
                {theme === "dark" && <Check className="size-3 text-primary shrink-0" />}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Warm espresso charcoal
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
