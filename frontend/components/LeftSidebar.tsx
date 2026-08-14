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
} from "lucide-react";
import ArticleEditorDialog from "@/components/article/ArticleEditorDialog";
import { Fraunces } from "next/font/google";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
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
import { getAvatarUrl } from "@/lib/utils";
import { toast } from "sonner";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["italic", "normal"],
  variable: "--font-fraunces",
});

interface NavItem {
  label: string;
  href: string;
  icon: any;
  color?: string;
  activeClass?: string;
  hoverClass?: string;
  iconActive?: string;
}

const mainNavItems: NavItem[] = [
  { label: "Feed", href: "/", icon: Home, color: "primary" },
  { label: "Articles", href: "/articles", icon: BookOpen, color: "primary" },
  { label: "Search", href: "/search", icon: Search, color: "primary" },
];

const activityNavItems: NavItem[] = [
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    color: "amber",
    activeClass: "bg-amber-500/10 text-amber-500 font-semibold",
    hoverClass: "hover:bg-amber-500/10 hover:text-amber-500",
    iconActive: "text-amber-500",
  },
  {
    label: "Mentions",
    href: "/mentions",
    icon: AtSign,
    color: "blue",
    activeClass: "bg-blue-500/10 text-blue-600 font-semibold",
    hoverClass: "hover:bg-blue-500/10 hover:text-blue-600",
    iconActive: "text-blue-600",
  },
  { label: "Following", href: "/following", icon: UserCheck, color: "primary" },
];

const savedNavItems: NavItem[] = [
  {
    label: "Likes",
    href: "/likes",
    icon: Heart,
    color: "red",
    activeClass: "bg-red-500/10 text-red-500 font-semibold",
    hoverClass: "hover:bg-red-500/10 hover:text-red-500",
    iconActive: "text-red-500 fill-red-500",
  },
  {
    label: "Bookmarks",
    href: "/bookmarks",
    icon: Bookmark,
    color: "violet",
    activeClass: "bg-violet-500/10 text-violet-500 font-semibold",
    hoverClass: "hover:bg-violet-500/10 hover:text-violet-500",
    iconActive: "text-violet-500 fill-violet-500",
  },
];

