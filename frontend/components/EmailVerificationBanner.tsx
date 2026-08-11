"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, RefreshCw, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmailVerificationBanner() {
  const { user, resendVerification } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => (c > 1 ? c - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!user || user.is_email_verified || dismissed) {
    return null;
  }

  const handleResend = async () => {
    if (cooldown > 0 || sending) return;
    setSending(true);
    try {
      await resendVerification();
      setCooldown(60);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="m-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-foreground text-xs flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
      <div className="flex items-center gap-2.5 overflow-hidden">
        <div className="size-7 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Mail className="size-4" />
        </div>
        <p className="truncate text-xs">
          Please verify your email (<span className="font-semibold text-foreground">{user.email}</span>) to secure your account.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={handleResend}
          disabled={cooldown > 0 || sending}
          className="h-7 text-[11px] rounded-full font-bold border-amber-500/40 hover:bg-amber-500/10 px-3 cursor-pointer"
        >
          <RefreshCw className={`size-3 mr-1 ${sending ? "animate-spin" : ""}`} />
          {cooldown > 0 ? `Resend (${cooldown}s)` : "Resend Link"}
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-full hover:bg-muted/50"
          aria-label="Dismiss banner"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
