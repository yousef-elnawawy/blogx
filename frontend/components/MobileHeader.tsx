"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  UserCheck,
  Bookmark,
  User,
  Heart,
  Settings,
  LogOut,
  Search,
  Sun,
  Moon,
  AtSign,
  BadgeCheck,
  Menu,
  X,
  Sparkles,
  Bell,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useTheme } from "next-themes";
import { getAvatarUrl } from "@/lib/utils";
import { toast } from "sonner";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function MobileHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { setTheme, resolvedTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setDrawerOpen(false);
      toast.success("Logged out successfully");
      router.push("/login");
    } catch {
      toast.error("Failed to log out");
    }
  };

  const avatarUrl = getAvatarUrl(user?.avatar);

  const navLinks = [
    { label: "Feed", href: "/", icon: Home, color: "primary" },
    {
      label: "Notifications",
      href: "/notifications",
      icon: Bell,
      color: "amber",
      activeColor: "text-amber-500 bg-amber-500/10 font-bold",
      hoverColor: "hover:bg-amber-500/10 hover:text-amber-500",
      iconColor: "text-amber-500",
      badgeCount: unreadCount,
    },
    { label: "Search", href: "/search", icon: Search, color: "primary" },
    { label: "Following", href: "/following", icon: UserCheck, color: "primary" },
    {
      label: "Mentions",
      href: "/mentions",
      icon: AtSign,
      color: "blue",
      activeColor: "text-blue-600 bg-blue-500/10 font-bold",
      hoverColor: "hover:bg-blue-500/10 hover:text-blue-600",
      iconColor: "text-blue-600",
    },
    {
      label: "Likes",
      href: "/likes",
      icon: Heart,
      color: "red",
      activeColor: "text-red-500 bg-red-500/10 font-bold",
      hoverColor: "hover:bg-red-500/10 hover:text-red-500",
      iconColor: "text-red-500",
    },
    {
      label: "Bookmarks",
      href: "/bookmarks",
      icon: Bookmark,
      color: "violet",
      activeColor: "text-violet-500 bg-violet-500/10 font-bold",
      hoverColor: "hover:bg-violet-500/10 hover:text-violet-500",
      iconColor: "text-violet-500",
    },
    {
      label: "Profile",
      href: user ? `/@${user.username}` : "/profile",
      icon: User,
      color: "primary",
    },
    { label: "Settings", href: "/settings", icon: Settings, color: "primary" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (user && href === `/@${user.username}`) {
      return (
        pathname === `/u/${user.username}` ||
        pathname === `/@${user.username}` ||
        pathname === "/profile"
      );
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Top Mobile Bar (Visible only on < lg) */}
      <header className="sticky top-0 z-40 lg:hidden flex items-center justify-between px-4 h-14 border-b border-border/80 bg-background/95 backdrop-blur-md">
        {/* Left: User Avatar or Menu */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 focus:outline-none cursor-pointer"
          aria-label="Open navigation menu"
        >
          {user ? (
            <Avatar className="size-8 ring-2 ring-primary/20">
              <AvatarImage src={avatarUrl} alt={user.name} />
              <AvatarFallback className="bg-muted text-[10px] font-bold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="size-8 rounded-full bg-muted flex items-center justify-center text-foreground">
              <Menu className="size-4" />
            </div>
          )}
        </button>

        {/* Center: BlogX Logo */}
        <Link href="/" className="inline-block">
          <img src="/logo.svg" alt="BlogX" className="h-6 w-auto dark:hidden" />
          <img src="/logo-dark.svg" alt="BlogX" className="h-6 w-auto hidden dark:block" />
        </Link>

        {/* Right: Notifications & Theme Toggle */}
        <div className="flex items-center gap-1.5">
          {user && (
            <Link
              href="/notifications"
              className="relative size-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title="Notifications"
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="size-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Toggle Theme"
          >
            {mounted && resolvedTheme === "dark" ? (
              <Moon className="size-4 text-primary" />
            ) : (
              <Sun className="size-4 text-amber-500" />
            )}
          </button>
        </div>
      </header>

      {/* Slide-out Mobile Navigation Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop overlay */}
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200"
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs h-full bg-background border-r border-border flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-250">
            {/* Drawer Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <Link
                href="/"
                onClick={() => setDrawerOpen(false)}
                className="inline-block"
              >
                <img src="/logo.svg" alt="BlogX" className="h-6 w-auto dark:hidden" />
                <img src="/logo-dark.svg" alt="BlogX" className="h-6 w-auto hidden dark:block" />
              </Link>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* User Profile Card in Drawer */}
            {user ? (
              <div className="p-4 border-b border-border/60 bg-muted/20">
                <Link
                  href={`/@${user.username}`}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 group"
                >
                  <Avatar className="size-11 ring-2 ring-primary/20">
                    <AvatarImage src={avatarUrl} alt={user.name} />
                    <AvatarFallback className="bg-muted text-xs font-bold">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-bold text-foreground truncate group-hover:underline">
                        {user.name}
                      </p>
                      {Boolean(user.verified) && <VerifiedBadge size="sm" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  </div>
                </Link>
              </div>
            ) : (
              <div className="p-4 border-b border-border/60 space-y-2">
                <Button
                  onClick={() => {
                    setDrawerOpen(false);
                    router.push("/login");
                  }}
                  variant="outline"
                  className="w-full rounded-full text-xs font-bold"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => {
                    setDrawerOpen(false);
                    router.push("/signup");
                  }}
                  className="w-full rounded-full text-xs font-bold bg-primary text-primary-foreground"
                >
                  Get Started
                </Button>
              </div>
            )}

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navLinks.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                const activeClass =
                  item.activeColor || "bg-primary/10 text-primary font-bold";
                const hoverClass =
                  item.hoverColor || "hover:bg-muted hover:text-foreground";
                const iconColor = item.iconColor || "text-primary";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? activeClass
                        : `text-foreground/80 ${hoverClass}`
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <Icon
                        className={`size-5 ${active ? iconColor : ""}`}
                        strokeWidth={active ? 2.5 : 2}
                      />
                      <span>{item.label}</span>
                    </div>

                    {Boolean(item.badgeCount && item.badgeCount > 0) && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                        {item.badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Drawer Footer */}
            {user && (
              <div className="p-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="size-4" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
