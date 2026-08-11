"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Once auth check is done and user is logged in, redirect silently
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  // Never block rendering — always show the page immediately.
  // If the user is authenticated, the useEffect above redirects them.
  // This prevents the blank "loading" screen on /login and /signup.
  if (user) return null;

  return <>{children}</>;
}
