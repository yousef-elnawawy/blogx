import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { BACKEND_URL } from "./config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAvatarUrl(avatar: string | null | undefined): string | undefined {
  if (!avatar) return undefined;
  if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
    return avatar;
  }
  if (avatar.startsWith("//")) {
    return `https:${avatar}`;
  }
  return `${BACKEND_URL}${avatar.startsWith("/") ? "" : "/"}${avatar}`;
}

export function getInitials(name?: string | null): string {
  if (!name) return "U";
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// 12 Curated Solid Color Themes for Avatar Fallbacks
const AVATAR_COLORS = [
  "bg-amber-600 text-white",
  "bg-sky-600 text-white",
  "bg-indigo-600 text-white",
  "bg-violet-600 text-white",
  "bg-emerald-600 text-white",
  "bg-rose-600 text-white",
  "bg-teal-600 text-white",
  "bg-orange-600 text-white",
  "bg-cyan-600 text-white",
  "bg-fuchsia-600 text-white",
  "bg-lime-700 text-white",
  "bg-blue-700 text-white",
];

// Hash function for deterministic color choice
function stringToHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getAvatarGradient(seed?: string | null): string {
  const s = seed || "default";
  const index = stringToHash(s) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

// Curated Solid Color Themes for Default Banners
const BANNER_COLORS = [
  "bg-amber-700/80",
  "bg-sky-700/80",
  "bg-emerald-700/80",
  "bg-indigo-700/80",
  "bg-rose-700/80",
  "bg-violet-700/80",
];

export function getDefaultBannerGradient(seed?: string | null): string {
  const s = seed || "default";
  const index = stringToHash(s) % BANNER_COLORS.length;
  return BANNER_COLORS[index];
}

export interface SocialPlatformInfo {
  key: string;
  name: string;
  color: string;
  bgColor: string;
  iconName: string;
  url: string;
}

export function detectSocialPlatform(rawUrl: string): SocialPlatformInfo {
  let clean = rawUrl.trim();
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = `https://${clean}`;
  }

  let hostname = "";
  try {
    const parsed = new URL(clean);
    hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    hostname = clean.toLowerCase();
  }

  if (hostname.includes("x.com") || hostname.includes("twitter.com")) {
    return {
      key: "x",
      name: "X (Twitter)",
      color: "text-foreground",
      bgColor: "bg-foreground/10 hover:bg-foreground/20 border-foreground/20",
      iconName: "X",
      url: clean,
    };
  }

  if (hostname.includes("facebook.com") || hostname.includes("fb.com") || hostname.includes("fb.me")) {
    return {
      key: "facebook",
      name: "Facebook",
      color: "text-[#1877F2]",
      bgColor: "bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border-[#1877F2]/20",
      iconName: "Facebook",
      url: clean,
    };
  }

  if (hostname.includes("instagram.com") || hostname.includes("instagr.am")) {
    return {
      key: "instagram",
      name: "Instagram",
      color: "text-[#E4405F]",
      bgColor: "bg-[#E4405F]/10 hover:bg-[#E4405F]/20 border-[#E4405F]/20",
      iconName: "Instagram",
      url: clean,
    };
  }

  if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
    return {
      key: "youtube",
      name: "YouTube",
      color: "text-[#FF0000]",
      bgColor: "bg-[#FF0000]/10 hover:bg-[#FF0000]/20 border-[#FF0000]/20",
      iconName: "Youtube",
      url: clean,
    };
  }

  if (hostname.includes("github.com")) {
    return {
      key: "github",
      name: "GitHub",
      color: "text-foreground",
      bgColor: "bg-foreground/10 hover:bg-foreground/20 border-foreground/20",
      iconName: "Github",
      url: clean,
    };
  }

  if (hostname.includes("stackoverflow.com") || hostname.includes("stackexchange.com")) {
    return {
      key: "stackoverflow",
      name: "Stack Overflow",
      color: "text-[#F48024]",
      bgColor: "bg-[#F48024]/10 hover:bg-[#F48024]/20 border-[#F48024]/20",
      iconName: "Stackoverflow",
      url: clean,
    };
  }

  if (hostname.includes("linkedin.com")) {
    return {
      key: "linkedin",
      name: "LinkedIn",
      color: "text-[#0A66C2]",
      bgColor: "bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 border-[#0A66C2]/20",
      iconName: "Linkedin",
      url: clean,
    };
  }

  if (hostname.includes("tiktok.com")) {
    return {
      key: "tiktok",
      name: "TikTok",
      color: "text-foreground",
      bgColor: "bg-foreground/10 hover:bg-foreground/20 border-foreground/20",
      iconName: "Music",
      url: clean,
    };
  }

  if (hostname.includes("telegram.org") || hostname.includes("t.me")) {
    return {
      key: "telegram",
      name: "Telegram",
      color: "text-[#229ED9]",
      bgColor: "bg-[#229ED9]/10 hover:bg-[#229ED9]/20 border-[#229ED9]/20",
      iconName: "Send",
      url: clean,
    };
  }

  if (hostname.includes("discord.gg") || hostname.includes("discord.com")) {
    return {
      key: "discord",
      name: "Discord",
      color: "text-[#5865F2]",
      bgColor: "bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border-[#5865F2]/20",
      iconName: "MessageCircle",
      url: clean,
    };
  }

  if (hostname.includes("reddit.com")) {
    return {
      key: "reddit",
      name: "Reddit",
      color: "text-[#FF4500]",
      bgColor: "bg-[#FF4500]/10 hover:bg-[#FF4500]/20 border-[#FF4500]/20",
      iconName: "Flame",
      url: clean,
    };
  }

  if (hostname.includes("twitch.tv")) {
    return {
      key: "twitch",
      name: "Twitch",
      color: "text-[#9146FF]",
      bgColor: "bg-[#9146FF]/10 hover:bg-[#9146FF]/20 border-[#9146FF]/20",
      iconName: "Tv",
      url: clean,
    };
  }

  if (hostname.includes("threads.net")) {
    return {
      key: "threads",
      name: "Threads",
      color: "text-foreground",
      bgColor: "bg-foreground/10 hover:bg-foreground/20 border-foreground/20",
      iconName: "AtSign",
      url: clean,
    };
  }

  if (hostname.includes("medium.com")) {
    return {
      key: "medium",
      name: "Medium",
      color: "text-foreground",
      bgColor: "bg-foreground/10 hover:bg-foreground/20 border-foreground/20",
      iconName: "Medium",
      url: clean,
    };
  }

  if (hostname.includes("dev.to")) {
    return {
      key: "devto",
      name: "Dev.to",
      color: "text-foreground",
      bgColor: "bg-foreground/10 hover:bg-foreground/20 border-foreground/20",
      iconName: "Devto",
      url: clean,
    };
  }

  if (hostname.includes("gitlab.com")) {
    return {
      key: "gitlab",
      name: "GitLab",
      color: "text-[#FC6D26]",
      bgColor: "bg-[#FC6D26]/10 hover:bg-[#FC6D26]/20 border-[#FC6D26]/20",
      iconName: "Gitlab",
      url: clean,
    };
  }

  if (hostname.includes("dribbble.com")) {
    return {
      key: "dribbble",
      name: "Dribbble",
      color: "text-[#EA4C89]",
      bgColor: "bg-[#EA4C89]/10 hover:bg-[#EA4C89]/20 border-[#EA4C89]/20",
      iconName: "Dribbble",
      url: clean,
    };
  }

  if (hostname.includes("behance.net")) {
    return {
      key: "behance",
      name: "Behance",
      color: "text-[#1769FF]",
      bgColor: "bg-[#1769FF]/10 hover:bg-[#1769FF]/20 border-[#1769FF]/20",
      iconName: "Behance",
      url: clean,
    };
  }

  if (hostname.includes("pinterest.com") || hostname.includes("pin.it")) {
    return {
      key: "pinterest",
      name: "Pinterest",
      color: "text-[#E60023]",
      bgColor: "bg-[#E60023]/10 hover:bg-[#E60023]/20 border-[#E60023]/20",
      iconName: "Pinterest",
      url: clean,
    };
  }

  if (hostname.includes("whatsapp.com") || hostname.includes("wa.me")) {
    return {
      key: "whatsapp",
      name: "WhatsApp",
      color: "text-[#25D366]",
      bgColor: "bg-[#25D366]/10 hover:bg-[#25D366]/20 border-[#25D366]/20",
      iconName: "Whatsapp",
      url: clean,
    };
  }

  if (hostname.includes("spotify.com")) {
    return {
      key: "spotify",
      name: "Spotify",
      color: "text-[#1DB954]",
      bgColor: "bg-[#1DB954]/10 hover:bg-[#1DB954]/20 border-[#1DB954]/20",
      iconName: "Spotify",
      url: clean,
    };
  }

  if (hostname.includes("codepen.io")) {
    return {
      key: "codepen",
      name: "CodePen",
      color: "text-foreground",
      bgColor: "bg-foreground/10 hover:bg-foreground/20 border-foreground/20",
      iconName: "Codepen",
      url: clean,
    };
  }

  if (hostname.includes("kaggle.com")) {
    return {
      key: "kaggle",
      name: "Kaggle",
      color: "text-[#20BEFF]",
      bgColor: "bg-[#20BEFF]/10 hover:bg-[#20BEFF]/20 border-[#20BEFF]/20",
      iconName: "Kaggle",
      url: clean,
    };
  }

  if (hostname.includes("leetcode.com")) {
    return {
      key: "leetcode",
      name: "LeetCode",
      color: "text-[#FFA116]",
      bgColor: "bg-[#FFA116]/10 hover:bg-[#FFA116]/20 border-[#FFA116]/20",
      iconName: "Leetcode",
      url: clean,
    };
  }

  if (hostname.includes("substack.com")) {
    return {
      key: "substack",
      name: "Substack",
      color: "text-[#FF6719]",
      bgColor: "bg-[#FF6719]/10 hover:bg-[#FF6719]/20 border-[#FF6719]/20",
      iconName: "Substack",
      url: clean,
    };
  }

  let displayDomain = "Website";
  try {
    const parsed = new URL(clean);
    displayDomain = parsed.hostname.replace(/^www\./, "");
  } catch {
    displayDomain = clean.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "Website";
  }

  return {
    key: "website",
    name: displayDomain,
    color: "text-foreground",
    bgColor: "bg-muted/80 hover:bg-muted border-border/80",
    iconName: "Globe",
    url: clean,
  };
}

export function sanitizeUrl(url: string): string {
  let clean = url.trim();
  if (
    clean.startsWith("javascript:") ||
    clean.startsWith("data:") ||
    clean.startsWith("vbscript:")
  ) {
    return "#";
  }
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    return `https://${clean}`;
  }
  return clean;
}
