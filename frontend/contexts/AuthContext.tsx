"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as authService from "@/services/auth";
import type { User, UserDevice } from "@/services/auth";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  devices: UserDevice[];
  login: (data: { login: string; password: string; remember?: boolean }) => Promise<any>;
  register: (data: {
    name: string;
    username: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => Promise<any>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  logoutOthers: () => Promise<void>;
  updateProfile: (data: Parameters<typeof authService.updateProfile>[0]) => Promise<void>;
  changePassword: (data: Parameters<typeof authService.changePassword>[0]) => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  revokeDevice: (id: number) => Promise<void>;
  resendVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const data = await authService.getUser();
      setUser(data.user);
    } catch {
      localStorage.removeItem("auth_token");
      setUser(null);
    }
  }, []);

  const refreshDevices = useCallback(async () => {
    if (typeof window === "undefined" || !localStorage.getItem("auth_token")) return;
    try {
      const data = await authService.getDevices();
      setDevices(data.devices || []);
    } catch {
      // Ignored if unauthenticated
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setLoading(false);
      return;
    }
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = async (data: { login: string; password: string; remember?: boolean }) => {
    const result = await authService.login(data);
    if (result.user) {
      setUser(result.user);
    }
    return result;
  };

  const register = async (data: {
    name: string;
    username: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => {
    const result = await authService.register(data);
    if (result.user) {
      setUser(result.user);
    }
    return result;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setDevices([]);
    }
  };

  const logoutAll = async () => {
    try {
      await authService.logoutAll();
      toast.success("All sessions logged out successfully");
    } finally {
      setUser(null);
      setDevices([]);
    }
  };

  const logoutOthers = async () => {
    await authService.logoutOthers();
    toast.success("All other sessions logged out");
    await refreshDevices();
  };

  const updateProfile = async (data: Parameters<typeof authService.updateProfile>[0]) => {
    const result = await authService.updateProfile(data);
    setUser(result.user);
  };

  const changePassword = async (data: Parameters<typeof authService.changePassword>[0]) => {
    await authService.changePassword(data);
    await refreshDevices();
  };

  const revokeDevice = async (id: number) => {
    await authService.revokeDevice(id);
    await refreshDevices();
    toast.success("Session terminated");
  };

  const resendVerification = async () => {
    await authService.resendVerificationEmail();
    toast.success("Verification link sent! Check your inbox.");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        devices,
        login,
        register,
        logout,
        logoutAll,
        logoutOthers,
        updateProfile,
        changePassword,
        refreshUser,
        refreshDevices,
        revokeDevice,
        resendVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
