"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldGroup } from "@/components/ui/field";
import { useAuth } from "@/contexts/AuthContext";
import * as authService from "@/services/auth";
import { toast } from "sonner";
import api from "@/lib/api";
import BlogXLogo from "@/components/ui/BlogXLogo";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  const token = searchParams.get("token") || "";
  const emailFromParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailFromParam);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const criteria = useMemo(() => {
    return {
      hasMinLength: password.length >= 8,
      hasLetters: /[a-zA-Z]/.test(password),
      hasNumbers: /[0-9]/.test(password),
      isMatching: password.length > 0 && password === confirmPassword,
    };
  }, [password, confirmPassword]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (criteria.hasMinLength) score += 33;
    if (criteria.hasLetters) score += 33;
    if (criteria.hasNumbers) score += 34;
    return score;
  }, [criteria]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !email || !criteria.isMatching || !criteria.hasMinLength) return;

    setErrors({});
    setIsLoading(true);

    try {
      await authService.resetPassword({
        token,
        email: email.trim(),
        password,
        password_confirmation: confirmPassword,
      });

      await refreshUser();
      toast.success("Password reset successfully! You are now logged in.");
      router.push("/");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.errors) {
        setErrors(err.response.data.errors);
        toast.error("Please resolve errors to continue.");
      } else {
        toast.error("Invalid or expired reset token. Please request a new one.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="p-8 rounded-3xl border border-border/80 bg-card/80 backdrop-blur-xl shadow-2xl space-y-5 text-center">
        <div className="size-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <XCircle className="size-7" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Invalid Reset Link</h1>
        <p className="text-xs text-muted-foreground">
          This password reset link is missing a security token or has expired.
        </p>
        <Link href="/forgot-password">
          <Button className="w-full rounded-xl mt-2 font-semibold">
            Request New Reset Link
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-8 rounded-3xl border border-border/80 bg-card/80 backdrop-blur-xl shadow-2xl space-y-6"
    >
      <div className="flex justify-center">
        <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
          <ShieldCheck className="size-8 stroke-[2.2]" />
        </div>
      </div>

      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Set New Password
        </h1>
        <p className="text-xs text-muted-foreground">
          Resetting password for: <span className="font-semibold text-foreground">{email}</span>
        </p>
      </div>

      <FieldGroup>
        {!emailFromParam && (
          <Field>
            <Label htmlFor="email" className="text-xs font-semibold text-foreground">
              Account Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border-border bg-background/80 py-5 text-sm"
            />
          </Field>
        )}

        <Field>
          <Label htmlFor="password" className="text-xs font-semibold text-foreground">
            New Password
          </Label>
          <div className="relative mt-1">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoFocus
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 rounded-xl border-border bg-background/80 py-5 text-sm"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {password.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden flex gap-1">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    strengthScore <= 34
                      ? "bg-destructive w-1/3"
                      : strengthScore <= 67
                      ? "bg-amber-500 w-2/3"
                      : "bg-emerald-500 w-full"
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] pt-1">
                <div className={cn("flex items-center gap-1.5", criteria.hasMinLength ? "text-emerald-500" : "text-muted-foreground")}>
                  {criteria.hasMinLength ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                  8+ Characters
                </div>
                <div className={cn("flex items-center gap-1.5", criteria.hasLetters ? "text-emerald-500" : "text-muted-foreground")}>
                  {criteria.hasLetters ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                  Contains Letters
                </div>
                <div className={cn("flex items-center gap-1.5", criteria.hasNumbers ? "text-emerald-500" : "text-muted-foreground")}>
                  {criteria.hasNumbers ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                  Contains Numbers
                </div>
                <div className={cn("flex items-center gap-1.5", criteria.isMatching ? "text-emerald-500" : "text-muted-foreground")}>
                  {criteria.isMatching ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                  Passwords Match
                </div>
              </div>
            </div>
          )}
          {errors.password && <p className="text-xs text-destructive mt-1">{errors.password[0]}</p>}
        </Field>

        <Field>
          <Label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground">
            Confirm New Password
          </Label>
          <div className="relative mt-1">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 pr-10 rounded-xl border-border bg-background/80 py-5 text-sm"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>

        <Button
          type="submit"
          disabled={isLoading || !criteria.isMatching || !criteria.hasMinLength}
          className="w-full rounded-xl font-semibold py-6 text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Resetting Password...
            </>
          ) : (
            <>
              Reset Password & Sign In
              <ArrowRight className="size-4 ml-2" />
            </>
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-10 relative overflow-hidden min-h-svh justify-center items-center bg-background">
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <BlogXLogo className="w-[min(60vw,450px)] h-auto opacity-[0.03] pointer-events-none select-none" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Suspense
          fallback={
            <div className="p-8 rounded-3xl border border-border/80 bg-card/80 flex justify-center items-center">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
