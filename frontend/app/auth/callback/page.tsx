"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import * as authService from "@/services/auth";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const ticket = searchParams.get("ticket");
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (ticket) {
      // Clean query parameters from URL history immediately
      window.history.replaceState({}, document.title, "/auth/callback");

      // Exchange single-use secure ticket for session/token
      authService
        .exchangeOAuthTicket(ticket)
        .then(async () => {
          await refreshUser();
          toast.success("Successfully logged in with Google!");
          router.replace("/");
        })
        .catch(() => {
          toast.error("Failed to authenticate with Google. Please try again.");
          router.replace("/login");
        });
    } else if (token) {
      // Backward compatibility fallback: clean URL immediately
      window.history.replaceState({}, document.title, "/auth/callback");
      localStorage.setItem("auth_token", token);
      refreshUser()
        .then(() => {
          toast.success("Successfully logged in!");
          router.replace("/");
        })
        .catch(() => {
          toast.error("Authentication failed.");
          router.replace("/login");
        });
    } else if (error) {
      toast.error("Google sign-in was cancelled or failed.");
      router.replace("/login");
    } else {
      router.replace("/login");
    }
  }, [searchParams, refreshUser, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
      <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
        <ShieldCheck className="size-8 animate-pulse" />
      </div>
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin text-primary" />
        <span>Securing your session with Google...</span>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="text-sm font-medium">Securing session...</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
