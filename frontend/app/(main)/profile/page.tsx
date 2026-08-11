"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * Legacy /profile route — redirects to /@username.
 * Kept for backward compatibility (e.g. old bookmarks).
 */
export default function ProfileRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace(`/@${user.username}`);
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  );
}