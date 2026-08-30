"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ArrowLeft, BadgeCheck } from "lucide-react";
import SettingsCategoriesHub from "@/components/settings/SettingsCategoriesHub";
import AppearanceSettings from "@/components/settings/AppearanceSettings";
import AccountSettings from "@/components/settings/AccountSettings";
import SecuritySettings from "@/components/settings/SecuritySettings";
import PrivacySettings from "@/components/settings/PrivacySettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import VerificationTab from "@/components/settings/VerificationTab";

type SettingsTab = "account" | "security" | "privacy" | "verification" | "notifications" | "appearance";

const VALID_TABS: SettingsTab[] = ["account", "security", "privacy", "verification", "notifications", "appearance"];

function SettingsContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as SettingsTab | null;

  const activeTab: SettingsTab | null =
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : null;

  useEffect(() => {
    document.title = "Account Settings & Privacy / BlogX";
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleSelectCategory = (categoryId: string) => {
    router.push(`/settings?tab=${categoryId}`);
  };

  const handleBackToHub = () => {
    router.push("/settings");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // 1. If no tab is selected, render the Category Circles Hub
  if (!activeTab) {
    return (
      <div className="min-h-screen pb-24">
        {/* Sticky Header */}
        <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 -ml-1 rounded-full hover:bg-muted transition-colors text-foreground cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight font-[family-name:var(--font-fraunces)]">
              Settings
            </h1>
          </div>
        </div>

        <SettingsCategoriesHub onSelectCategory={handleSelectCategory} />
      </div>
    );
  }

  // 2. Render Appearance & Customization Dedicated Page
  if (activeTab === "appearance") {
    return <AppearanceSettings onBack={handleBackToHub} />;
  }

  // 3. Render Account & Profile Dedicated Page
  if (activeTab === "account") {
    return <AccountSettings onBack={handleBackToHub} />;
  }

  // 4. Render Security Dedicated Page
  if (activeTab === "security") {
    return <SecuritySettings onBack={handleBackToHub} />;
  }

  // 5. Render Privacy & Safety Dedicated Page
  if (activeTab === "privacy") {
    return <PrivacySettings onBack={handleBackToHub} />;
  }

  // 6. Render Notification Preferences Dedicated Page
  if (activeTab === "notifications") {
    return <NotificationSettings onBack={handleBackToHub} />;
  }

  // 6. Render Verification & Badges Dedicated Page
  if (activeTab === "verification") {
    return (
      <div className="min-h-screen pb-24 divide-y divide-border/60 animate-in fade-in duration-200">
        {/* Top Sticky Header */}
        <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToHub}
                className="p-1.5 -ml-1 rounded-full hover:bg-muted transition-colors text-foreground cursor-pointer flex items-center gap-1.5 group"
                aria-label="Back to Settings"
              >
                <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-0.5" />
              </button>
              <div className="flex items-center gap-2.5">
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">
                    Verification & Badges
                  </h1>
                  <p className="text-[11px] text-muted-foreground">
                    Official verification status and creator application
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <VerificationTab />
        </div>
      </div>
    );
  }

  return null;
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center">
          <Loader2 className="size-8 animate-spin mx-auto text-primary" />
          <p className="mt-3 text-xs text-muted-foreground">Loading settings...</p>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
