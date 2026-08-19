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
        return `${count.toLocaleString()} ${count === 1 ? "Follower" : "Followers"}`;
      case "posts":
        return `${count.toLocaleString()} ${count === 1 ? "Published Post" : "Published Posts"}`;
      case "likes":
        return `${count.toLocaleString()} ${count === 1 ? "Post Like" : "Post Likes"}`;
      case "views":
        return `${count.toLocaleString()} ${count === 1 ? "Post View" : "Post Views"}`;
      default:
        return `${count.toLocaleString()} Milestone`;
    }
  })();

  const achievementSubtitle = (() => {
    switch (milestoneType) {
      case "followers":
        return "For inspiring an active audience and building an authentic creator presence on BlogX.";
      case "posts":
        return "For dedicated storytelling, active blogging, and valuable contributions to the community.";
      case "likes":
        return "For crafting content that resonates deeply with readers across the BlogX network.";
      case "views":
        return "For capturing high reader engagement and broad visibility across the BlogX platform.";
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
      exportRef.current.style.opacity = "1";
      exportRef.current.style.pointerEvents = "auto";

      await new Promise((resolve) =>
        requestAnimationFrame(() => {
          setTimeout(resolve, 400);
        })
      );

      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        quality: 1,
        backgroundColor: "#fcfaf7",
      });

      exportRef.current.style.opacity = "0";
      exportRef.current.style.pointerEvents = "none";

      const link = document.createElement("a");
      link.download = `BlogX-Achievement-${username}-${milestoneCount}.png`;
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

  // ─── High-DPI Clean Export Certificate (Off-screen) ─────────────────────────

  const ExportCertificate = (
    <div
      ref={exportRef}
      style={{
        position: "fixed",
        top: "-9999px",
        left: "-9999px",
        width: "640px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        background: "#fcfaf7",
        borderRadius: "24px",
        border: "1px solid #e7decb",
        padding: "44px 48px",
        boxSizing: "border-box",
        color: "#1c1917",
        overflow: "hidden",
        opacity: 0,
        pointerEvents: "none",
        boxShadow: "0 20px 40px -15px rgba(0,0,0,0.06)",
      }}
    >
      {/* Subtle Warm Gradient Accents */}
      <div
        style={{
          position: "absolute",
          top: "-60px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "360px",
          height: "140px",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(217, 119, 6, 0.12) 0%, rgba(217, 119, 6, 0) 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "22px" }}>
        
        {/* Brand Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px", fontWeight: "900", letterSpacing: "-0.03em", color: "#b45309" }}>BlogX</span>
          <span style={{ color: "#d1c7b7", fontSize: "14px" }}>•</span>
          <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.14em", textTransform: "uppercase", color: "#78716c" }}>
            Creator Recognition
          </span>
        </div>

        {/* Title */}
        <div>
          <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "800", letterSpacing: "-0.02em", color: "#1c1917" }}>
            Certificate of Achievement
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#78716c", fontWeight: "500" }}>
            Presented in recognition of milestone engagement & community growth
          </p>
        </div>

        {/* Creator Info */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              border: "3px solid #eedec4",
              overflow: "hidden",
              background: "#f5eee2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}
          >
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt={userName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: "24px", fontWeight: "700", color: "#b45309" }}>
                {getInitials(userName)}
              </span>
            )}
          </div>

          <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#1c1917" }}>
              {userName}
            </h3>
            {Boolean(currentUser?.verified) && (
              <span style={{ color: "#0284c7", fontSize: "15px", fontWeight: "bold" }}>✓</span>
            )}
          </div>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#a8a29e", fontWeight: "500" }}>
            @{username}
          </p>
        </div>

        {/* Milestone Box */}
        <div
          style={{
            width: "100%",
            maxWidth: "460px",
            padding: "20px 24px",
            borderRadius: "18px",
            background: "#ffffff",
            border: "1px solid #eadecb",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          }}
        >
          <span style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.14em", color: "#a8a29e", textTransform: "uppercase" }}>
            Officially Reached
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px", color: "#b45309" }}>
            <span style={{ fontSize: "26px" }}>🏆</span>
            <span style={{ fontSize: "28px", fontWeight: "900", letterSpacing: "-0.02em", color: "#b45309" }}>
              {milestoneTitle}
            </span>
          </div>
          <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#57534e", textAlign: "center", lineHeight: "1.6", fontWeight: "400" }}>
            {achievementSubtitle}
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            width: "100%",
            paddingTop: "16px",
            borderTop: "1px solid #e7decb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "11px",
            color: "#78716c",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span>Issued on:</span>
            <strong style={{ color: "#1c1917" }}>{formattedDate}</strong>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ color: "#059669", fontWeight: "bold" }}>●</span>
            <span style={{ fontWeight: "600", color: "#1c1917" }}>Officially Verified Creator</span>
          </div>
        </div>

      </div>
    </div>
  );

  // ─── Modal Dialog View ──────────────────────────────────────────────────────

  return (
    <>
      {ExportCertificate}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl p-5 sm:p-6 bg-card border-border shadow-2xl rounded-3xl overflow-hidden">
          <DialogHeader className="pb-3 border-b border-border/60 flex items-center justify-between">
            <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <span className="font-black text-primary tracking-tight">BlogX</span>
              <span className="text-muted-foreground">•</span>
              <span>Creator Milestone</span>
            </DialogTitle>
          </DialogHeader>

          {/* Certificate Card */}
          <div
            ref={certificateRef}
            className="relative rounded-2xl p-6 sm:p-7 border border-border/80 bg-background/50 text-foreground shadow-xs overflow-hidden print:border-none print:shadow-none"
          >
            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="size-3" />
                <span>Official Creator Network</span>
              </div>

              {/* Title */}
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Certificate of Achievement
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  Presented in recognition of community growth
                </p>
              </div>

              {/* User Profile Info */}
              <div className="flex flex-col items-center pt-1">
                <Avatar className="size-16 ring-3 ring-primary/20 shadow-xs">
                  <AvatarImage src={avatarUrl} alt={userName} crossOrigin="anonymous" />
                  <AvatarFallback className="bg-muted text-foreground font-bold text-base">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>

                <div className="mt-2.5 flex items-center gap-1.5">
                  <h3 className="text-base font-bold text-foreground tracking-tight">
                    {userName}
                  </h3>
                  {Boolean(currentUser?.verified) && <VerifiedBadge size="sm" />}
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  @{username}
                </p>
              </div>

              {/* Milestone Box */}
              <div className="w-full max-w-sm py-3.5 px-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col items-center">
                <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                  Officially Achieved
                </span>
                <div className="flex items-center justify-center gap-2 text-primary mt-1">
                  <Trophy className="size-6 shrink-0 text-primary" />
                  <span className="text-2xl sm:text-2xl font-black tracking-tight text-primary">
                    {milestoneTitle}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center leading-relaxed font-normal">
                  {achievementSubtitle}
                </p>
              </div>

              {/* Footer */}
              <div className="w-full pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary" />
                  <span>
                    Issued on: <strong className="text-foreground">{formattedDate}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold text-foreground">
                    Verified Creator
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
              className="rounded-full text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer className="size-3.5" />
              <span>Print</span>
            </Button>

            <Button
              size="sm"
              onClick={handleDownload}
              disabled={downloading}
              className="rounded-full text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>{downloading ? "Generating..." : "Download Certificate (PNG)"}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}