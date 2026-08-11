"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import * as authService from "@/services/auth";
import { toast } from "sonner";
import {
  CheckCircle2,
  MailCheck,
  Loader2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUser, resendVerification } = useAuth();

  const id = searchParams.get("id");
  const hash = searchParams.get("hash");

  const [verifying, setVerifying] = useState(!!id && !!hash);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => (c > 1 ? c - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (id && hash) {
      authService
        .verifyEmail(id, hash)
        .then(() => {
          setSuccess(true);
          refreshUser();
          toast.success("Email verified successfully! Welcome to BlogX.");
        })
        .catch(() => {
          setError("This verification link is invalid or has already expired.");
        })
        .finally(() => {
          setVerifying(false);
        });
    }
  }, [id, hash, refreshUser]);

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await resendVerification();
      setCooldown(60);
    } catch {
      toast.error("Could not send verification email. Please try again later.");
    }
  };

  return (
    <div className="p-8 rounded-3xl border border-border/80 bg-card/80 backdrop-blur-xl shadow-2xl space-y-6 text-center">
      {verifying ? (
        <div className="space-y-4 py-4">
          <Loader2 className="size-10 animate-spin text-primary mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Verifying Email...</h1>
          <p className="text-xs text-muted-foreground">Confirming your account credentials</p>
        </div>
      ) : success ? (
        <div className="space-y-5 animate-in zoom-in-95 duration-300">
          <div className="size-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto ring-4 ring-emerald-500/10">
            <CheckCircle2 className="size-8 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Email Verified!</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your BlogX account is now officially verified. You have full access to publish posts and interact.
            </p>
          </div>
          <Button
            onClick={() => router.push("/")}
            className="w-full rounded-xl font-semibold py-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 cursor-pointer"
          >
            Go to BlogX Feed
            <ArrowRight className="size-4 ml-2" />
          </Button>
        </div>
      ) : error ? (
        <div className="space-y-5">
          <div className="size-16 rounded-full bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="size-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Verification Failed</h1>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
          <Button
            onClick={handleResend}
            disabled={cooldown > 0}
            className="w-full rounded-xl font-semibold py-6"
          >
            {cooldown > 0 ? `Wait (${cooldown}s)` : "Resend Verification Email"}
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-inner">
            <MailCheck className="size-8 stroke-[2.2]" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Verify Your Email</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We sent a verification link to <span className="font-semibold text-foreground">{user?.email || "your email"}</span>.
              Please check your inbox to activate full account features.
            </p>
          </div>
          <Button
            onClick={handleResend}
            disabled={cooldown > 0}
            className="w-full rounded-xl font-semibold py-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 cursor-pointer"
          >
            <RefreshCw className="size-4 mr-2" />
            {cooldown > 0 ? `Resend Available in ${cooldown}s` : "Resend Verification Link"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-10 relative overflow-hidden min-h-svh justify-center items-center bg-background">
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <img
          src="/logo.svg"
          alt=""
          className="w-[min(60vw,450px)] h-auto opacity-[0.03] pointer-events-none select-none dark:hidden"
        />
        <img
          src="/logo-dark.svg"
          alt=""
          className="w-[min(60vw,450px)] h-auto opacity-[0.03] pointer-events-none select-none hidden dark:block"
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Suspense
          fallback={
            <div className="p-8 rounded-3xl border border-border/80 bg-card/80 flex justify-center items-center">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
