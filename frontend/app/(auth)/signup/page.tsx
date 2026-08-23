"use client";

import { SignUpForm } from "@/components/signup-form";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-svh w-full flex flex-col bg-background selection:bg-primary/20">
      <div className="flex flex-col justify-between min-h-svh p-6 sm:p-8 lg:p-10">
        {/* Top Header / Brand Logo */}
        <div className="flex items-center justify-between w-full max-w-[460px] mx-auto">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            <img src="/logo.svg" alt="BlogX" className="h-8 w-auto dark:hidden" />
            <img
              src="/logo-dark.svg"
              alt="BlogX"
              className="h-8 w-auto hidden dark:block"
            />
          </Link>

          <Link
            href="/login"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Have an account?{" "}
            <span className="text-primary font-semibold underline underline-offset-4">
              Sign in
            </span>
          </Link>
        </div>

        {/* Center Form Area */}
        <div className="flex flex-1 items-center justify-center py-8 w-full">
          <div className="w-full max-w-[460px]">
            <SignUpForm />
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="text-center max-w-[460px] mx-auto w-full pt-4">
          <p className="text-[11px] text-muted-foreground">
            By creating an account, you agree to our{" "}
            <Link
              href="/terms"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}