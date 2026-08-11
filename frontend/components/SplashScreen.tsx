"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Fraunces } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600"],
  style: ["italic"],
  variable: "--font-fraunces",
});

export default function SplashScreen() {
  const { loading: authLoading } = useAuth();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Ensure minimum display time of 800ms for visual stability & smooth entrance
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Once minimum time has passed and auth check completes, start fade out
    if (!authLoading && minTimeElapsed) {
      setFadingOut(true);
      const fadeTimer = setTimeout(() => {
        setVisible(false);
      }, 500); // 500ms fade transition duration

      return () => clearTimeout(fadeTimer);
    }
  }, [authLoading, minTimeElapsed]);

  if (!visible) return null;

  return (
    <div
      className={`${fraunces.variable} fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ease-in-out ${
        fadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Large transparent watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <img
          src="/logo.svg"
          alt=""
          className="w-[min(80vw,500px)] h-auto opacity-[0.07] pointer-events-none select-none dark:hidden"
        />
        <img
          src="/logo-dark.svg"
          alt=""
          className="w-[min(80vw,500px)] h-auto opacity-[0.07] pointer-events-none select-none hidden dark:block"
        />
      </div>

      <div className="relative flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-500">
        {/* Logo Image */}
        <div className="relative">
          {/* Subtle background glow effect */}
          <div className="absolute inset-0 rounded-full bg-primary/15 blur-2xl scale-150 animate-pulse" />
          <img
            src="/logo.svg"
            alt="BlogX"
            className="relative h-16 sm:h-20 w-auto dark:hidden"
          />
          <img
            src="/logo-dark.svg"
            alt="BlogX"
            className="relative h-16 sm:h-20 w-auto hidden dark:block"
          />
        </div>

        {/* Minimal loading dot indicator */}
        <div className="flex items-center gap-1.5 pt-2">
          <div className="size-2 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.3s]" />
          <div className="size-2 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]" />
          <div className="size-2 rounded-full bg-primary/70 animate-bounce" />
        </div>
      </div>
    </div>
  );
}
