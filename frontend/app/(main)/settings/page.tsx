"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
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
  Camera,
  Loader2,
  Save,
  ArrowLeft,
  Shield,
  Bell,
  Palette,
  Lock,
  Laptop,
  Smartphone,
  Tablet,
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
  Sparkles,
  BadgeCheck,
  Heart,
  MessageSquare,
  UserPlus,
  AtSign,
  Repeat2,
  Sun,
  Moon,
  Monitor,
  Image as ImageIcon,
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
  { id: "security", label: "Security", icon: Shield },
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
  const { preferences, loadingPreferences, updatePreference, fetchPreferences } = useNotifications();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as SettingsTab | null;
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    tabParam && SETTINGS_TABS.some((t) => t.id === tabParam)
      ? tabParam
      : "account"
  );

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    bio: "",
    location: "",
    website: "",
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Change Password State
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string[]>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Delete Account
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 2FA State
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
        setAvatarPreview(getAvatarUrl(user.avatar) || null);
      }
      if (user.cover) {
        setCoverPreview(getAvatarUrl(user.cover) || null);
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (activeTab === "security") {
      refreshDevices();
    } else if (activeTab === "notifications") {
      fetchPreferences();
    }
  }, [activeTab, refreshDevices, fetchPreferences]);

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
      if (file.size > 25 * 1024 * 1024) {
        toast.error("Avatar image must be under 25MB");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        toast.error("Cover image must be under 25MB");
        return;
      }
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      if (coverFile) updateData.cover = coverFile;

      if (Object.keys(updateData).length === 0) {
        toast.info("No changes to save");
        setIsSaving(false);
        return;
      }

      await updateProfile(updateData as Parameters<typeof updateProfile>[0]);
      setAvatarFile(null);
      setCoverFile(null);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 -ml-1 rounded-full hover:bg-muted transition-colors text-foreground cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">
              Settings & Security
            </h1>
          </div>

          {activeTab === "account" && (
            <Button
              onClick={() => handleSubmit()}
              disabled={isSaving}
              size="sm"
              className="rounded-full px-5 h-8 font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-xs cursor-pointer shadow-sm"
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

      {/* Settings Top Horizontal Tabs Bar */}
      <div className="border-b border-border/60 bg-background/60 sticky top-[57px] z-20 backdrop-blur-sm">
        <div className="flex overflow-x-auto no-scrollbar">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 min-w-[110px] sm:min-w-[130px] py-3.5 px-3 text-xs sm:text-sm font-semibold text-center transition-colors relative flex items-center justify-center gap-2 cursor-pointer",
                  active
                    ? "text-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                <span className="truncate">{tab.label}</span>
                {active && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Full-width Form Container */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* ── TAB 1: ACCOUNT & PROFILE ── */}
        {activeTab === "account" && (
          <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-200">
            {/* Card 1: Cover & Avatar Media */}
            <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden shadow-2xs">
              {/* Cover Banner Section */}
              <div className="p-4 sm:p-5 pb-0">
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Profile Cover Banner</h3>
                    <p className="text-xs text-muted-foreground">Recommended ratio 3:1 (JPG, PNG, WebP up to 25MB)</p>
                  </div>

                  <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border/80 bg-background hover:bg-muted text-xs font-semibold text-foreground cursor-pointer transition-colors shadow-2xs">
                    <ImageIcon className="size-3.5 text-primary" />
                    <span>Upload Cover</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverChange}
                    />
                  </label>
                </div>

                <div className="relative h-36 sm:h-48 w-full rounded-xl bg-gradient-to-r from-primary/30 via-amber-500/20 to-violet-500/30 overflow-hidden border border-border/50 group">
                  {coverPreview && (
                    <img
                      src={coverPreview}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity backdrop-blur-xs text-white text-xs font-bold gap-2">
                    <Camera className="size-5" />
                    <span>Change Cover Banner</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverChange}
                    />
                  </label>
                </div>
              </div>

              {/* Avatar Section */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4 border-t border-border/40 mt-4 bg-muted/10">
                <div className="flex items-center gap-4">
                  <div className="relative group shrink-0">
                    <div className="size-16 sm:size-20 rounded-full border-2 border-border overflow-hidden bg-muted flex items-center justify-center shadow-md ring-2 ring-background">
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
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer rounded-full transition-opacity text-white">
                      <Camera className="size-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </label>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground">Profile Avatar</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      JPG, PNG, GIF or WebP (max 25MB)
                    </p>
                  </div>
                </div>

                <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border/80 bg-background hover:bg-muted text-xs font-semibold text-foreground cursor-pointer transition-colors shadow-2xs">
                  <Camera className="size-3.5 text-primary" />
                  <span>Upload Avatar</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
            </div>

            {/* Card 2: Personal Information */}
            <div className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6 space-y-4 shadow-2xs">
              <div>
                <h3 className="text-sm font-bold text-foreground">Personal Information</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update your public name and handle
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-xs font-semibold text-foreground">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className={cn("mt-1.5 rounded-xl text-sm", errors.name && "border-destructive")}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive mt-1">{errors.name[0]}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="username" className="text-xs font-semibold text-foreground">
                    Username
                  </Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      @
                    </span>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => updateField("username", e.target.value)}
                      className={cn("pl-8 rounded-xl text-sm", errors.username && "border-destructive")}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-xs text-destructive mt-1">{errors.username[0]}</p>
                  )}
                </div>
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
                  className={cn("mt-1.5 rounded-xl text-sm", errors.email && "border-destructive")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1">{errors.email[0]}</p>
                )}
              </div>
            </div>

            {/* Card 3: Profile Details */}
            <div className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6 space-y-4 shadow-2xs">
              <div>
                <h3 className="text-sm font-bold text-foreground">Profile Details</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Describe yourself and add external links
                </p>
              </div>

              <div>
                <Label htmlFor="bio" className="text-xs font-semibold text-foreground">
                  Bio
                </Label>
                <Textarea
                  id="bio"
                  placeholder="Write a brief bio..."
                  value={formData.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  className="mt-1.5 rounded-xl text-sm min-h-[90px] resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location" className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <MapPin className="size-3.5 text-muted-foreground" />
                    Location
                  </Label>
                  <Input
                    id="location"
                    placeholder="Cairo, Egypt"
                    value={formData.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    className="mt-1.5 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="website" className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <LinkIcon className="size-3.5 text-muted-foreground" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    placeholder="https://yourwebsite.com"
                    value={formData.website}
                    onChange={(e) => updateField("website", e.target.value)}
                    className="mt-1.5 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-full px-6 font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-sm shadow-sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>

            {/* Card 4: Danger Zone */}
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 sm:p-6 space-y-3">
              <h3 className="text-sm font-bold text-destructive flex items-center gap-1.5">
                <AlertTriangle className="size-4" />
                Danger Zone
              </h3>
              <p className="text-xs text-muted-foreground">
                Permanently delete your BlogX account and all associated posts, articles, and bookmarks. This action cannot be undone.
              </p>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="rounded-full text-xs font-bold px-4 h-9 cursor-pointer"
              >
                Delete Account
              </Button>
            </div>
          </form>
        )}

        {/* ── TAB 2: PRIVACY & SECURITY ── */}
        {activeTab === "security" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 1. Change Password */}
            <div className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Lock className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Change Password</h3>
                  <p className="text-xs text-muted-foreground">
                    Ensure your account uses a long, unique password
                  </p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-1">
                <div>
                  <Label htmlFor="curr-pwd" className="text-xs font-semibold text-foreground">
                    Current Password
                  </Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="curr-pwd"
                      type={showCurrentPassword ? "text" : "password"}
                      required
                      value={passwordForm.current_password}
                      onChange={(e) =>
                        setPasswordForm((p) => ({ ...p, current_password: e.target.value }))
                      }
                      className="pr-10 rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {passwordErrors.current_password && (
                    <p className="text-xs text-destructive mt-1">{passwordErrors.current_password[0]}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="new-pwd" className="text-xs font-semibold text-foreground">
                      New Password
                    </Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="new-pwd"
                        type={showNewPassword ? "text" : "password"}
                        required
                        value={passwordForm.password}
                        onChange={(e) =>
                          setPasswordForm((p) => ({ ...p, password: e.target.value }))
                        }
                        className="pr-10 rounded-xl text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                      >
                        {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {passwordErrors.password && (
                      <p className="text-xs text-destructive mt-1">{passwordErrors.password[0]}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="confirm-pwd" className="text-xs font-semibold text-foreground">
                      Confirm New Password
                    </Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="confirm-pwd"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={passwordForm.password_confirmation}
                        onChange={(e) =>
                          setPasswordForm((p) => ({ ...p, password_confirmation: e.target.value }))
                        }
                        className="pr-10 rounded-xl text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isChangingPassword}
                    className="rounded-full px-6 font-bold text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin mr-1.5" />
                        Updating Password...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {/* 2. Two-Factor Authentication */}
            <div className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Key className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">Two-Factor Authentication (2FA)</h3>
                      {user?.has_2fa ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Add an extra layer of security using Google Authenticator or 1Password
                    </p>
                  </div>
                </div>

                {user?.has_2fa ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDisableModal(true)}
                    className="rounded-full text-xs font-semibold h-8 text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
                  >
                    Disable 2FA
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={start2FASetup}
                    disabled={isEnabling2FA}
                    className="rounded-full text-xs font-bold h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                  >
                    {isEnabling2FA ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                    Enable 2FA
                  </Button>
                )}
              </div>

              {/* 2FA Setup Flow */}
              {is2FASetupOpen && (
                <div className="mt-4 p-5 rounded-2xl border border-primary/30 bg-primary/5 space-y-4 animate-in fade-in duration-300">
                  <h4 className="text-xs font-bold text-primary flex items-center gap-2">
                    <QrCode className="size-4" /> Scan QR Code with Authenticator App
                  </h4>

                  {twoFactorQrUri ? (
                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      <div className="p-3 bg-white rounded-xl shadow-sm border border-border">
                        <img src={twoFactorQrUri} alt="2FA QR Code" className="size-36" />
                      </div>
                      <div className="space-y-3 flex-1">
                        <p className="text-xs text-foreground/80 leading-relaxed">
                          Scan this QR code using Google Authenticator, Authy, or 1Password. If you can't scan, copy the secret key below:
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground select-all">
                            {twoFactorSecret}
                          </code>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (twoFactorSecret) {
                                navigator.clipboard.writeText(twoFactorSecret);
                                toast.success("Secret copied!");
                              }
                            }}
                            className="h-8 px-2 text-xs"
                          >
                            <Copy className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <form onSubmit={confirm2FA} className="pt-2 flex flex-col sm:flex-row items-end gap-3">
                    <div className="w-full sm:w-64">
                      <Label htmlFor="twoFactorCode" className="text-xs font-bold">
                        Enter 6-digit Code:
                      </Label>
                      <Input
                        id="twoFactorCode"
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        required
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                        className="mt-1 font-mono tracking-widest text-center text-base rounded-xl"
                      />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIs2FASetupOpen(false)}
                        className="rounded-xl text-xs h-10 px-4"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isConfirming2FA || twoFactorCode.length < 6}
                        size="sm"
                        className="rounded-xl text-xs h-10 px-5 font-bold bg-primary text-primary-foreground"
                      >
                        {isConfirming2FA ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                        Verify & Activate
                      </Button>
                    </div>
                  </form>

                  {/* Recovery Codes */}
                  {twoFactorRecoveryCodes.length > 0 && (
                    <div className="p-4 rounded-xl bg-background border border-border/80 space-y-3">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Check className="size-4 text-emerald-500" /> Save Recovery Codes Safely
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Keep these recovery codes in a safe place. You can use them to log in if you lose access to your authenticator app.
                      </p>
                      <div className="grid grid-cols-2 gap-2 font-mono text-xs p-3 rounded-lg bg-muted/40">
                        {twoFactorRecoveryCodes.map((code) => (
                          <span key={code} className="text-center select-all font-bold text-foreground">
                            {code}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(twoFactorRecoveryCodes.join("\n"));
                            setCopiedCodes(true);
                            toast.success("Recovery codes copied!");
                          }}
                          className="rounded-xl text-xs px-3 h-8"
                        >
                          <Copy className="size-3.5 mr-1" />
                          {copiedCodes ? "Copied" : "Copy Codes"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setIs2FASetupOpen(false);
                            setTwoFactorRecoveryCodes([]);
                          }}
                          className="rounded-xl text-xs px-4 h-8 font-bold"
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

            {/* 3. Logged-in Devices */}
            <div className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Laptop className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Logged-in Devices</h3>
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

              <div className="divide-y divide-border/60 rounded-2xl border border-border bg-card/60 overflow-hidden">
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

        {/* ── TAB 3: VERIFICATION ── */}
        {activeTab === "verification" && <VerificationTab />}

        {/* ── TAB 4: NOTIFICATIONS ── */}
        {activeTab === "notifications" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6 space-y-5 shadow-2xs">
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Bell className="size-5 text-amber-500" />
                    Notification Preferences
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose which notifications you receive in real-time across BlogX.
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/notifications")}
                  className="rounded-full text-xs font-semibold h-8 gap-1.5 cursor-pointer border-border"
                >
                  <Bell className="size-3.5 text-amber-500" />
                  <span>Open Feed</span>
                </Button>
              </div>

              {/* Preferences List */}
              <div className="space-y-3">
                {[
                  {
                    key: "likes" as const,
                    title: "Likes & Reactions",
                    desc: "Get notified when someone likes your posts or comments",
                    icon: Heart,
                    iconColor: "text-red-500",
                    bgColor: "bg-red-500/10",
                  },
                  {
                    key: "comments" as const,
                    title: "Comments & Replies",
                    desc: "Get notified when someone comments on your post or replies to your comment",
                    icon: MessageSquare,
                    iconColor: "text-teal-500",
                    bgColor: "bg-teal-500/10",
                  },
                  {
                    key: "follows" as const,
                    title: "New Followers",
                    desc: "Get notified when someone starts following your profile",
                    icon: UserPlus,
                    iconColor: "text-amber-500",
                    bgColor: "bg-amber-500/10",
                  },
                  {
                    key: "mentions" as const,
                    title: "Mentions",
                    desc: "Get notified when someone tags @you in a post or comment",
                    icon: AtSign,
                    iconColor: "text-blue-500",
                    bgColor: "bg-blue-500/10",
                  },
                  {
                    key: "shares" as const,
                    title: "Shares & Reposts",
                    desc: "Get notified when someone shares your post with others",
                    icon: Repeat2,
                    iconColor: "text-cyan-500",
                    bgColor: "bg-cyan-500/10",
                  },
                  {
                    key: "milestones" as const,
                    title: "Milestones & Achievements",
                    desc: "Receive celebrations and certificates when you hit view, post, or follower records",
                    icon: Sparkles,
                    iconColor: "text-amber-500",
                    bgColor: "bg-amber-500/10",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isChecked = preferences[item.key] ?? true;

                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card/60 hover:border-border transition-all gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={cn(
                            "size-10 rounded-xl flex items-center justify-center shrink-0",
                            item.bgColor
                          )}
                        >
                          <Icon className={cn("size-5", item.iconColor)} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </div>

                      {/* Animated Toggle Switch */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isChecked}
                        onClick={() => updatePreference(item.key, !isChecked)}
                        disabled={loadingPreferences}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          isChecked ? "bg-amber-500" : "bg-muted-foreground/30"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                            isChecked ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Status info */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3 text-xs text-muted-foreground">
                <Sparkles className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <p>
                  Preferences are synchronized with our real-time engine. Changes apply immediately across all your active devices.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 5: APPEARANCE ── */}
        {activeTab === "appearance" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6 space-y-5 shadow-2xs">
              <div>
                <h3 className="text-sm font-bold text-foreground">Theme & Interface</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customize how BlogX looks on your device. Choose between light, dark, or automatically sync with your system.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
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
          </div>
        )}
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
