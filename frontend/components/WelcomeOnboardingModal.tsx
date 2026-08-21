"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sparkles,
  PartyPopper,
  PenTool,
  BookOpen,
  Users,
  Compass,
  ArrowRight,
  CheckCircle2,
  X,
} from "lucide-react";

export default function WelcomeOnboardingModal() {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shouldShow = localStorage.getItem("blogx_welcome_onboarding");
    if (shouldShow === "true" && user) {
      setIsOpen(true);

      // Fire celebratory confetti explosion
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#d97706", "#2563eb", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"],
        });

        const end = Date.now() + 2500;
        const interval: NodeJS.Timeout = setInterval(() => {
          if (Date.now() > end) {
            clearInterval(interval);
            return;
          }
          confetti({
            startVelocity: 35,
            spread: 360,
            ticks: 70,
            origin: {
              x: Math.random(),
              y: Math.random() - 0.2,
            },
            colors: ["#d97706", "#10b981", "#3b82f6", "#f59e0b"],
          });
        }, 400);
      } catch {
        // Confetti gracefully skipped if canvas not ready
      }
    }
  }, [user]);

  const handleClose = () => {
    setIsOpen(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("blogx_welcome_onboarding");
    }
  };

  const handleNavigate = (path: string) => {
    handleClose();
    router.push(path);
  };

  if (!isOpen || !user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl sm:rounded-3xl">
        {/* Decorative Top Gradient Header */}
        <div className="relative h-28 bg-gradient-to-tr from-primary/25 via-amber-500/15 to-emerald-500/20 flex items-center justify-center border-b border-border/60">
          <button
            onClick={handleClose}
            className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-background/70 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
          
          <div className="size-16 rounded-2xl bg-background border-2 border-primary/40 shadow-xl flex items-center justify-center text-primary transform -translate-y-1">
            <PartyPopper className="size-8 stroke-[2.2] animate-bounce text-amber-500" />
          </div>
        </div>

        <div className="px-6 sm:px-8 pt-4 pb-7 space-y-5">
          {/* Welcome Titles */}
          <div className="text-center space-y-1.5">
            <DialogTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-[family-name:var(--font-fraunces)]">
              Welcome to BlogX, {user.name.split(" ")[0]}! 🎉
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
              Your personal hub for writing, reading, exploring series, and engaging with top creators.
            </DialogDescription>
          </div>

          {/* Quick Action Highlights */}
          <div className="grid grid-cols-1 gap-2.5">
            <button
              onClick={() => handleNavigate("/blogs/new")}
              className="group p-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/60 hover:border-primary/50 transition-all text-left flex items-center gap-3.5 cursor-pointer"
            >
              <div className="size-10 rounded-lg bg-primary/10 group-hover:bg-primary text-primary group-hover:text-primary-foreground flex items-center justify-center shrink-0 transition-colors">
                <PenTool className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                  Write Your First Blog Story
                  <Sparkles className="size-3.5 text-amber-500" />
                </h4>
                <p className="text-[11px] text-muted-foreground truncate">
                  Use our block editor with syntax highlighting, YouTube embeds, and tables.
                </p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
            </button>

            <button
              onClick={() => handleNavigate("/series")}
              className="group p-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/60 hover:border-amber-500/50 transition-all text-left flex items-center gap-3.5 cursor-pointer"
            >
              <div className="size-10 rounded-lg bg-amber-500/10 group-hover:bg-amber-500 text-amber-600 dark:text-amber-400 group-hover:text-black flex items-center justify-center shrink-0 transition-colors">
                <BookOpen className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-amber-500 transition-colors">
                  Explore Learning Series
                </h4>
                <p className="text-[11px] text-muted-foreground truncate">
                  Discover structured multi-part courses and step-by-step reading series.
                </p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-1 transition-all shrink-0" />
            </button>

            <button
              onClick={() => handleNavigate("/communities")}
              className="group p-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/60 hover:border-emerald-500/50 transition-all text-left flex items-center gap-3.5 cursor-pointer"
            >
              <div className="size-10 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                <Users className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-emerald-500 transition-colors">
                  Join Communities
                </h4>
                <p className="text-[11px] text-muted-foreground truncate">
                  Engage in specialized topic discussions with fellow engineers and writers.
                </p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Button
              type="button"
              onClick={handleClose}
              className="w-full h-11 rounded-xl font-bold text-xs sm:text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Compass className="size-4" />
              <span>Let's Start Exploring!</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
