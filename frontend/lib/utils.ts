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

// 12 Curated Harmonious Gradient Themes for Avatars
const AVATAR_GRADIENTS = [
  "from-amber-500 to-orange-600 text-white",
  "from-sky-500 to-blue-600 text-white",
  "from-indigo-500 to-purple-600 text-white",
  "from-violet-500 to-fuchsia-600 text-white",
  "from-emerald-500 to-teal-600 text-white",
  "from-rose-500 to-pink-600 text-white",
  "from-teal-500 to-cyan-600 text-white",
  "from-amber-600 to-yellow-500 text-white",
  "from-cyan-500 to-blue-500 text-white",
  "from-fuchsia-500 to-rose-500 text-white",
  "from-lime-600 to-emerald-600 text-white",
  "from-blue-600 to-indigo-700 text-white",
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
  const index = stringToHash(s) % AVATAR_GRADIENTS.length;
  return `bg-gradient-to-br ${AVATAR_GRADIENTS[index]}`;
}

// Curated Aesthetic Mesh/Gradient Themes for Default Banners
const BANNER_GRADIENTS = [
  "from-amber-500/80 via-orange-500/70 to-rose-600/80",
  "from-sky-500/80 via-indigo-500/70 to-purple-600/80",
  "from-emerald-500/80 via-teal-500/70 to-cyan-600/80",
  "from-indigo-600/80 via-purple-600/70 to-pink-500/80",
  "from-rose-500/80 via-amber-500/70 to-yellow-500/80",
  "from-violet-600/80 via-blue-600/70 to-teal-500/80",
];

export function getDefaultBannerGradient(seed?: string | null): string {
  const s = seed || "default";
  const index = stringToHash(s) % BANNER_GRADIENTS.length;
  return `bg-gradient-to-r ${BANNER_GRADIENTS[index]}`;
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
      bgColor: "bg-foreground/10 hover:bg-foreground/20",
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
      bgColor: "bg-foreground/10 hover:bg-foreground/20",
      iconName: "Github",
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
      bgColor: "bg-foreground/10 hover:bg-foreground/20",
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
      bgColor: "bg-foreground/10 hover:bg-foreground/20",
      iconName: "AtSign",
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
    color: "text-primary",
    bgColor: "bg-primary/10 hover:bg-primary/20 border-primary/20",
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
