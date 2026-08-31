"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn, getAvatarUrl } from "@/lib/utils";
import api from "@/lib/api";
import StoryCreatorModal from "./StoryCreatorModal";
import StoryViewerModal, { UserStoryGroup } from "./StoryViewerModal";

// Modern Dynamic Story Gradient Ring
const STORY_UNSEEN_RING = "bg-gradient-to-tr from-primary via-primary/80 to-rose-500";
const STORY_SEEN_RING = "bg-border";

export default function StoriesTray() {
  const { user } = useAuth();
  const [storyGroups, setStoryGroups] = useState<UserStoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [creatorOpen, setCreatorOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeViewerUserIndex, setActiveViewerUserIndex] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const fetchStories = async () => {
    try {
      const res = await api.get("/api/stories/feed");
      setStoryGroups(res.data.stories || []);
    } catch {
      setStoryGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [storyGroups]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const offset = direction === "left" ? -240 : 240;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    setTimeout(checkScroll, 300);
  };

  const handleOpenViewer = (userIndex: number) => {
    setActiveViewerUserIndex(userIndex);
    setViewerOpen(true);
  };

  const handleStoryViewed = (userIndex: number, storyId: number) => {
    setStoryGroups((prev) => {
      const next = [...prev];
      if (next[userIndex]) {
        const updatedStories = next[userIndex].stories.map((s) =>
          s.id === storyId ? { ...s, is_viewed: true } : s
        );
        const stillHasUnseen = updatedStories.some((s) => !s.is_viewed);
        next[userIndex] = {
          ...next[userIndex],
          has_unseen: stillHasUnseen,
          stories: updatedStories,
        };
      }
      return next;
    });
  };

  const myGroupIndex = storyGroups.findIndex((g) => user && g.user.id === user.id);
  const myGroup = myGroupIndex !== -1 ? storyGroups[myGroupIndex] : null;
  const hasMyStory = !!myGroup;

  const myAvatarSrc = getAvatarUrl(user?.avatar);

  return (
    <div className="relative w-full border-b border-border/70 bg-background/95 backdrop-blur-md py-3 px-3 sm:px-4 select-none">
      {/* Desktop Scroll Left */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll("left")}
          className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 size-7 rounded-full bg-background/90 hover:bg-background text-foreground shadow-md border border-border items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95"
          aria-label="Scroll left"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}

      {/* Desktop Scroll Right */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll("right")}
          className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 size-7 rounded-full bg-background/90 hover:bg-background text-foreground shadow-md border border-border items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95"
          aria-label="Scroll right"
        >
          <ChevronRight className="size-4" />
        </button>
      )}

      {/* ── Instagram Circular Stories Tray ── */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex items-center gap-3.5 sm:gap-4.5 overflow-x-auto scrollbar-none scroll-smooth pb-0.5"
      >
        {/* ── 1. Your Story (Add or View) ── */}
        <div className="flex flex-col items-center gap-1.5 shrink-0 select-none">
          <div className="relative">
            {hasMyStory ? (
              <button
                type="button"
                onClick={() => handleOpenViewer(myGroupIndex)}
                className={cn(
                  "size-[76px] sm:size-[82px] rounded-full p-[2.5px] transition-opacity hover:opacity-90 active:scale-95 cursor-pointer",
                  STORY_UNSEEN_RING
                )}
              >
                <div className="size-full rounded-full overflow-hidden bg-background p-[2px]">
                  {myAvatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={myAvatarSrc}
                      alt={user?.name || "Your Story"}
                      className="size-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center font-bold text-sm bg-muted text-foreground rounded-full">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCreatorOpen(true)}
                className="size-[76px] sm:size-[82px] rounded-full p-[2.5px] bg-border/80 hover:border-primary transition-colors active:scale-95 cursor-pointer"
              >
                <div className="size-full rounded-full overflow-hidden bg-background p-[2px]">
                  {myAvatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={myAvatarSrc}
                      alt="Your Story"
                      className="size-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center font-bold text-sm bg-muted text-foreground rounded-full">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                </div>
              </button>
            )}

            {/* Dynamic Primary Plus Badge */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCreatorOpen(true);
              }}
              className="absolute bottom-0 right-0 size-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-background flex items-center justify-center shadow-sm active:scale-90 transition-transform cursor-pointer"
              title="Add story"
            >
              <Plus className="size-4 stroke-[3]" />
            </button>
          </div>

          <span className="text-[11px] font-medium text-foreground/90 max-w-[78px] sm:max-w-[84px] truncate text-center">
            Your story
          </span>
        </div>

        {/* ── 2. Other Users' Stories ── */}
        {loading ? (
          <div className="flex items-center gap-3.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 animate-pulse">
                <div className="size-[76px] sm:size-[82px] rounded-full bg-muted/60" />
                <div className="h-2.5 w-14 rounded bg-muted/60" />
              </div>
            ))}
          </div>
        ) : (
          storyGroups.map((group, index) => {
            if (user && group.user.id === user.id) return null; // Rendered as first item

            const authorAvatar = getAvatarUrl(group.user.avatar);

            return (
              <button
                key={group.user.id}
                type="button"
                onClick={() => handleOpenViewer(index)}
                className="flex flex-col items-center gap-1.5 shrink-0 select-none group cursor-pointer"
              >
                {/* Dynamic Ring (No hover zoom) */}
                <div
                  className={cn(
                    "size-[76px] sm:size-[82px] rounded-full p-[2.5px] transition-opacity hover:opacity-90 active:scale-95",
                    group.has_unseen ? STORY_UNSEEN_RING : STORY_SEEN_RING
                  )}
                >
                  <div className="size-full rounded-full overflow-hidden bg-background p-[2px]">
                    {authorAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={authorAvatar}
                        alt={group.user.name}
                        className="size-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center font-bold text-sm bg-muted text-foreground rounded-full">
                        {group.user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                <span className="text-[11px] font-medium text-foreground/90 max-w-[78px] sm:max-w-[84px] truncate text-center group-hover:text-primary transition-colors">
                  {group.user.name.split(" ")[0]}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Creator Modal */}
      <StoryCreatorModal
        open={creatorOpen}
        onOpenChange={setCreatorOpen}
        onStoryCreated={fetchStories}
      />

      {/* Viewer Modal */}
      <StoryViewerModal
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        userGroups={storyGroups}
        initialUserIndex={activeViewerUserIndex}
        onStoryDeleted={fetchStories}
        onStoryViewed={handleStoryViewed}
      />
    </div>
  );
}
