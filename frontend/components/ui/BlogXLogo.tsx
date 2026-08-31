"use client";

import React from "react";

interface BlogXLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function BlogXLogo({ className = "h-7 w-auto", size }: BlogXLogoProps) {
  const sizeClasses = {
    sm: "h-5",
    md: "h-7",
    lg: "h-9",
    xl: "h-12",
  };

  const finalClass = size ? `${sizeClasses[size]} w-auto` : className;

  return (
    <svg
      viewBox="0 0 160 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block text-primary transition-colors duration-200 ${finalClass}`}
      aria-label="BlogX Logo"
    >
      <text
        x="80"
        y="38"
        textAnchor="middle"
        fontFamily="var(--font-fraunces), 'Georgia', 'Times New Roman', serif"
        fontSize="42"
        fontWeight="700"
        fontStyle="italic"
        fill="currentColor"
      >
        BlogX
      </text>
    </svg>
  );
}
