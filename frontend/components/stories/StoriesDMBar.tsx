"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn, getAvatarUrl } from "@/lib/utils";
import api from "@/lib/api";
import StoryCreatorModal from "./StoryCreatorModal";
import StoryViewerModal, { UserStoryGroup } from "./StoryViewerModal";

const STORY_RING_GRADIENTS = [
  "bg-linear-to-tr from-amber-500 via-orange-500 to-rose-500",
  "bg-linear-to-tr from-violet-500 via-purple-500 to-indigo-500",
  "bg-linear-to-tr from-emerald-500 via-teal-500 to-cyan-500",
  "bg-linear-to-tr from-rose-500 via-pink-500 to-amber-500",
  "bg-linear-to-tr from-blue-500 via-indigo-500 to-violet-500",
  "bg-linear-to-tr from-amber-600 via-rose-600 to-purple-600",
];

export default function StoriesDMBar() {
  const { user } = useAuth();
  const [storyGroups, setStoryGroups] = useState<UserStoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [creatorOpen, setCreatorOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeViewerUserIndex, setActiveViewerUserIndex] = useState(0);

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
  const hasMyStory = myGroupIndex !== -1;
  const myLatestStory = hasMyStory ? storyGroups[myGroupIndex].stories[0] : null;

  const myAvatarSrc = getAvatarUrl(user?.avatar);

  return (
    <div className="w-full border-b border-border/70 bg-card/25 dark:bg-card/15 backdrop-blur-md py-3 px-4 overflow-hidden shadow-2xs">
      <div className="flex items-center gap-3.5 overflow-x-auto scrollbar-none pb-0.5">
        {/* User's Note / Status Bubble */}
        <div className="flex flex-col items-center gap-1 shrink-0 select-none">
          <div className="relative">
            {/* Note / Status Thought Bubble above avatar */}
            <div
              onClick={() => (hasMyStory ? handleOpenViewer(myGroupIndex) : setCreatorOpen(true))}
              className="max-w-[70px] px-2 py-0.5 mb-1 rounded-full bg-background border border-border/80 text-[10px] text-muted-foreground truncate text-center shadow-2xs cursor-pointer hover:border-primary/50 transition-colors"
            >
              {hasMyStory ? (myLatestStory?.caption || "Story") : "Share status..."}
            </div>

            <div className="relative size-12 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
              {myAvatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={myAvatarSrc} alt="You" className="size-full object-cover rounded-full" />
              ) : (
                <span className="font-bold text-xs">{user?.name?.charAt(0).toUpperCase() || "U"}</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setCreatorOpen(true)}
              className="absolute -bottom-0.5 -right-0.5 size-4.5 rounded-full bg-primary text-primary-foreground border-2 border-background flex items-center justify-center shadow-xs hover:scale-110 active:scale-95 transition-transform cursor-pointer"
            >
              <Plus className="size-2.5 stroke-[3]" />
            </button>
          </div>

          <span className="text-[10px] font-medium text-foreground max-w-[60px] truncate text-center">
            Your status
          </span>
        </div>

        {/* Other Users' Stories / Status Notes */}
        {!loading &&
          storyGroups.map((group, index) => {
            if (user && group.user.id === user.id) return null;
            const latestStory = group.stories[0];
            const ringGradient = STORY_RING_GRADIENTS[index % STORY_RING_GRADIENTS.length];
            const avatarSrc = getAvatarUrl(group.user.avatar);

            return (
              <button
                key={group.user.id}
                type="button"
                onClick={() => handleOpenViewer(index)}
                className="flex flex-col items-center gap-1 shrink-0 select-none group cursor-pointer"
              >
                {/* Status bubble */}
                <div className="max-w-[75px] px-2 py-0.5 mb-1 rounded-full bg-card border border-border/70 text-[10px] text-foreground font-medium truncate text-center shadow-2xs group-hover:border-primary/50 transition-colors">
                  {latestStory?.type === "text" ? latestStory.caption : (latestStory?.caption || "Photo")}
                </div>

                <div
                  className={cn(
                    "size-12 rounded-full p-[2px] transition-all group-hover:scale-105 relative",
                    group.has_unseen
                      ? `${ringGradient} shadow-xs`
                      : "bg-border/60 dark:bg-border/40"
                  )}
                >
                  <div className="size-full rounded-full overflow-hidden bg-background border border-background relative">
                    {avatarSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarSrc} alt={group.user.name} className="size-full object-cover rounded-full" />
                    ) : (
                      <div className="size-full flex items-center justify-center font-bold text-xs bg-muted text-foreground">
                        {group.user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                <span className="text-[10px] font-medium text-foreground/90 max-w-[60px] truncate text-center group-hover:text-primary transition-colors">
                  {group.user.name.split(" ")[0]}
                </span>
              </button>
            );
          })}
      </div>

      <StoryCreatorModal
        open={creatorOpen}
        onOpenChange={setCreatorOpen}
        onStoryCreated={fetchStories}
      />

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
