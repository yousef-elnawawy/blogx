"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function AppearanceInitializer() {
  const { user } = useAuth();

  useEffect(() => {
    // Sync accent color from user preferences or localStorage
    const savedAccent = localStorage.getItem("blogx_accent_color") || user?.preferences?.accent_color || "default";
    document.documentElement.setAttribute("data-accent", savedAccent);
  }, [user]);

  return null;
}
