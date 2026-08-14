"use client";

import {
  User,
  Shield,
  BadgeCheck,
  Bell,
  Palette,
} from "lucide-react";

interface SettingsCategoriesHubProps {
  onSelectCategory: (category: string) => void;
}

export default function SettingsCategoriesHub({ onSelectCategory }: SettingsCategoriesHubProps) {
  const categories = [
    {
      id: "account",
      label: "Account Info",
      arabicLabel: "معلومات الحساب",
      icon: User,
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border-blue-500/20",
      ringColor: "group-hover:ring-blue-500/40",
    },
    {
      id: "security",
      label: "Security",
      arabicLabel: "الأمان",
      icon: Shield,
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20",
      ringColor: "group-hover:ring-emerald-500/40",
    },
    {
      id: "verification",
      label: "Verification",
      arabicLabel: "التوثيق",
      icon: BadgeCheck,
      color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 border-sky-500/20",
      ringColor: "group-hover:ring-sky-500/40",
    },
    {
      id: "notifications",
      label: "Notifications",
      arabicLabel: "الإشعارات",
      icon: Bell,
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/20",
      ringColor: "group-hover:ring-amber-500/40",
    },
    {
      id: "appearance",
      label: "Appearance",
      arabicLabel: "المظهر والتخصيص",
      icon: Palette,
      color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 border-violet-500/20",
      ringColor: "group-hover:ring-violet-500/40",
    },
  ];

  return (
    <div className="p-6 sm:p-8 max-w-2xl mx-auto">
      {/* Roblox-Style Circular Categories Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8 py-6">
        {categories.map((cat) => {
          const Icon = cat.icon;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className="group flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-200 hover:bg-muted/40 cursor-pointer focus:outline-none"
            >
              {/* Circular Icon Container */}
              <div
                className={`size-20 sm:size-24 rounded-full border-2 flex items-center justify-center transition-all duration-200 group-hover:scale-105 shadow-sm group-active:scale-95 ${cat.color}`}
              >
                <Icon className="size-9 sm:size-10 stroke-[2]" />
              </div>

              {/* Label Underneath */}
              <span className="mt-3 text-sm font-bold text-foreground text-center group-hover:text-primary transition-colors">
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
