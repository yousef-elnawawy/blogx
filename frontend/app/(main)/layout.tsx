"use client";

import { usePathname } from "next/navigation";
import LeftSidebar from "@/components/LeftSidebar";
import MobileHeader from "@/components/MobileHeader";
import MobileBottomBar from "@/components/MobileBottomBar";
import TrendingHashtagsSidebar from "@/components/TrendingHashtagsSidebar";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import WelcomeOnboardingModal from "@/components/WelcomeOnboardingModal";
import AuthRouteGuard from "@/components/auth/AuthRouteGuard";
import PageTransition from "@/components/ui/PageTransition";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Conversation detail pages need a true full-screen layout.
  // The normal min-h-screen wrapper + PageTransition wrapper break h-screen
  // sizing inside the page, causing scroll and visibility issues.
  const isConversationPage = /^\/messages\/[^/]+/.test(pathname);

  return (
    <div className="blogx-layout">
      {/* Welcome Onboarding Modal for New Registered Users */}
      <WelcomeOnboardingModal />

      {/* Left Sidebar - Navigation (Desktop) */}
      <LeftSidebar />

      {/* Center Content */}
      <main className="blogx-center">
        {isConversationPage ? (
          // Full-screen conversation layout — no extra wrappers or padding
          <AuthRouteGuard>
            {children}
          </AuthRouteGuard>
        ) : (
          <div className="min-h-screen border-x border-border/50 pb-16 lg:pb-0">
            <MobileHeader />
            <EmailVerificationBanner />
            <AuthRouteGuard>
              <PageTransition>{children}</PageTransition>
            </AuthRouteGuard>
          </div>
        )}
      </main>

      {/* Right Sidebar - Trending Hashtags (xl+) */}
      <TrendingHashtagsSidebar />

      {/* Mobile Bottom Bar */}
      <MobileBottomBar />
    </div>
  );
}