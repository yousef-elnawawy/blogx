import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { BACKEND_URL } from "./config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
