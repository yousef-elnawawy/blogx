import React from "react";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function VerifiedBadge({
  size = "md",
  className,
}: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: "size-3.5",
    md: "size-4",
    lg: "size-5",
  };

  return (
    <span
      title="حساب موثق • Verified Account"
      className={cn(
        "inline-flex items-center justify-center shrink-0 align-middle select-none",
        className
      )}
      aria-label="Verified account"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={cn(
          sizeClasses[size],
          "fill-[#1d9bf0] text-white"
        )}
      >
        <g>
          <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
        </g>
      </svg>
    </span>
  );
}
