"use client";

import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import BlogXLogo from "@/components/ui/BlogXLogo";

export default function LoginPage() {
  return (
    <div className="min-h-svh w-full flex flex-col bg-background selection:bg-primary/20">
      <div className="flex flex-col justify-between min-h-svh p-6 sm:p-8 lg:p-10">
        {/* Top Header / Brand Logo */}
        <div className="flex items-center justify-between w-full max-w-[440px] mx-auto">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            <BlogXLogo className="h-8 w-auto" />
          </Link>

          <Link
            href="/signup"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Need an account?{" "}
            <span className="text-primary font-semibold underline underline-offset-4">
              Sign up
            </span>
          </Link>
        </div>

        {/* Center Form Area */}
        <div className="flex flex-1 items-center justify-center py-8 w-full">
          <div className="w-full max-w-[440px]">
            <Suspense
              fallback={
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              }
            >
              <LoginForm />
            </Suspense>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="text-center max-w-[440px] mx-auto w-full pt-4">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} BlogX. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}