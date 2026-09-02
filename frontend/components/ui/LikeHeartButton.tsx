"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface LikeHeartButtonProps {
  isLiked: boolean;
  likesCount?: number;
  onClick: (e: React.MouseEvent) => void;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  className?: string;
  countClassName?: string;
  disabled?: boolean;
}

const PARTICLES = [
  { x: 0, y: -16, delay: 0 },
  { x: 12, y: -12, delay: 0.03 },
  { x: 16, y: 0, delay: 0.05 },
  { x: 12, y: 12, delay: 0.02 },
  { x: -12, y: 12, delay: 0.04 },
  { x: -16, y: 0, delay: 0.01 },
  { x: -12, y: -12, delay: 0.06 },
];

export default function LikeHeartButton({
  isLiked,
  likesCount,
  onClick,
  size = "sm",
  showCount = true,
  className,
  countClassName,
  disabled = false,
}: LikeHeartButtonProps) {
  const [isExploding, setIsExploding] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    if (!isLiked) {
      setIsExploding(true);
      setTimeout(() => setIsExploding(false), 700);
    }
    onClick(e);
  };

  const iconSizes = {
    sm: "size-4",
    md: "size-5",
    lg: "size-6",
  };

  const buttonPaddings = {
    sm: "h-8 px-2.5 gap-1.5 text-xs",
    md: "h-9 px-3 gap-2 text-sm",
    lg: "h-10 px-3.5 gap-2.5 text-base",
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "relative inline-flex items-center justify-center font-medium rounded-full select-none cursor-pointer transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50",
        buttonPaddings[size],
        isLiked
          ? "text-rose-600 dark:text-rose-500 bg-rose-500/10 hover:bg-rose-500/15"
          : "text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      aria-label={isLiked ? "Unlike" : "Like"}
    >
      <div className="relative flex items-center justify-center">
        {/* Burst particles */}
        <AnimatePresence>
          {isExploding && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {PARTICLES.map((p, idx) => (
                <motion.span
                  key={idx}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{
                    x: p.x,
                    y: p.y,
                    scale: [0, 1.4, 0],
                    opacity: [1, 0.9, 0],
                  }}
                  transition={{
                    duration: 0.5,
                    delay: p.delay,
                    ease: "easeOut",
                  }}
                  className="absolute size-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-500"
                />
              ))}
              {/* Outer ring flash */}
              <motion.div
                initial={{ scale: 0.4, opacity: 0.9 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="absolute size-6 rounded-full border border-rose-500/60"
              />
            </div>
          )}
        </AnimatePresence>

        {/* Heart Icon with spring bounce */}
        <motion.div
          key={isLiked ? "liked" : "unliked"}
          initial={{ scale: 1 }}
          animate={
            isLiked
              ? { scale: [1, 0.7, 1.35, 0.9, 1.05, 1] }
              : { scale: [1, 0.85, 1] }
          }
          transition={{
            duration: isLiked ? 0.45 : 0.2,
            ease: "easeInOut",
          }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.8 }}
          className="flex items-center justify-center"
        >
          <Heart
            className={cn(
              iconSizes[size],
              "transition-colors duration-200",
              isLiked && "fill-rose-500 text-rose-500"
            )}
          />
        </motion.div>
      </div>

      {/* Smooth animated number count */}
      {showCount && typeof likesCount === "number" && likesCount > 0 && (
        <span className={cn("tabular-nums font-semibold", countClassName)}>
          {likesCount >= 1000
            ? `${(likesCount / 1000).toFixed(1).replace(/\.0$/, "")}k`
            : likesCount}
        </span>
      )}
    </button>
  );
}
