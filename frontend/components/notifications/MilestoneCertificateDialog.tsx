"use client";

import { useRef, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { getAvatarUrl } from "@/lib/utils";
import {
  Sparkles,
  Download,
  Printer,
  Award,
  Calendar,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";

export interface MilestoneData {
  milestone_type?: "followers" | "posts" | "likes" | "views" | string;
  milestone_count?: number | string;
  milestone?: number | string;
  user_name?: string;
  username?: string;
  avatar?: string | null;
  issued_at?: string;
  post_content?: string;
}

interface MilestoneCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: MilestoneData;
  currentUser?: {
    name: string;
    username: string;
    avatar: string | null;
    verified?: boolean;
    followers_count?: number;
    following_count?: number;
    posts_count?: number;
  } | null;
}

function getInitials(name: string) {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Fetch an image URL and return a base64 data URL (bypasses CORS for canvas) */
async function toDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src, { mode: "cors", cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function MilestoneCertificateDialog({
  open,
  onOpenChange,
  data,
  currentUser,
}: MilestoneCertificateDialogProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  // Off-screen certificate used exclusively for PNG export
  const exportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);

  const userName = data.user_name || currentUser?.name || "BlogX Creator";
  const username = data.username || currentUser?.username || "creator";
  const avatarUrl = getAvatarUrl(data.avatar || currentUser?.avatar);
  const milestoneType = data.milestone_type || "followers";

  const milestoneCount = (() => {
    if (milestoneType === "followers") {
      if (currentUser?.followers_count !== undefined && currentUser.followers_count > 0) {
        return currentUser.followers_count;
      }
      return data.milestone_count || data.milestone || 1;
    }
    if (milestoneType === "posts") {
      if (currentUser?.posts_count !== undefined && currentUser.posts_count > 0) {
        return currentUser.posts_count;
      }
      return data.milestone_count || data.milestone || 1;
    }
    return data.milestone_count || data.milestone || 1;
  })();

  const formattedDate = (() => {
    try {
      const d = data.issued_at ? new Date(data.issued_at) : new Date();
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    }
  })();

  const milestoneTitle = (() => {
    const count = Number(milestoneCount);
    switch (milestoneType) {
      case "followers":
        return `${count} ${count === 1 ? "Follower" : "Followers"}`;
      case "posts":
        return `${count} ${count === 1 ? "Published Post" : "Published Posts"}`;
      case "likes":
        return `${count} ${count === 1 ? "Post Like" : "Post Likes"}`;
      case "views":
        return `${count} ${count === 1 ? "Post View" : "Post Views"}`;
      default:
        return `${count} Milestone`;
    }
  })();

  const achievementSubtitle = (() => {
    switch (milestoneType) {
      case "followers":
        return "For inspiring a growing audience and building an authentic creator presence on BlogX.";
      case "posts":
        return "For dedicated storytelling, active blogging, and valuable contributions to the BlogX community.";
      case "likes":
        return "For crafting content that resonates deeply with readers across the BlogX network.";
      case "views":
        return "For capturing high reader engagement and broad visibility across BlogX.";
      default:
        return "For reaching significant creative milestones and community excellence.";
    }
  })();

  // Pre-fetch avatar as data URL whenever the dialog opens
  useEffect(() => {
    if (!open || !avatarUrl) return;
    toDataUrl(avatarUrl).then(setAvatarDataUrl);
  }, [open, avatarUrl]);

  // ─── Download ───────────────────────────────────────────────────────────────

  const handleDownload = async () => {
    if (!exportRef.current) return;
    setDownloading(true);
    try {
      // ✅ نظهر العنصر للتصوير (opacity مش display)
      exportRef.current.style.opacity = "1";
      exportRef.current.style.pointerEvents = "auto";

      // ✅ نستنى frame كامل + 500ms عشان fonts و images يتحملوا
      await new Promise((resolve) => requestAnimationFrame(() => {
        setTimeout(resolve, 500);
      }));

      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        quality: 1,
        backgroundColor: BG_WHITE, // نضمن خلفية بيضاء
      });

      // ✅ نرجّع نخفيه تاني
      exportRef.current.style.opacity = "0";
      exportRef.current.style.pointerEvents = "none";

      const link = document.createElement("a");
      link.download = `blogx-milestone-${username}-${milestoneCount}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Certificate downloaded successfully!");
    } catch (err) {
      console.error("Download error:", err);
      if (exportRef.current) {
        exportRef.current.style.opacity = "0";
        exportRef.current.style.pointerEvents = "none";
      }
      toast.error("Failed to generate image. Try Print instead.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // ─── Inline-styled export certificate (rendered off-screen, no CSS vars) ────

  const GOLD = "#b8882e";
  const GOLD_LIGHT = "#c9a84c";
  const GOLD_BG = "rgba(184,136,46,0.08)";
  const GOLD_BORDER = "rgba(184,136,46,0.35)";
  const TEXT_DARK = "#1a1a1a";
  const TEXT_MID = "#555";
  const TEXT_MUTED = "#888";
  const BG_WHITE = "#ffffff";
  const BOX_BG = "#faf6ee";

  const ExportCertificate = (
    <div
      ref={exportRef}
      style={{
        // ❌ شيلنا display: "none"
        position: "fixed",
        top: "-9999px",
        left: "-9999px",
        width: "680px",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        background: BG_WHITE,
        borderRadius: "20px",
        border: `2px solid ${GOLD_BORDER}`,
        padding: "40px 48px",
        boxSizing: "border-box",
        color: TEXT_DARK,
        overflow: "hidden",
        opacity: 0,            // ✅ مخفي بس موجود في DOM
        pointerEvents: "none", // ✅ ما يتفاعلش مع الماوس
      }}
    >
      {/* Corner ornaments */}
      {(["tl","tr","bl","br"] as const).map((pos) => (
        <div
          key={pos}
          style={{
            position: "absolute",
            width: 24, height: 24,
            top:    pos.startsWith("t") ? 10 : undefined,
            bottom: pos.startsWith("b") ? 10 : undefined,
            left:   pos.endsWith("l")   ? 10 : undefined,
            right:  pos.endsWith("r")   ? 10 : undefined,
            borderTop:    pos.startsWith("t") ? `2px solid ${GOLD}` : undefined,
            borderBottom: pos.startsWith("b") ? `2px solid ${GOLD}` : undefined,
            borderLeft:   pos.endsWith("l")   ? `2px solid ${GOLD}` : undefined,
            borderRight:  pos.endsWith("r")   ? `2px solid ${GOLD}` : undefined,
          }}
        />
      ))}

      {/* Watermark — inline opacity so html-to-image captures it correctly */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: 0.04, pointerEvents: "none",
      }}>
        <svg width="380" height="380" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="6"/>
          <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
        </svg>
      </div>

      {/* Content — z-index via position:relative */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 20 }}>

        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 16px", borderRadius: 99,
          background: GOLD_BG, border: `1px solid ${GOLD_BORDER}`,
          color: GOLD, fontSize: 11, fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase",
        }}>
          ✦ Official BlogX Creator Network
        </div>

        {/* Title */}
        <div>
          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", color: TEXT_DARK }}>
            Certificate of Achievement
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: TEXT_MUTED, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500 }}>
            Presented in recognition of community growth
          </p>
        </div>

        {/* Avatar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4 }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            border: `3px solid ${GOLD_BORDER}`,
            overflow: "hidden", background: "#f0ebe0",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt={userName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 24, fontWeight: 700, color: GOLD }}>
                {getInitials(userName)}
              </span>
            )}
          </div>

          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: TEXT_DARK }}>
              {userName}
            </h3>
            {Boolean(currentUser?.verified) && (
              <span style={{ color: "#1d9bf0", fontSize: 14 }}>✓</span>
            )}
          </div>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: TEXT_MUTED, fontWeight: 500 }}>
            @{username}
          </p>
        </div>

        {/* Milestone box */}
        <div style={{
          width: "100%", maxWidth: 440,
          padding: "20px 28px", borderRadius: 16,
          background: BOX_BG, border: `1px solid ${GOLD_BORDER}`,
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: TEXT_MUTED, textTransform: "uppercase" }}>
            Officially Achieved
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, color: GOLD }}>
            <span style={{ fontSize: 28 }}>🏆</span>
            <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase", color: GOLD_LIGHT }}>
              {milestoneTitle}
            </span>
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 12, color: TEXT_MID, fontStyle: "italic", textAlign: "center", lineHeight: 1.6, fontWeight: 500 }}>
            {achievementSubtitle}
          </p>
        </div>

        {/* Footer */}
        <div style={{
          width: "100%", paddingTop: 16,
          borderTop: `1px solid #e0d9cc`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 12, color: TEXT_MUTED,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: GOLD }}>📅</span>
            <span>Issued on: <strong style={{ color: TEXT_DARK }}>{formattedDate}</strong></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#16a34a" }}>🛡</span>
            <span style={{ fontWeight: 700, color: TEXT_DARK }}>Officially Verified Creator</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Visible UI certificate (unchanged, CSS-based) ───────────────────────────

  return (
    <>
      {/* Hidden export-only certificate — always mounted so ref works */}
      {ExportCertificate}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl p-4 sm:p-6 bg-card border-border shadow-2xl rounded-3xl overflow-hidden">
          {/* Header with BlogX Logo */}
          <DialogHeader className="pb-3 border-b border-border/60 flex items-center justify-between">
            <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <img src="/logo.svg" alt="BlogX" className="h-6 w-auto inline-block dark:hidden" />
              <img src="/logo-dark.svg" alt="BlogX" className="h-6 w-auto hidden dark:inline-block" />
              <span>Milestone Certificate</span>
            </DialogTitle>
          </DialogHeader>

          {/* Certificate Card - Shown in dialog */}
          <div
            ref={certificateRef}
            className="relative rounded-2xl p-6 sm:p-8 border-2 border-primary/40 bg-card text-foreground shadow-lg overflow-hidden print:border-none print:shadow-none print:m-0"
          >
            {/* Decorative Corner Ornaments */}
            <div className="absolute top-2 left-2 size-6 border-t-2 border-l-2 border-primary/70" />
            <div className="absolute top-2 right-2 size-6 border-t-2 border-r-2 border-primary/70" />
            <div className="absolute bottom-2 left-2 size-6 border-b-2 border-l-2 border-primary/70" />
            <div className="absolute bottom-2 right-2 size-6 border-b-2 border-r-2 border-primary/70" />

            {/* Background Watermark Icon */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.04 }}>
              <Award className="size-96 text-primary" />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              {/* Top Badge */}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-bold uppercase tracking-widest">
                <Sparkles className="size-3.5" />
                <span>Official BlogX Creator Network</span>
              </div>

              {/* Title */}
              <div>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-foreground">
                  Certificate of Achievement
                </h2>
                <p className="text-xs text-muted-foreground tracking-wider mt-0.5 font-medium uppercase">
                  Presented in recognition of community growth
                </p>
              </div>

              {/* User Profile Info */}
              <div className="flex flex-col items-center pt-2">
                <Avatar className="size-16 ring-4 ring-primary/20 shadow-md">
                  <AvatarImage src={avatarUrl} alt={userName} crossOrigin="anonymous" />
                  <AvatarFallback className="bg-muted text-foreground font-bold text-lg">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>

                <div className="mt-2.5 flex items-center gap-1.5">
                  <h3 className="text-lg font-bold text-foreground tracking-tight">
                    {userName}
                  </h3>
                  {Boolean(currentUser?.verified) && <VerifiedBadge size="sm" />}
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  @{username}
                </p>
              </div>

              {/* Milestone Core Highlight Box */}
              <div className="w-full max-w-md py-4 px-6 rounded-2xl bg-primary/10 border border-primary/30 backdrop-blur-xs flex flex-col items-center shadow-xs">
                <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                  Officially Achieved
                </span>
                <div className="flex items-center justify-center gap-2 text-primary mt-1">
                  <Trophy className="size-7 shrink-0 text-primary" />
                  <span className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
                    {milestoneTitle}
                  </span>
                </div>
                <p className="text-xs text-foreground/80 italic mt-2 text-center leading-relaxed font-medium">
                  {achievementSubtitle}
                </p>
              </div>

              {/* Clean Certificate Footer */}
              <div className="w-full pt-4 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary" />
                  <span>
                    Issued on: <strong className="text-foreground">{formattedDate}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-foreground">
                    Officially Verified Creator
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="rounded-full text-xs font-semibold gap-1.5 border-border hover:bg-muted"
            >
              <Printer className="size-4" />
              <span>Print Certificate</span>
            </Button>

            <Button
              size="sm"
              onClick={handleDownload}
              disabled={downloading}
              className="rounded-full text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
            >
              <Download className="size-4" />
              <span>{downloading ? "Generating..." : "Download Certificate (PNG)"}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}