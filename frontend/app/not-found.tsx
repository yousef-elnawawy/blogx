"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ArrowLeft, FileQuestion, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 py-12 text-center">
      <div className="max-w-md w-full flex flex-col items-center space-y-6">
        {/* Animated Badge & Icon */}
        <div className="relative">
          <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
            <Compass className="size-12 animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground text-xs font-black px-2.5 py-1 rounded-full shadow-md">
            404
          </div>
        </div>

        {/* Header Text */}
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Page Not Found
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto pt-1">
            Sorry, the page you are looking for doesn't exist, has been removed, or is temporarily unavailable.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full pt-2">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="w-full sm:w-auto h-11 px-6 rounded-full gap-2 text-sm font-medium border-border hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
            Go Back
          </Button>

          <Link href="/" className="w-full sm:w-auto">
            <Button
              className="w-full sm:w-auto h-11 px-6 rounded-full gap-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <Home className="size-4" />
              Return Home
            </Button>
          </Link>
        </div>

        {/* Footer info */}
        <div className="pt-8 border-t border-border/50 w-full">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <FileQuestion className="size-3.5" />
            Looking for something on BlogX? Try returning to the feed.
          </p>
        </div>
      </div>
    </div>
  );
}
