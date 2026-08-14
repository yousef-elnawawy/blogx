"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ArrowLeft, BadgeCheck } from "lucide-react";
import AppearanceSettings from "@/components/settings/AppearanceSettings";
import AccountSettings from "@/components/settings/AccountSettings";
import SecuritySettings from "@/components/settings/SecuritySettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import VerificationTab from "@/components/settings/VerificationTab";

interface PageProps {
  params: Promise<{ tab: string }>;
}

export default function DynamicSettingsSubpage({ params }: PageProps) {
  const resolvedParams = use(params);
  const tab = resolvedParams.tab;
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

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

  if (tab === "appearance" || tab === "customization") {
    return <AppearanceSettings onBack={handleBackToHub} />;
  }

  if (tab === "account" || tab === "profile") {
    return <AccountSettings onBack={handleBackToHub} />;
  }

  if (tab === "security" || tab === "privacy") {
    return <SecuritySettings onBack={handleBackToHub} />;
  }

  if (tab === "notifications") {
    return <NotificationSettings onBack={handleBackToHub} />;
  }

  if (tab === "verification" || tab === "verify") {
    return (
      <div className="min-h-screen pb-24 divide-y divide-border/60 animate-in fade-in duration-200">
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
                <div className="size-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-xs">
                  <BadgeCheck className="size-4" />
                </div>
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

  // Fallback: redirect back to /settings
  router.replace("/settings");
  return null;
}
