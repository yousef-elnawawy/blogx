"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Sun,
  Moon,
  ShieldCheck,
  FileText,
  Lock,
  Sparkles,
  ArrowRight,
  Globe,
  ExternalLink,
  Code2,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { getAvatarUrl, getInitials } from "@/lib/utils";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "/about", label: "About BlogX", icon: Sparkles },
  { href: "/privacy", label: "Privacy Policy", icon: Lock },
  { href: "/terms", label: "Terms of Service", icon: FileText },
];

export default function InfoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/25 selection:text-foreground">
      {/* ── Top Header Navigation ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur-md transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg shrink-0"
            >
              <img
                src="/logo.svg"
                alt="BlogX"
                className="h-8 w-auto dark:hidden"
              />
              <img
                src="/logo-dark.svg"
                alt="BlogX"
                className="h-8 w-auto hidden dark:block"
              />
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/about" && pathname.startsWith(link.href));
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-primary/15 text-primary shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    }`}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-full border border-border/60 bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                aria-label="Toggle theme"
                title="Toggle light/dark theme"
              >
                {theme === "dark" ? (
                  <Sun className="size-4 text-amber-400" />
                ) : (
                  <Moon className="size-4 text-slate-700" />
                )}
              </button>
            )}

            {/* Link back to Main App Feed */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link href="/">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full h-8 px-3.5 text-xs font-semibold border-border hover:bg-muted cursor-pointer"
                  >
                    <span>Feed</span>
                  </Button>
                </Link>

                <Link
                  href={`/@${user.username}`}
                  className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted border border-border/60 transition-colors"
                >
                  <Avatar className="size-6 border border-border">
                    <AvatarImage src={getAvatarUrl(user.avatar)} alt={user.name} />
                    <AvatarFallback className="text-[10px] font-bold bg-primary/20 text-primary">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-bold text-foreground max-w-[100px] truncate hidden sm:inline">
                    {user.name}
                  </span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/" className="hidden sm:block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full h-8 px-3.5 text-xs font-semibold border-border hover:bg-muted cursor-pointer"
                  >
                    <span>Back to Feed</span>
                  </Button>
                </Link>

                <Link href="/login">
                  <Button
                    size="sm"
                    className="rounded-full h-8 px-4 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs cursor-pointer"
                  >
                    <span>Sign In</span>
                    <ArrowRight className="size-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Sub-Bar */}
        <div className="md:hidden border-t border-border/50 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {NAV_LINKS.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/about" && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground bg-muted/40"
                }`}
              >
                <Icon className="size-3" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 w-full">{children}</main>

      {/* ── Minimalist Clean Modern Footer ── */}
      <footer className="border-t border-border/60 bg-card/30 mt-auto py-8 sm:py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          {/* Brand & Tagline */}
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center">
              <img
                src="/logo.svg"
                alt="BlogX"
                className="h-6 w-auto dark:hidden"
              />
              <img
                src="/logo-dark.svg"
                alt="BlogX"
                className="h-6 w-auto hidden dark:block"
              />
            </Link>
            <span className="hidden sm:inline text-border">•</span>
            <span className="hidden sm:inline">
              Share thoughts, stories, and ideas.
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-5 font-medium">
            <Link
              href="/about"
              className="hover:text-foreground transition-colors"
            >
              About
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/"
              className="hover:text-foreground transition-colors"
            >
              Feed
            </Link>
          </div>

          {/* Copyright */}
          <p>© {new Date().getFullYear()} BlogX</p>
        </div>
      </footer>
    </div>
  );
}
