"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BACKEND_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import * as authService from "@/services/auth";
import { toast } from "sonner";
import {
  Loader2,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import axios from "axios";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const { login, refreshUser } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    login: "",
    password: "",
    remember: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Rate Limiting lockout state
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // 2FA Challenge state
  const [twoFactorTicket, setTwoFactorTicket] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [isRecoveryCode, setIsRecoveryCode] = useState(false);
  const [is2FALoading, setIs2FALoading] = useState(false);

  // Ticking countdown timer for Rate Limiting lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    setErrors({});
    setIsLoading(true);

    try {
      const result = await login(formData);

      // Check if user requires 2FA authentication challenge
      if (result.requires_2fa) {
        setTwoFactorTicket(result.ticket);
        toast.info("Two-Factor Authentication required.");
        return;
      }

      toast.success("Welcome back to BlogX!");
      router.push("/");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 429) {
          const retryAfter = err.response.data?.retry_after || 60;
          setLockoutSeconds(retryAfter);
          toast.error(
            `Too many failed attempts. Locked for ${retryAfter} seconds.`
          );
        } else if (err.response?.status === 422) {
          setErrors(err.response.data.errors || {});
          if (err.response.data?.errors?.login) {
            toast.error(err.response.data.errors.login[0]);
          }
        } else {
          toast.error("Invalid credentials. Please verify and try again.");
        }
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorTicket || !twoFactorCode.trim()) return;

    setIs2FALoading(true);
    setErrors({});

    try {
      await authService.verify2FALogin({
        ticket: twoFactorTicket,
        code: !isRecoveryCode ? twoFactorCode.trim() : undefined,
        recovery_code: isRecoveryCode ? twoFactorCode.trim() : undefined,
      });

      await refreshUser();
      toast.success("Identity verified! Welcome back.");
      router.push("/");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        toast.error("Invalid 2FA code. Please try again.");
      }
    } finally {
      setIs2FALoading(false);
    }
  };

  // If user is challenged with 2FA
  if (twoFactorTicket) {
    return (
      <form
        className={cn(
          "flex flex-col gap-6 p-6 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-300",
          className
        )}
        onSubmit={handle2FASubmit}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
            <ShieldCheck className="size-7 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Two-Factor Authentication
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRecoveryCode
                ? "Enter one of your emergency recovery codes"
                : "Enter the 6-digit code from your authenticator app"}
            </p>
          </div>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="2fa-code" className="text-foreground">
              {isRecoveryCode ? "Recovery Code" : "6-Digit Security Code"}
            </FieldLabel>
            <div className="relative">
              <Input
                id="2fa-code"
                type="text"
                autoFocus
                placeholder={isRecoveryCode ? "xxxx-xxxx-xxxx" : "000000"}
                maxLength={isRecoveryCode ? 30 : 6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className={cn(
                  "rounded-xl border-border bg-background/80 text-center text-xl font-mono tracking-widest focus:border-ring focus:ring-ring/20 py-3",
                  errors.code && "border-destructive focus:border-destructive"
                )}
              />
            </div>
            {errors.code && (
              <p className="text-xs text-destructive mt-1.5 font-medium">
                {errors.code[0]}
              </p>
            )}
          </Field>

          <Field>
            <Button
              type="submit"
              disabled={is2FALoading || !twoFactorCode.trim()}
              className="w-full rounded-xl font-semibold py-6 text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              {is2FALoading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify and Sign In
                  <ArrowRight className="size-4 ml-2" />
                </>
              )}
            </Button>
          </Field>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRecoveryCode(!isRecoveryCode);
                setTwoFactorCode("");
                setErrors({});
              }}
              className="hover:text-primary underline underline-offset-4 transition-colors font-medium cursor-pointer"
            >
              {isRecoveryCode
                ? "Use 6-digit Authenticator Code"
                : "Lost access? Use Recovery Code"}
            </button>

            <button
              type="button"
              onClick={() => {
                setTwoFactorTicket(null);
                setTwoFactorCode("");
              }}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        </FieldGroup>
      </form>
    );
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Welcome back <Sparkles className="size-5 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your BlogX account
          </p>
        </div>

        {/* Lockout Countdown Alert */}
        {lockoutSeconds > 0 && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm animate-in fade-in duration-200">
            <ShieldAlert className="size-5 shrink-0 animate-pulse" />
            <div className="flex-1 text-xs font-medium">
              Too many failed attempts. Security cooldown active:{" "}
              <span className="font-bold font-mono text-sm underline">
                {lockoutSeconds}s
              </span>
            </div>
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="login" className="text-foreground text-xs font-semibold">
            Email or Username
          </FieldLabel>
          <Input
            id="login"
            type="text"
            placeholder="name@example.com or @username"
            required
            autoComplete="username"
            disabled={isLoading || lockoutSeconds > 0}
            value={formData.login}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, login: e.target.value }))
            }
            className={cn(
              "rounded-xl border-border bg-card/80 backdrop-blur-sm focus:border-ring focus:ring-ring/20 transition-all",
              errors.login && "border-destructive focus:border-destructive"
            )}
          />
          {errors.login && (
            <p className="text-xs text-destructive mt-1 font-medium">
              {errors.login[0]}
            </p>
          )}
        </Field>

        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password" className="text-foreground text-xs font-semibold">
              Password
            </FieldLabel>
            <Link
              href="/forgot-password"
              className="text-xs text-primary underline-offset-4 hover:underline font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              disabled={isLoading || lockoutSeconds > 0}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              className={cn(
                "pr-10 rounded-xl border-border bg-card/80 backdrop-blur-sm focus:border-ring focus:ring-ring/20 transition-all",
                errors.password && "border-destructive focus:border-destructive"
              )}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive mt-1 font-medium">
              {errors.password[0]}
            </p>
          )}
        </Field>

        {/* Remember Me Checkbox */}
        <div className="flex items-center justify-between py-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground transition-colors">
            <input
              type="checkbox"
              checked={formData.remember}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, remember: e.target.checked }))
              }
              className="size-4 rounded border-border accent-primary cursor-pointer"
            />
            <span>Remember this device for 30 days</span>
          </label>
        </div>

        <Field>
          <Button
            type="submit"
            disabled={isLoading || lockoutSeconds > 0}
            className="w-full rounded-xl font-semibold py-6 text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Signing in...
              </>
            ) : lockoutSeconds > 0 ? (
              `Locked (${lockoutSeconds}s)`
            ) : (
              "Sign In"
            )}
          </Button>
        </Field>

        <FieldSeparator className="text-muted-foreground text-xs uppercase tracking-wider">
          Or continue with
        </FieldSeparator>

        <Field>
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              window.location.href = `${BACKEND_URL}/auth/google/redirect`;
            }}
            className="w-full rounded-xl border-border bg-card/80 py-5 flex items-center justify-center gap-2.5 hover:bg-accent hover:text-accent-foreground font-medium transition-all cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="18"
              height="18"
            >
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.11 0-5.74-2.1-6.68-4.92H1.26v3.15C3.26 21.32 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.32 14.28a7.169 7.169 0 0 1 0-4.56V6.57H1.26a11.908 11.908 0 0 0 0 10.86l4.06-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.68 1.26 6.57l4.06 3.15c.94-2.82 3.57-4.97 6.68-4.97z"
              />
            </svg>
            Continue with Google
          </Button>

          <FieldDescription className="text-center text-muted-foreground text-xs mt-3">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-primary underline underline-offset-4 hover:text-foreground font-semibold"
            >
              Create Account
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}