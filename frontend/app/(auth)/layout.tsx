"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const initialUserRef = useRef<boolean | null>(null);

  // Record whether the user was already logged in upon visiting the auth page
  useEffect(() => {
    if (!loading && initialUserRef.current === null) {
      initialUserRef.current = !!user;
    }
  }, [loading, user]);

  useEffect(() => {
    // If the user arrived at /login or /signup while already logged in, redirect home
    if (!loading && user && initialUserRef.current === true) {
      router.replace("/");
    }
  }, [user, loading, router]);

  return <>{children}</>;
}
