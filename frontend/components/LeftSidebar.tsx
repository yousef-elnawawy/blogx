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
  PenSquare,
  Search,
  Sun,
  Moon,
  AtSign,
  Bell,
  BookOpen,
  FileText,
  Plus,
  Users,
  MessageCircle,
  Layers,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import UserBadges from "@/components/ui/UserBadges";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PostEditorDialog from "./create-post/PostEditorDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useTheme } from "next-themes";
import { getAvatarUrl, getAvatarGradient, getInitials } from "@/lib/utils";
import { toast } from "sonner";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: number;
  colorClass: string;
  activeClass: string;
  hoverClass: string;
  iconActiveClass: string;
}

const mainNavItems: NavItem[] = [
  {
    label: "Feed",
    href: "/",
    icon: Home,
    colorClass: "nav-item-feed",
    activeClass: "nav-item-feed-active",
    hoverClass: "nav-item-feed-hover",
    iconActiveClass: "nav-item-feed stroke-[2.5]",
  },
  {
    label: "Blog",
    href: "/blogs",
    icon: BookOpen,
    colorClass: "nav-item-blogs",
    activeClass: "nav-item-blogs-active",
    hoverClass: "nav-item-blogs-hover",
    iconActiveClass: "nav-item-blogs stroke-[2.5]",
  },
  {
    label: "Series",
    href: "/series",
    icon: Layers,
    colorClass: "nav-item-feed",
    activeClass: "nav-item-feed-active",
    hoverClass: "nav-item-feed-hover",
    iconActiveClass: "nav-item-feed stroke-[2.5]",
  },
  {
    label: "Communities",
    href: "/communities",
    icon: Users,
    colorClass: "nav-item-following",
    activeClass: "nav-item-following-active",
    hoverClass: "nav-item-following-hover",
    iconActiveClass: "nav-item-following stroke-[2.5]",
  },
  {
    label: "Explore",
    href: "/search",
    icon: Search,
    colorClass: "nav-item-explore",
    activeClass: "nav-item-explore-active",
    hoverClass: "nav-item-explore-hover",
    iconActiveClass: "nav-item-explore stroke-[2.5]",
  },
];

const activityNavItems: NavItem[] = [
  {
    label: "Messages",
    href: "/messages",
    icon: MessageCircle,
    colorClass: "nav-item-mentions",
    activeClass: "nav-item-mentions-active",
    hoverClass: "nav-item-mentions-hover",
    iconActiveClass: "nav-item-mentions stroke-[2.5]",
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    colorClass: "nav-item-notifications",
    activeClass: "nav-item-notifications-active",
    hoverClass: "nav-item-notifications-hover",
    iconActiveClass: "nav-item-notifications stroke-[2.5]",
  },
  {
    label: "Mentions",
    href: "/mentions",
    icon: AtSign,
    colorClass: "nav-item-mentions",
    activeClass: "nav-item-mentions-active",
    hoverClass: "nav-item-mentions-hover",
    iconActiveClass: "nav-item-mentions stroke-[2.5]",
  },
  {
    label: "Following",
    href: "/following",
    icon: UserCheck,
    colorClass: "nav-item-following",
    activeClass: "nav-item-following-active",
    hoverClass: "nav-item-following-hover",
    iconActiveClass: "nav-item-following stroke-[2.5]",
  },
];

const savedNavItems: NavItem[] = [
  {
    label: "Likes",
    href: "/likes",
    icon: Heart,
    colorClass: "nav-item-likes",
    activeClass: "nav-item-likes-active",
    hoverClass: "nav-item-likes-hover",
    iconActiveClass: "nav-item-likes fill-current stroke-[2.5]",
  },
  {
    label: "Bookmarks",
    href: "/bookmarks",
    icon: Bookmark,
    colorClass: "nav-item-bookmarks",
    activeClass: "nav-item-bookmarks-active",
    hoverClass: "nav-item-bookmarks-hover",
    iconActiveClass: "nav-item-bookmarks fill-current stroke-[2.5]",
  },
];

const accountNavItems: NavItem[] = [
  {
    label: "Profile",
    href: "/profile",
    icon: User,
    colorClass: "nav-item-profile",
    activeClass: "nav-item-profile-active",
    hoverClass: "nav-item-profile-hover",
    iconActiveClass: "nav-item-profile stroke-[2.5]",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    colorClass: "nav-item-settings",
    activeClass: "nav-item-settings-active",
    hoverClass: "nav-item-settings-hover",
    iconActiveClass: "nav-item-settings stroke-[2.5]",
  },
];