const accountNavItems: NavItem[] = [
  { label: "Profile", href: "/profile", icon: User, color: "primary" },
  { label: "Settings", href: "/settings", icon: Settings, color: "primary" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function LeftSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { setTheme, resolvedTheme } = useTheme();
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [articleEditorOpen, setArticleEditorOpen] = useState(false);
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

    const activeClass =
      item.activeClass || "bg-primary/10 text-primary font-semibold";
    const hoverClass =
      item.hoverClass || "hover:bg-muted hover:text-foreground";
    const iconActive = item.iconActive || "text-primary";

    return (
      <li key={item.href}>
        <Link
          href={getNavHref(item)}
          className={`group flex items-center gap-4 rounded-xl px-4 py-3 text-[15px] font-medium transition-all duration-200 ${
            active
              ? activeClass
              : `text-foreground/80 ${hoverClass}`
          }`}
        >
          <div className="relative">
            <Icon
              className={`size-[22px] transition-transform duration-200 group-hover:scale-110 ${
                active ? iconActive : ""
              }`}
              strokeWidth={active ? 2.5 : 2}
            />
            {isNotifications && unreadCount > 0 && (
              <span className="lg:hidden absolute -top-1 -right-1 size-2.5 rounded-full bg-primary ring-2 ring-background" />
            )}
          </div>
          <span className="sidebar-label">{item.label}</span>

          {isNotifications && unreadCount > 0 && (
            <span className="sidebar-label ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground shadow-xs animate-in fade-in zoom-in duration-200">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <aside
      className="fixed left-0 top-0 z-40 hidden lg:flex flex-col h-screen border-r border-border bg-background/95 backdrop-blur-sm overflow-y-auto"
      style={{ width: "var(--left-sidebar-width, 320px)" }}
    >
      <div className="px-6 pt-6 pb-2">
        <Link href="/" className="inline-block">
          <img src="/logo.svg" alt="BlogX" className="h-8 w-auto dark:hidden" />
          <img src="/logo-dark.svg" alt="BlogX" className="h-8 w-auto hidden dark:block" />
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {/* القسم الرئيسي */}
          {mainNavItems.map(renderNavItem)}

          {/* فاصل */}
          <li className="pt-2 pb-1">
            <div className="border-t border-border/60 mx-2" />
          </li>

          {/* التفاعلات */}
          {activityNavItems.map(renderNavItem)}

          {/* فاصل */}
          <li className="pt-2 pb-1">
            <div className="border-t border-border/60 mx-2" />
          </li>

          {/* المحفوظات */}
          {savedNavItems.map(renderNavItem)}

          {/* فاصل */}
          <li className="pt-2 pb-1">
            <div className="border-t border-border/60 mx-2" />
          </li>

          {/* الحساب */}
          {accountNavItems.map(renderNavItem)}
        </ul>

        {user && (
          <div className="mt-5 px-1 space-y-2">
            <Button
              onClick={() => setCreatePostOpen(true)}
              className="w-full h-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 create-post-btn"
            >
              <PenSquare className="size-4 create-post-icon hidden mr-1.5" />
              <span className="create-post-label">Create Post</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setArticleEditorOpen(true)}
              className="w-full h-10 rounded-full border-border/70 hover:border-primary/50 text-xs font-semibold shadow-2xs hover:bg-muted/60 transition-all duration-200"
            >
              <BookOpen className="size-4 mr-1.5 text-primary" />
              <span>Write Article</span>
            </Button>
          </div>
        )}
      </nav>

      <div className="border-t border-border p-3">
        {loading ? (
          <div className="flex items-center gap-3 px-3 py-2 animate-pulse">
            <div className="size-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5 sidebar-label">
              <div className="h-3.5 w-24 rounded bg-muted" />
              <div className="h-3 w-16 rounded bg-muted" />
            </div>
          </div>
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full outline-none">
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted transition-colors cursor-pointer">
                <Avatar className="size-10 ring-2 ring-border/50 shrink-0">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-muted text-xs font-bold text-muted-foreground">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left sidebar-label">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user.name}
                    </p>
                    {Boolean(user.verified) && <VerifiedBadge size="sm" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    @{user.username}
                  </p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" sideOffset={6} className="w-48 p-1 bg-card/95 backdrop-blur-md border border-border shadow-lg rounded-xl text-xs animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="px-2.5 py-1.5 border-b border-border/50">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
                  {Boolean(user.verified) && <VerifiedBadge size="sm" />}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">@{user.username}</p>
              </div>
              <div className="py-0.5 space-y-0.5">
                <DropdownMenuItem onClick={() => router.push(`/@${user.username}`)} className="flex items-center gap-2 py-1.5 px-2.5 text-xs font-medium cursor-pointer rounded-lg">
                  <User className="size-3.5 text-primary" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/@${user.username}?tab=Drafts`)} className="flex items-center gap-2 py-1.5 px-2.5 text-xs font-medium cursor-pointer rounded-lg">
                  <FileText className="size-3.5 text-violet-500" />
                  <span>My Drafts</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="flex items-center justify-between py-1.5 px-2.5 text-xs font-medium cursor-pointer rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {mounted && resolvedTheme === "dark" ? (
                      <Moon className="size-3.5 text-primary" />
                    ) : (
                      <Sun className="size-3.5 text-amber-500" />
                    )}
                    <span>{mounted && resolvedTheme === "dark" ? "Dark Mode" : "Light Mode"}</span>
                  </div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground px-1 py-0.2 rounded bg-muted/80">
                    {mounted && resolvedTheme === "dark" ? "Dark" : "Light"}
                  </span>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator className="my-0.5" />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setLogoutDialogOpen(true)}
                className="flex items-center gap-2 py-1.5 px-2.5 text-xs font-medium cursor-pointer text-destructive focus:text-destructive rounded-lg"
              >
                <LogOut className="size-3.5" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex flex-col gap-2 px-1">
            <div className="flex items-center justify-between px-1 py-1">
              <span className="text-xs text-muted-foreground font-medium">Appearance</span>
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Toggle Theme"
              >
                {mounted && resolvedTheme === "dark" ? (
                  <Moon className="size-4 text-primary" />
                ) : (
                  <Sun className="size-4 text-amber-500" />
                )}
              </button>
            </div>
            <Button
              onClick={() => router.push("/login")}
              variant="outline"
              className="w-full rounded-full"
            >
              Sign In
            </Button>
            <Button
              onClick={() => router.push("/signup")}
              className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </Button>
          </div>
        )}
      </div>

      <PostEditorDialog open={createPostOpen} onOpenChange={setCreatePostOpen} />
      <ArticleEditorDialog open={articleEditorOpen} onOpenChange={setArticleEditorOpen} />

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