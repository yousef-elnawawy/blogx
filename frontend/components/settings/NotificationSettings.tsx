"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/contexts/NotificationContext";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Bell,
  Heart,
  MessageSquare,
  UserPlus,
  AtSign,
  Repeat2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationSettingsProps {
  onBack: () => void;
}

export default function NotificationSettings({ onBack }: NotificationSettingsProps) {
  const router = useRouter();
  const { preferences, loadingPreferences, updatePreference, fetchPreferences } = useNotifications();

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return (
    <div className="min-h-screen pb-24 divide-y divide-border/60 animate-in fade-in duration-200">
      {/* Sticky Header with Back Button */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 rounded-full hover:bg-muted transition-colors text-foreground cursor-pointer"
              aria-label="Back to Settings"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">
              Notification Preferences
            </h1>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/notifications")}
            className="rounded-full text-xs font-semibold h-8 gap-1.5 cursor-pointer border-border"
          >
            <Bell className="size-3.5 text-amber-500" />
            <span>Open Feed</span>
          </Button>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        <div>
          <h3 className="text-sm font-bold text-foreground">
            Notification Preferences
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose which notifications you receive in real-time across BlogX.
          </p>
        </div>

        {/* Preferences List */}
        <div className="space-y-3">
          {[
            {
              key: "likes" as const,
              title: "Likes & Reactions",
              desc: "Get notified when someone likes your posts or comments",
              icon: Heart,
              iconColor: "text-red-500",
              bgColor: "bg-red-500/10",
            },
            {
              key: "comments" as const,
              title: "Comments & Replies",
              desc: "Get notified when someone comments on your post or replies to your comment",
              icon: MessageSquare,
              iconColor: "text-teal-500",
              bgColor: "bg-teal-500/10",
            },
            {
              key: "follows" as const,
              title: "New Followers",
              desc: "Get notified when someone starts following your profile",
              icon: UserPlus,
              iconColor: "text-amber-500",
              bgColor: "bg-amber-500/10",
            },
            {
              key: "mentions" as const,
              title: "Mentions",
              desc: "Get notified when someone tags @you in a post or comment",
              icon: AtSign,
              iconColor: "text-blue-500",
              bgColor: "bg-blue-500/10",
            },
            {
              key: "shares" as const,
              title: "Shares & Reposts",
              desc: "Get notified when someone shares your post with others",
              icon: Repeat2,
              iconColor: "text-cyan-500",
              bgColor: "bg-cyan-500/10",
            },
            {
              key: "milestones" as const,
              title: "Milestones & Achievements",
              desc: "Receive celebrations and certificates when you hit view, post, or follower records",
              icon: Sparkles,
              iconColor: "text-amber-500",
              bgColor: "bg-amber-500/10",
            },
          ].map((item) => {
            const Icon = item.icon;
            const isChecked = preferences[item.key] ?? true;

            return (
              <div
                key={item.key}
                className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-background hover:bg-muted/20 transition-all gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={cn(
                      "size-10 rounded-xl flex items-center justify-center shrink-0",
                      item.bgColor
                    )}
                  >
                    <Icon className={cn("size-5", item.iconColor)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>

                {/* Animated Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isChecked}
                  onClick={() => updatePreference(item.key, !isChecked)}
                  disabled={loadingPreferences}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    isChecked ? "bg-amber-500" : "bg-muted-foreground/30"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                      isChecked ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Status info */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3 text-xs text-muted-foreground">
          <Sparkles className="size-4 text-amber-500 shrink-0 mt-0.5" />
          <p>
            Preferences are synchronized with our real-time engine. Changes apply immediately across all your active devices.
          </p>
        </div>
      </div>
    </div>
  );
}
