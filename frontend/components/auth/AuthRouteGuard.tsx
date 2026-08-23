"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { X, LogIn, UserPlus, Sparkles, MessageCircle, Bell, Users, Bookmark, Settings, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * List of route patterns that strictly require an authenticated user.
 */
const PROTECTED_ROUTE_PATTERNS: RegExp[] = [
  /^\/messages(\/.*)?$/,
  /^\/notifications(\/.*)?$/,
  /^\/mentions(\/.*)?$/,
  /^\/following(\/.*)?$/,
  /^\/bookmarks(\/.*)?$/,
  /^\/saved(\/.*)?$/,
  /^\/liked(\/.*)?$/,
  /^\/likes(\/.*)?$/,
  /^\/settings(\/.*)?$/,
  /^\/communities(\/.*)?$/,
  /^\/blogs\/new(\/.*)?$/,
  /^\/blogs\/[^\/]+\/edit(\/.*)?$/,
  /^\/profile(\/.*)?$/,
];

export function isProtectedRoute(pathname: string): boolean {
  if (!pathname) return false;
  return PROTECTED_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}

function getPageIcon(pathname: string) {
  if (pathname.startsWith("/messages")) return MessageCircle;
  if (pathname.startsWith("/notifications") || pathname.startsWith("/mentions")) return Bell;
  if (pathname.startsWith("/communities") || pathname.startsWith("/following")) return Users;
  if (pathname.startsWith("/bookmarks") || pathname.startsWith("/saved") || pathname.startsWith("/likes") || pathname.startsWith("/liked")) return Bookmark;
  if (pathname.startsWith("/settings")) return Settings;
  return Sparkles;
}

function getPageContext(pathname: string) {
  if (pathname.startsWith("/messages")) {
    return {
      title: "Never miss a direct message",
      desc: "Sign in to send and receive real-time direct messages with developers and writers on BlogX.",
    };
  }
  if (pathname.startsWith("/notifications") || pathname.startsWith("/mentions")) {
    return {
      title: "Stay updated on your interactions",
      desc: "Sign in to see likes, mentions, comments, and new followers in your notification feed.",
    };
  }
  if (pathname.startsWith("/communities")) {
    return {
      title: "Join tech communities",
      desc: "Sign in to join communities, share knowledge, and collaborate with like-minded creators.",
    };
  }
  if (pathname.startsWith("/following")) {
    return {
      title: "Follow your favorite creators",
      desc: "Sign in to customize your feed and see updates from people you follow.",
    };
  }
  return {
    title: "Sign in to BlogX",
    desc: "Join the developer and tech writing community on BlogX to unlock all interactive features.",
  };
}

export default function AuthRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isProtected = isProtectedRoute(pathname);

  // If on a protected route and user is NOT logged in, show background with sleek Modal Popup
  if (isProtected && !loading && !user) {
    const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
    const PageIcon = getPageIcon(pathname);
    const context = getPageContext(pathname);

    const handleClose = () => {
      // Redirect to home feed if they dismiss the modal
      router.push("/");
    };

    return (
      <div className="relative min-h-[calc(100vh-4rem)]">
        {/* Blurred, non-interactive background content */}
        <div className="pointer-events-none select-none filter blur-[4px] opacity-35 transition-all duration-300">
          {children}
        </div>

        {/* Modal Overlay and Popup Box */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200">
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-[420px] overflow-hidden rounded-3xl border border-border/80 bg-background/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200"
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Close modal and go home"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Glowing gradient background pill */}
            <div className="pointer-events-none absolute -top-20 -right-20 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-amber-500/20 blur-3xl" />

            {/* Top Icon */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-sm">
              <PageIcon className="h-7 w-7 stroke-[2.2]" />
            </div>

            {/* Header Text */}
            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-2">
                {context.title}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {context.desc}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5">
              <Link
                href={redirectUrl}
                className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md hover:bg-primary/90 hover:shadow-lg transition-all active:scale-[0.99] px-4 cursor-pointer"
              >
                <LogIn className="h-4 w-4 shrink-0" />
                <span>Sign In</span>
              </Link>

              <Link
                href="/signup"
                className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl border border-border/80 bg-card hover:bg-accent text-foreground text-sm font-medium transition-colors active:scale-[0.99] px-4 cursor-pointer"
              >
                <UserPlus className="h-4 w-4 shrink-0" />
                <span>Create New Account</span>
              </Link>
            </div>

            {/* Dismiss note */}
            <div className="mt-5 text-center">
              <button
                onClick={handleClose}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
              >
                Not now, explore public feed
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise render content normally
  return <>{children}</>;
}


