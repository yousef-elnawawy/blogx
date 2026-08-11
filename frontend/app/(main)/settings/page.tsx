"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import * as authService from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import axios from "axios";
import {
  User,
  MapPin,
  Link as LinkIcon,
  FileText,
  Camera,
  Loader2,
  Save,
  ArrowLeft,
  Shield,
  Bell,
  Palette,
  CheckCircle2,
  Lock,
  ChevronRight,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Key,
  QrCode,
  Copy,
  Download,
  AlertTriangle,
  LogOut,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  BadgeCheck,
} from "lucide-react";
import { cn, getAvatarUrl } from "@/lib/utils";
import { useTheme } from "next-themes";
import DeleteAccountDialog from "@/components/settings/DeleteAccountDialog";
import VerificationTab from "@/components/settings/VerificationTab";

type SettingsTab = "account" | "security" | "verification" | "notifications" | "appearance";

interface TabItem {
  id: SettingsTab;
  label: string;
  icon: typeof User;
}

const SETTINGS_TABS: TabItem[] = [
  { id: "account", label: "Account & Profile", icon: User },
  { id: "security", label: "Privacy & Security", icon: Shield },
  { id: "verification", label: "Verification", icon: BadgeCheck },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
];

function SettingsContent() {
  const {
    user,
    loading,
    devices,
    updateProfile,
    changePassword,
    refreshDevices,
    revokeDevice,
    logoutOthers,
    refreshUser,
  } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as SettingsTab | null;
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    tabParam && SETTINGS_TABS.some((t) => t.id === tabParam)
      ? tabParam
      : "account"
  );

  useEffect(() => {
    if (tabParam && SETTINGS_TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Profile Form State
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    bio: "",
    location: "",
    website: "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Security - Change Password State
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string[]>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Security - 2FA State
  const [is2FASetupOpen, setIs2FASetupOpen] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [twoFactorQrUri, setTwoFactorQrUri] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorRecoveryCodes, setTwoFactorRecoveryCodes] = useState<string[]>([]);
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const [isConfirming2FA, setIsConfirming2FA] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState("");
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      setFormData({
        name: user.name || "",
        username: user.username || "",
        email: user.email || "",
        bio: user.bio || "",
        location: user.location || "",
        website: user.website || "",
      });
      if (user.avatar) {
        setAvatarPreview(getAvatarUrl(user.avatar) || "");
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (activeTab === "security") {
      refreshDevices();
    }
  }, [activeTab, refreshDevices]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSaving(true);

    try {
      const updateData: Record<string, string | File> = {};

      if (formData.name !== user?.name) updateData.name = formData.name;
      if (formData.username !== user?.username) updateData.username = formData.username;
      if (formData.email !== user?.email) updateData.email = formData.email;
      if (formData.bio !== (user?.bio || "")) updateData.bio = formData.bio;
      if (formData.location !== (user?.location || "")) updateData.location = formData.location;
      if (formData.website !== (user?.website || "")) updateData.website = formData.website;
      if (avatarFile) updateData.avatar = avatarFile;

      if (Object.keys(updateData).length === 0) {
        toast.info("No changes to save");
        setIsSaving(false);
        return;
      }

      await updateProfile(updateData as Parameters<typeof updateProfile>[0]);
      setAvatarFile(null);
      toast.success("Profile updated successfully!");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        toast.error("Please fix the errors and try again.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});
    setIsChangingPassword(true);

    try {
      await changePassword(passwordForm);
      setPasswordForm({
        current_password: "",
        password: "",
        password_confirmation: "",
      });
      toast.success("Password changed! All other sessions logged out for security.");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.errors) {
        setPasswordErrors(err.response.data.errors);
      } else {
        toast.error("Failed to update password. Check current password.");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const start2FASetup = async () => {
    setIsEnabling2FA(true);
    try {
      const data = await authService.enable2FA();
      setTwoFactorSecret(data.secret);
      setTwoFactorQrUri(data.qr_uri);
      setIs2FASetupOpen(true);
    } catch {
      toast.error("Could not initialize 2FA setup.");
    } finally {
      setIsEnabling2FA(false);
    }
  };

  const confirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) return;

    setIsConfirming2FA(true);
    try {
      const data = await authService.confirm2FA(twoFactorCode.trim());
      setTwoFactorRecoveryCodes(data.recovery_codes);
      await refreshUser();
      toast.success("Two-Factor Authentication is now active!");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.errors?.code) {
        toast.error(err.response.data.errors.code[0]);
      } else {
        toast.error("Invalid verification code. Please check your authenticator app.");
      }
    } finally {
      setIsConfirming2FA(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disable2FAPassword) return;

    setIsDisabling2FA(true);
    try {
      await authService.disable2FA(disable2FAPassword);
      await refreshUser();
      setShowDisableModal(false);
      setDisable2FAPassword("");
      toast.success("Two-Factor Authentication has been disabled.");
    } catch {
      toast.error("Incorrect password. Could not disable 2FA.");
    } finally {
      setIsDisabling2FA(false);
    }
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(twoFactorRecoveryCodes.join("\n"));
    setCopiedCodes(true);
    toast.success("Recovery codes copied to clipboard!");
    setTimeout(() => setCopiedCodes(false), 3000);
  };

  const downloadRecoveryCodes = () => {
    const text = `BlogX 2FA Emergency Recovery Codes\nGenerated: ${new Date().toLocaleString()}\n\n` +
      twoFactorRecoveryCodes.join("\n") +
      "\n\nKeep these codes in a secure offline location.";
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "blogx-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/60 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 -ml-1 rounded-full hover:bg-muted transition-colors text-foreground cursor-pointer"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="text-lg font-bold text-foreground">Settings & Security</h1>
          </div>

          {activeTab === "account" && (
            <Button
              onClick={handleSubmit}
              disabled={isSaving}
              size="sm"
              className="rounded-full px-5 h-8 font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-xs cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Saving
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Main Settings Layout */}
      <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-57px)]">
        {/* Navigation Column - Full Height & Fixed/Sticky */}
        <aside className="w-full md:w-60 lg:w-64 shrink-0 border-b md:border-b-0 md:border-r border-border/60 md:sticky md:top-[57px] md:h-[calc(100vh-57px)] md:overflow-y-auto bg-background/40">
          <div className="py-2">
            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium transition-colors border-l-2 cursor-pointer",
                    active
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-transparent text-foreground/80 hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="size-4 shrink-0" />
                    <span>{tab.label}</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/60" />
                </button>
              );
            })}
          </div>
        </aside>

        {/* Form Details Column */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 pb-32">
          {/* Account Tab */}
          {activeTab === "account" && (
            <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
              {/* Profile Photo */}
              <div className="border-b border-border/60 pb-6">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
                  Profile Photo
                </h2>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="size-16 rounded-full border border-border overflow-hidden bg-muted flex items-center justify-center">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar"
                          className="size-full object-cover"
                        />
                      ) : (
                        <Camera className="size-6 text-muted-foreground" />
                      )}
                    </div>
                    <label className="absolute inset-0 cursor-pointer rounded-full">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </label>
                  </div>
                  <div>
                    <label className="cursor-pointer text-xs font-bold text-primary hover:underline block">
                      Upload new photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      JPG, PNG or GIF (max 2MB)
                    </p>
                  </div>
                </div>
              </div>

              {/* Personal Info */}
              <div className="border-b border-border/60 pb-6 space-y-4">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Personal Information
                </h2>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name" className="text-xs font-semibold text-foreground">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      className={cn("mt-1 rounded-lg text-sm", errors.name && "border-destructive")}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive mt-1">{errors.name[0]}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="username" className="text-xs font-semibold text-foreground">
                      Username
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                        @
                      </span>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => updateField("username", e.target.value)}
                        className={cn("pl-7 rounded-lg text-sm", errors.username && "border-destructive")}
                      />
                    </div>
                    {errors.username && (
                      <p className="text-xs text-destructive mt-1">{errors.username[0]}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className={cn("mt-1 rounded-lg text-sm", errors.email && "border-destructive")}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive mt-1">{errors.email[0]}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Details */}
              <div className="border-b border-border/60 pb-6 space-y-4">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Profile Details
                </h2>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="bio" className="text-xs font-semibold text-foreground">
                      Bio
                    </Label>
                    <Textarea
                      id="bio"
                      placeholder="Write a brief bio..."
                      value={formData.bio}
                      onChange={(e) => updateField("bio", e.target.value)}
                      className="mt-1 rounded-lg text-sm min-h-[80px] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="location" className="text-xs font-semibold text-foreground">
                        Location
                      </Label>
                      <Input
                        id="location"
                        placeholder="Cairo, Egypt"
                        value={formData.location}
                        onChange={(e) => updateField("location", e.target.value)}
                        className="mt-1 rounded-lg text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="website" className="text-xs font-semibold text-foreground">
                        Website
                      </Label>
                      <Input
                        id="website"
                        placeholder="https://website.com"
                        value={formData.website}
                        onChange={(e) => updateField("website", e.target.value)}
                        className="mt-1 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="pt-2">
                <h2 className="text-xs font-bold text-destructive uppercase tracking-wider mb-2">
                  Danger Zone
                </h2>
                <p className="text-xs text-muted-foreground mb-3">
                  Permanently delete your account and all associated posts.
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="rounded-full text-xs font-bold px-4 h-8 cursor-pointer"
                >
                  Delete Account
                </Button>
              </div>
            </form>
          )}

          {/* Privacy & Security Tab */}
          {activeTab === "security" && (
            <div className="space-y-8 max-w-xl animate-in fade-in duration-300">
              {/* 1. Change Password */}
              <div className="border-b border-border/60 pb-8 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Lock className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Change Password</h2>
                    <p className="text-xs text-muted-foreground">
                      Ensure your account uses a long, unique password
                    </p>
                  </div>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-3 pt-2">
                  <div>
                    <Label htmlFor="curr-pwd" className="text-xs font-semibold text-foreground">
                      Current Password
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="curr-pwd"
                        type={showCurrentPassword ? "text" : "password"}
                        required
                        value={passwordForm.current_password}
                        onChange={(e) =>
                          setPasswordForm((p) => ({ ...p, current_password: e.target.value }))
                        }
                        className="pr-10 rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                      >
                        {showCurrentPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>
                    {passwordErrors.current_password && (
                      <p className="text-xs text-destructive mt-1">{passwordErrors.current_password[0]}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="new-pwd" className="text-xs font-semibold text-foreground">
                        New Password
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="new-pwd"
                          type={showNewPassword ? "text" : "password"}
                          required
                          value={passwordForm.password}
                          onChange={(e) =>
                            setPasswordForm((p) => ({ ...p, password: e.target.value }))
                          }
                          className="pr-10 rounded-lg text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                        >
                          {showNewPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </button>
                      </div>
                      {passwordErrors.password && (
                        <p className="text-xs text-destructive mt-1">{passwordErrors.password[0]}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="conf-pwd" className="text-xs font-semibold text-foreground">
                        Confirm New Password
                      </Label>
                      <Input
                        id="conf-pwd"
                        type="password"
                        required
                        value={passwordForm.password_confirmation}
                        onChange={(e) =>
                          setPasswordForm((p) => ({ ...p, password_confirmation: e.target.value }))
                        }
                        className="mt-1 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-[11px] text-muted-foreground">
                      Logs out all other devices upon update
                    </p>
                    <Button
                      type="submit"
                      disabled={isChangingPassword || !passwordForm.current_password || !passwordForm.password}
                      size="sm"
                      className="rounded-full text-xs font-bold px-4 h-8 cursor-pointer"
                    >
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="size-3 animate-spin mr-1" /> Updating...
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </Button>
                  </div>
                </form>
              </div>

              {/* 2. Two-Factor Authentication (2FA) */}
              <div className="border-b border-border/60 pb-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-foreground">Two-Factor Authentication</h2>
                        {user.has_2fa ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                            Active & Protected
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Add an extra layer of security with Google Authenticator or Apple Passwords
                      </p>
                    </div>
                  </div>

                  {user.has_2fa ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDisableModal(true)}
                      className="rounded-full text-xs h-8 text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
                    >
                      Disable 2FA
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={start2FASetup}
                      disabled={isEnabling2FA}
                      className="rounded-full text-xs font-bold h-8 cursor-pointer"
                    >
                      {isEnabling2FA ? <Loader2 className="size-3 animate-spin mr-1" /> : <Key className="size-3.5 mr-1" />}
                      Enable 2FA
                    </Button>
                  )}
                </div>

                {/* 2FA Setup Flow Modal */}
                {is2FASetupOpen && (
                  <div className="p-5 rounded-2xl border border-primary/30 bg-primary/5 space-y-5 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <QrCode className="size-4 text-primary" /> Setup Authenticator App
                      </h3>
                      <button
                        onClick={() => setIs2FASetupOpen(false)}
                        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    {!twoFactorRecoveryCodes.length ? (
                      <div className="space-y-4">
                        <div className="text-xs text-muted-foreground leading-relaxed">
                          1. Open your authenticator app (Google Authenticator, Authy, Apple Passwords).<br />
                          2. Enter this setup key manually or copy the configuration secret:
                        </div>

                        {twoFactorSecret && (
                          <div className="flex items-center gap-2 p-3 rounded-xl bg-background border border-border">
                            <code className="text-xs font-mono font-bold tracking-widest text-primary flex-1">
                              {twoFactorSecret}
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                navigator.clipboard.writeText(twoFactorSecret);
                                toast.success("Secret key copied!");
                              }}
                              className="h-7 text-xs px-2"
                            >
                              <Copy className="size-3.5" />
                            </Button>
                          </div>
                        )}

                        <form onSubmit={confirm2FA} className="space-y-3">
                          <Label htmlFor="totp-code" className="text-xs font-semibold">
                            Enter the 6-digit code from your app to verify:
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="totp-code"
                              placeholder="000000"
                              maxLength={6}
                              value={twoFactorCode}
                              onChange={(e) => setTwoFactorCode(e.target.value)}
                              className="font-mono text-center tracking-widest text-lg rounded-xl h-11"
                            />
                            <Button
                              type="submit"
                              disabled={isConfirming2FA || twoFactorCode.length < 6}
                              className="rounded-xl px-5 font-bold text-xs"
                            >
                              {isConfirming2FA ? <Loader2 className="size-3.5 animate-spin" /> : "Verify & Activate"}
                            </Button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in zoom-in-95 duration-300">
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium flex items-center gap-2">
                          <CheckCircle2 className="size-4 shrink-0" />
                          2FA has been successfully activated on your account!
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-foreground mb-1">
                            Emergency Backup Recovery Codes
                          </h4>
                          <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                            Save these 8 recovery codes in a safe place. If you ever lose your phone, you can use one of these codes to regain access.
                          </p>

                          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-background border border-border font-mono text-xs">
                            {twoFactorRecoveryCodes.map((code, i) => (
                              <div key={i} className="text-muted-foreground select-all py-0.5">
                                {i + 1}. <span className="text-foreground font-semibold">{code}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={copyRecoveryCodes}
                            className="flex-1 rounded-xl text-xs h-9"
                          >
                            {copiedCodes ? <Check className="size-3.5 mr-1" /> : <Copy className="size-3.5 mr-1" />}
                            {copiedCodes ? "Copied" : "Copy Codes"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={downloadRecoveryCodes}
                            className="flex-1 rounded-xl text-xs h-9"
                          >
                            <Download className="size-3.5 mr-1" />
                            Download .txt
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setIs2FASetupOpen(false);
                              setTwoFactorRecoveryCodes([]);
                            }}
                            className="rounded-xl text-xs px-4 h-9 font-bold"
                          >
                            Done
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Disable 2FA Password Modal */}
                {showDisableModal && (
                  <form
                    onSubmit={handleDisable2FA}
                    className="p-4 rounded-2xl border border-destructive/30 bg-destructive/5 space-y-3 animate-in fade-in duration-200"
                  >
                    <h4 className="text-xs font-bold text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="size-4" /> Confirm Password to Disable 2FA
                    </h4>
                    <Input
                      type="password"
                      placeholder="Enter current password"
                      required
                      value={disable2FAPassword}
                      onChange={(e) => setDisable2FAPassword(e.target.value)}
                      className="rounded-xl text-xs bg-background"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDisableModal(false)}
                        className="text-xs h-8"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="destructive"
                        size="sm"
                        disabled={isDisabling2FA || !disable2FAPassword}
                        className="text-xs h-8 rounded-full font-bold px-4"
                      >
                        {isDisabling2FA ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                        Confirm Disable
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* 3. Active Sessions & Multi-Device Management */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Laptop className="size-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-foreground">Logged-in Devices</h2>
                      <p className="text-xs text-muted-foreground">
                        Manage devices where your account is currently signed in
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={logoutOthers}
                    className="rounded-full text-xs h-8 hover:bg-destructive/10 hover:text-destructive border-border cursor-pointer font-medium"
                  >
                    <LogOut className="size-3 mr-1.5" />
                    Log Out Other Devices
                  </Button>
                </div>

                <div className="divide-y divide-border/60 rounded-2xl border border-border/80 bg-card/40 overflow-hidden">
                  {devices.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      <RefreshCw className="size-4 animate-spin mx-auto mb-2 text-primary" />
                      Loading active device sessions...
                    </div>
                  ) : (
                    devices.map((device) => {
                      const isMobile = device.device_type === "mobile";
                      const isTablet = device.device_type === "tablet";
                      const DeviceIcon = isMobile ? Smartphone : isTablet ? Tablet : Laptop;

                      return (
                        <div
                          key={device.id}
                          className="p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3.5 overflow-hidden">
                            <div className="size-9 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border/60">
                              <DeviceIcon className="size-4 text-foreground/80" />
                            </div>
                            <div className="overflow-hidden">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-foreground truncate">
                                  {device.browser} on {device.platform}
                                </p>
                                {device.is_current && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 shrink-0">
                                    Current Device
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                <span>{device.ip_address || "IP Hidden"}</span>
                                <span>•</span>
                                <span>Active {device.last_active_at}</span>
                              </p>
                            </div>
                          </div>

                          {!device.is_current && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => revokeDevice(device.id)}
                              className="text-xs text-destructive hover:bg-destructive/10 h-7 px-2.5 rounded-lg cursor-pointer shrink-0"
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Verification Tab */}
          {activeTab === "verification" && <VerificationTab />}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="space-y-6 max-w-xl">
              <div className="border-b border-border/60 pb-4">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Notification Preferences
                </h2>

                <div className="divide-y divide-border/60">
                  {[
                    "Likes and interactions on your posts",
                    "New comments and author replies",
                    "New followers and mentions",
                    "Security alerts and new device logins",
                  ].map((item, idx) => (
                    <div key={idx} className="py-3.5 flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">{item}</span>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="size-4 accent-primary rounded cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === "appearance" && (
            <div className="space-y-8 max-w-xl animate-in fade-in duration-300">
              <div className="border-b border-border/60 pb-6 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Theme & Interface</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Customize how BlogX looks on your device. Choose between light, dark, or automatically sync with your system.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {/* System Theme Card */}
                  <button
                    type="button"
                    onClick={() => {
                      setTheme("system");
                      toast.success("Theme set to System Default");
                    }}
                    className={cn(
                      "flex flex-col items-center p-4 rounded-2xl border-2 transition-all cursor-pointer text-left relative overflow-hidden group",
                      theme === "system"
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border/70 hover:border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="size-11 rounded-xl bg-background border border-border/80 flex items-center justify-center text-primary mb-3 shadow-inner">
                      <Monitor className="size-5" />
                    </div>
                    <div className="w-full text-center">
                      <p className="text-xs font-bold text-foreground flex items-center justify-center gap-1.5">
                        <span>System</span>
                        {theme === "system" && <Check className="size-3 text-primary shrink-0" />}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Matches your device
                      </p>
                    </div>
                  </button>

                  {/* Light Theme Card */}
                  <button
                    type="button"
                    onClick={() => {
                      setTheme("light");
                      toast.success("Light Theme activated");
                    }}
                    className={cn(
                      "flex flex-col items-center p-4 rounded-2xl border-2 transition-all cursor-pointer text-left relative overflow-hidden group",
                      theme === "light"
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border/70 hover:border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="size-11 rounded-xl bg-[#f7f2eb] border border-amber-900/10 flex items-center justify-center text-amber-600 mb-3 shadow-inner">
                      <Sun className="size-5" />
                    </div>
                    <div className="w-full text-center">
                      <p className="text-xs font-bold text-foreground flex items-center justify-center gap-1.5">
                        <span>Light Mode</span>
                        {theme === "light" && <Check className="size-3 text-primary shrink-0" />}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Warm editorial linen
                      </p>
                    </div>
                  </button>

                  {/* Dark Theme Card */}
                  <button
                    type="button"
                    onClick={() => {
                      setTheme("dark");
                      toast.success("Dark Mode activated");
                    }}
                    className={cn(
                      "flex flex-col items-center p-4 rounded-2xl border-2 transition-all cursor-pointer text-left relative overflow-hidden group",
                      theme === "dark"
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border/70 hover:border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="size-11 rounded-xl bg-[#161412] border border-white/10 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
                      <Moon className="size-5" />
                    </div>
                    <div className="w-full text-center">
                      <p className="text-xs font-bold text-foreground flex items-center justify-center gap-1.5">
                        <span>Dark Mode</span>
                        {theme === "dark" && <Check className="size-3 text-primary shrink-0" />}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Warm espresso charcoal
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Live Theme Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Live Interface Preview
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Active: {resolvedTheme === "dark" ? "Dark Mode" : "Light Mode"}
                  </span>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold ring-2 ring-primary/20">
                      BX
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">BlogX Team</p>
                      <p className="text-[11px] text-muted-foreground">@blogx • Just now</p>
                    </div>
                  </div>

                  <p className="text-xs text-foreground/90 leading-relaxed">
                    BlogX Dark Mode is designed to provide identical warm visual harmony to daylight mode, featuring eye-friendly espresso tones, crisp typography, and radiant amber accents.
                  </p>

                  <div className="flex items-center gap-2 pt-1 border-t border-border/50 text-xs">
                    <span className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground font-bold text-[10px]">
                      Follow
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-muted text-foreground font-medium text-[10px]">
                      Preview Button
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center">
          <Loader2 className="size-8 animate-spin mx-auto text-primary" />
          <p className="mt-3 text-xs text-muted-foreground">Loading settings...</p>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
