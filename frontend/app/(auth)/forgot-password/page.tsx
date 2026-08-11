"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldGroup } from "@/components/ui/field";
import * as authService from "@/services/auth";
import { toast } from "sonner";
import {
  KeyRound,
  Mail,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Send,
  ShieldCheck,
} from "lucide-react";
import axios from "axios";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [testResetUrl, setTestResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setIsLoading(true);

    try {
      const data = await authService.forgotPassword(email.trim());
      setSubmitted(true);
      if (data.test_reset_url) {
        setTestResetUrl(data.test_reset_url);
      }
      toast.success("Instructions sent to your email!");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        toast.error("Too many reset attempts. Please wait a moment.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

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
        <div className="p-8 rounded-3xl border border-border/80 bg-card/80 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex justify-center">
            <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
              <KeyRound className="size-8 stroke-[2.2]" />
            </div>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center space-y-1.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Forgot Password?
                </h1>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No worries! Enter your account email address and we&apos;ll send you a secure link to reset it.
                </p>
              </div>

              <FieldGroup>
                <Field>
                  <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                    Email Address
                  </Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      required
                      autoFocus
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 rounded-xl border-border bg-background/80 py-5 text-sm focus:border-ring focus:ring-ring/20"
                    />
                  </div>
                  {error && <p className="text-xs text-destructive mt-1">{error}</p>}
                </Field>

                <Button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full rounded-xl font-semibold py-6 text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Sending Instructions...
                    </>
                  ) : (
                    <>
                      <Send className="size-4 mr-2" />
                      Send Reset Instructions
                    </>
                  )}
                </Button>
              </FieldGroup>
            </form>
          ) : (
            <div className="text-center space-y-4 animate-in zoom-in-95 duration-300">
              <div className="size-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto ring-4 ring-emerald-500/10">
                <CheckCircle2 className="size-7" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-bold text-foreground">Check Your Email</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We sent a recovery link to <span className="font-semibold text-foreground">{email}</span>.
                  Check your inbox and spam folder.
                </p>
              </div>

              {testResetUrl && (
                <div className="p-3 rounded-xl bg-muted/60 border border-border text-left text-xs space-y-1.5">
                  <div className="font-semibold text-primary flex items-center gap-1.5">
                    <ShieldCheck className="size-4" /> Quick Reset Link (Dev Mode):
                  </div>
                  <a
                    href={testResetUrl}
                    className="text-[11px] text-muted-foreground hover:text-foreground break-all underline block"
                  >
                    {testResetUrl}
                  </a>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                }}
                className="w-full rounded-xl border-border hover:bg-accent py-5 text-xs font-semibold"
              >
                Send to a different email
              </Button>
            </div>
          )}

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              <ArrowLeft className="size-3.5 mr-1.5" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
