import React from "react";
import {
  BadgeCheck,
  PenTool,
  Code2,
  Crown,
  Sparkles,
  Flame,
  ShieldAlert,
  ShieldCheck,
  Shield,
} from "lucide-react";
import { getBadgeDefinition, BadgeDefinition } from "@/lib/badges";
import { cn } from "@/lib/utils";

interface UserBadgesProps {
  equippedBadges?: string[] | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

function RenderBadgeIcon({ name, className = "size-3" }: { name: string; className?: string }) {
  switch (name) {
    case "BadgeCheck":
      return <BadgeCheck className={className} />;
    case "PenTool":
      return <PenTool className={className} />;
    case "Code2":
      return <Code2 className={className} />;
    case "Crown":
      return <Crown className={className} />;
    case "Sparkles":
      return <Sparkles className={className} />;
    case "Flame":
      return <Flame className={className} />;
    case "ShieldAlert":
      return <ShieldAlert className={className} />;
    case "ShieldCheck":
      return <ShieldCheck className={className} />;
    default:
      return <Shield className={className} />;
  }
}

export default function UserBadges({
  equippedBadges,
  size = "sm",
  className,
}: UserBadgesProps) {
  if (!equippedBadges) return null;

  let badgeIds: string[] = [];
  if (Array.isArray(equippedBadges)) {
    badgeIds = equippedBadges;
  } else if (typeof equippedBadges === "string") {
    try {
      const parsed = JSON.parse(equippedBadges);
      if (Array.isArray(parsed)) badgeIds = parsed;
      else if (parsed) badgeIds = [String(parsed)];
    } catch {
      badgeIds = [equippedBadges];
    }
  }

  if (badgeIds.length === 0) return null;

  const validBadges = badgeIds
    .map((id) => getBadgeDefinition(id))
    .filter((b): b is BadgeDefinition => Boolean(b));

  if (validBadges.length === 0) return null;

  const sizeClasses = {
    xs: { container: "size-4", icon: "size-2.5" },
    sm: { container: "size-4.5 sm:size-5", icon: "size-2.5 sm:size-3" },
    md: { container: "size-5.5", icon: "size-3.5" },
    lg: { container: "size-7", icon: "size-4" },
  }[size];

  return (
    <div className={cn("inline-flex items-center gap-1 shrink-0 select-none align-middle", className)}>
      {validBadges.map((badge) => (
        <span
          key={badge.id}
          title={`${badge.name} • ${badge.description}`}
          className={cn(
            "rounded-full border flex items-center justify-center shrink-0 transition-transform hover:scale-105 shadow-2xs",
            sizeClasses.container,
            badge.bgColor,
            badge.borderColor,
            badge.textColor
          )}
        >
          <RenderBadgeIcon name={badge.iconName} className={sizeClasses.icon} />
        </span>
      ))}
    </div>
  );
}
