"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getAvatarUrl, getInitials } from "@/lib/utils";

export interface AvatarGroupItem {
  id?: number | string;
  name: string;
  avatar?: string | null;
  username?: string;
}

interface AvatarGroupProps {
  items: AvatarGroupItem[];
  max?: number;
  total?: number;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  onMoreClick?: () => void;
}

const sizeMap = {
  xs: "size-6 text-[10px] ring-2",
  sm: "size-7 text-xs ring-2",
  md: "size-8.5 text-xs ring-2",
  lg: "size-10 text-sm ring-2",
};

export default function AvatarGroup({
  items = [],
  max = 4,
  total,
  size = "md",
  className,
  onMoreClick,
}: AvatarGroupProps) {
  const visibleItems = items.slice(0, max);
  const totalCount = total !== undefined ? total : items.length;
  const remainingCount = totalCount - visibleItems.length;

  if (visibleItems.length === 0) return null;

  return (
    <div className={cn("flex items-center -space-x-2.5 rtl:space-x-reverse select-none", className)}>
      {visibleItems.map((item, idx) => {
        const avatarSrc = getAvatarUrl(item.avatar);
        return (
          <Avatar
            key={item.id ?? idx}
            className={cn(
              sizeMap[size],
              "ring-card bg-muted shadow-xs transition-transform duration-200 hover:scale-110 hover:z-20 cursor-pointer"
            )}
            title={item.name || (item.username ? `@${item.username}` : undefined)}
          >
            <AvatarImage src={avatarSrc} alt={item.name || "Member"} />
            <AvatarFallback className="font-bold bg-primary/10 text-primary">
              {getInitials(item.name || item.username || "U")}
            </AvatarFallback>
          </Avatar>
        );
      })}

      {remainingCount > 0 && (
        <div
          onClick={onMoreClick}
          className={cn(
            sizeMap[size],
            "ring-card bg-muted/90 text-muted-foreground font-bold flex items-center justify-center rounded-full shadow-xs cursor-pointer transition-transform duration-200 hover:scale-110 hover:z-20 hover:bg-muted hover:text-foreground"
          )}
          title={`${remainingCount} more members`}
        >
          +{remainingCount >= 1000 ? `${(remainingCount / 1000).toFixed(0)}k` : remainingCount}
        </div>
      )}
    </div>
  );
}