export default function LeftSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { setTheme, resolvedTheme } = useTheme();
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setLogoutDialogOpen(false);
      toast.success("Logged out successfully");
      router.push("/login");
    } catch {
      toast.error("Failed to log out");
    }
  };

  const avatarUrl = getAvatarUrl(user?.avatar);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/profile" && user) {
      return (
        pathname === `/u/${user.username}` ||
        pathname === `/@${user.username}` ||
        pathname === "/profile"
      );
    }
    return pathname.startsWith(href);
  };

  const getNavHref = (item: NavItem) => {
    if (item.href === "/profile" && user) {
      return `/@${user.username}`;
    }
    return item.href;
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    const isNotifications = item.href === "/notifications";

    return (
      <li key={item.href}>
        <Link
          href={getNavHref(item)}
          className={`group flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] transition-all duration-150 ${active
              ? "bg-primary/10 text-primary font-bold shadow-2xs"
              : "text-foreground/80 hover:text-foreground hover:bg-muted/60 font-medium"
            }`}
        >
          <div className="relative shrink-0">
            <Icon
              className={`size-[19px] transition-transform duration-150 group-hover:scale-105 ${active ? "text-primary stroke-[2.5]" : "text-muted-foreground group-hover:text-foreground"
                }`}
              strokeWidth={active ? 2.5 : 2}
            />
            {isNotifications && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 size-2 rounded-full bg-red-500 ring-2 ring-background" />
            )}
          </div>
          <span className="truncate">{item.label}</span>

          {isNotifications && unreadCount > 0 && (
            <span className="ml-auto text-[10px] font-black px-1.5 py-0.2 rounded-full bg-red-500 text-white shadow-2xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <aside
      className="fixed left-0 top-0 z-40 hidden lg:flex flex-col h-screen border-r border-border bg-background/95 backdrop-blur-sm overflow-y-auto select-none"
      style={{ width: "var(--left-sidebar-width, 224px)" }}
    >
      {/* Brand Logo Header */}
      <div className="px-4 pt-4 pb-2">
        <Link href="/" className="inline-block hover:opacity-90 transition-opacity">
          <img src="/logo.svg" alt="BlogX" className="h-7 w-auto dark:hidden" />
          <img src="/logo-dark.svg" alt="BlogX" className="h-7 w-auto hidden dark:block" />
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2 py-2">
        <ul className="space-y-0.5">
          {/* Main Group */}
          {mainNavItems.map(renderNavItem)}

          {/* Divider */}
          <li className="py-1">
            <div className="border-t border-border/40 mx-2" />
          </li>

          {/* Activity Group */}
          {activityNavItems.map(renderNavItem)}

          {/* Divider */}
          <li className="py-1">
            <div className="border-t border-border/40 mx-2" />
          </li>

          {/* Saved Group */}
          {savedNavItems.map(renderNavItem)}

          {/* Divider */}
          <li className="py-1">
            <div className="border-t border-border/40 mx-2" />
          </li>

          {/* Account Group */}
          {accountNavItems.map(renderNavItem)}
        </ul>

        {/* Action Buttons */}
        {user && (
          <div className="mt-4 px-1 space-y-1.5">
            <Button
              onClick={() => setCreatePostOpen(true)}
              className="w-full h-9 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-[13px] font-bold shadow-xs hover:shadow-sm transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PenSquare className="size-3.5" />
              <span>Create Post</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push("/blogs/new")}
              className="w-full h-8 rounded-md border-border/70 hover:border-primary/50 text-xs font-semibold text-foreground/80 hover:text-primary hover:bg-muted/50 transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="size-3.5 text-primary" />
              <span>Write Blog</span>
            </Button>
          </div>
        )}
      </nav>

      {/* User / Bottom Footer Section */}
      <div className="border-t border-border p-2">
        {loading ? (
          <div className="flex items-center gap-2.5 px-2 py-2 animate-pulse">
            <div className="size-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="h-2.5 w-14 rounded bg-muted" />
            </div>
          </div>
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full outline-none">
              <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/70 transition-colors cursor-pointer text-start">
                <Avatar className="size-8.5 ring-1.5 ring-border/50 shrink-0">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className={`text-[11px] font-bold ${getAvatarGradient(user.username || user.name)}`}>
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-bold text-foreground truncate">
                      {user.name}
                    </p>
                    {Boolean(user.verified) && <VerifiedBadge size="sm" />}
                    <UserBadges equippedBadges={user.equipped_badges} size="xs" />
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    @{user.username}
                  </p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-52 p-1">
              <div className="px-2.5 py-2 border-b border-border/50">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
                  {Boolean(user.verified) && <VerifiedBadge size="sm" />}
                  <UserBadges equippedBadges={user.equipped_badges} size="xs" />
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">@{user.username}</p>
              </div>
              <div className="py-0.5 space-y-0.5">
                <DropdownMenuItem onClick={() => router.push(`/@${user.username}`)} className="gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer">
                  <User className="size-3.5 text-primary" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/@${user.username}?tab=Drafts`)} className="gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer">
                  <FileText className="size-3.5 text-violet-500" />
                  <span>My Drafts</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="justify-between px-2.5 py-1.5 text-xs font-medium cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {mounted && resolvedTheme === "dark" ? (
                      <Moon className="size-3.5 text-primary" />
                    ) : (
                      <Sun className="size-3.5 text-amber-500" />
                    )}
                    <span>{mounted && resolvedTheme === "dark" ? "Dark Mode" : "Light Mode"}</span>
                  </div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground px-1.5 py-0.5 rounded bg-muted/80">
                    {mounted && resolvedTheme === "dark" ? "Dark" : "Light"}
                  </span>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setLogoutDialogOpen(true)}
                className="gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer"
              >
                <LogOut className="size-3.5" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex flex-col gap-1.5 px-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] text-muted-foreground font-medium">Appearance</span>
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Toggle Theme"
              >
                {mounted && resolvedTheme === "dark" ? (
                  <Moon className="size-3.5 text-primary" />
                ) : (
                  <Sun className="size-3.5 text-amber-500" />
                )}
              </button>
            </div>
            <Button
              onClick={() => router.push("/login")}
              variant="outline"
              size="sm"
              className="w-full h-8 rounded-full text-xs font-semibold"
            >
              Sign In
            </Button>
            <Button
              onClick={() => router.push("/signup")}
              size="sm"
              className="w-full h-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold"
            >
              Get Started
            </Button>
          </div>
        )}
      </div>

      <PostEditorDialog open={createPostOpen} onOpenChange={setCreatePostOpen} />

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleLogout}
            >
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}