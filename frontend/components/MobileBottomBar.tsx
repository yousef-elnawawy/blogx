"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Bookmark, User, Plus, Search, AtSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import PostEditorDialog from "./create-post/PostEditorDialog";

const navItems = [
  { label: "Feed", href: "/", icon: Home, activeColor: "nav-item-feed font-bold" },
  { label: "Search", href: "/search", icon: Search, activeColor: "nav-item-explore font-bold" },
  { label: "Mentions", href: "/mentions", icon: AtSign, activeColor: "nav-item-mentions font-bold" },
  { label: "Bookmarks", href: "/bookmarks", icon: Bookmark, activeColor: "nav-item-bookmarks font-bold" },
  { label: "Profile", href: "/profile", icon: User, activeColor: "nav-item-profile font-bold" },
];

export default function MobileBottomBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [createPostOpen, setCreatePostOpen] = useState(false);

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

  const getNavHref = (item: (typeof navItems)[0]) => {
    if (item.href === "/profile" && user) {
      return `/@${user.username}`;
    }
    return item.href;
  };

  return (
    <>
      {/* Floating Create Post Button (mobile & tablet < 1024px) */}
      {user && (
        <button
          onClick={() => setCreatePostOpen(true)}
          className="fixed bottom-20 right-4 z-50 lg:hidden flex items-center justify-center size-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all duration-200 active:scale-95 cursor-pointer"
        >
          <Plus className="size-6" strokeWidth={2.5} />
        </button>
      )}

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-background/95 backdrop-blur-md safe-area-bottom">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={getNavHref(item)}
                className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                  active
                    ? item.activeColor
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon
                  className="size-[22px]"
                  strokeWidth={active ? 2.5 : 2}
                />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Create Post Dialog */}
      <PostEditorDialog
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
      />
    </>
  );
}
