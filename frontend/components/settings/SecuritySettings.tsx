"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import * as authService from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import {
  ArrowLeft,
  Shield,
  Lock,
  Key,
  QrCode,
  Copy,
  Check,
  AlertTriangle,
  LogOut,
  Laptop,
  Smartphone,
  Tablet,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SecuritySettingsProps {
  onBack: () => void;
}

export default function SecuritySettings({ onBack }: SecuritySettingsProps) {
  const {
    user,
    devices,
    changePassword,
    refreshDevices,
    revokeDevice,
    logoutOthers,
    refreshUser,
  } = useAuth();

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
    refreshDevices();
  }, [refreshDevices]);

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

  return (
    <div className="min-h-screen pb-24 divide-y divide-border/60 animate-in fade-in duration-200">
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 rounded-full hover:bg-muted transition-colors text-foreground cursor-pointer flex items-center gap-1.5 group"
              aria-label="Back to Settings"
            >
              <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-0.5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div>
                <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">
                  Privacy & Security
                </h1>
                <p className="text-[11px] text-muted-foreground">
                  Protect your account with strong passwords, 2FA, and device oversight
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: CHANGE PASSWORD ── */}
      <div className="p-5 sm:p-6 space-y-4">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
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
              className="rounded-full px-6 font-bold text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
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

      {/* ── SECTION 2: TWO-FACTOR AUTHENTICATION (2FA) ── */}
      <div className="p-5 sm:p-6 space-y-4">
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
                Add an extra layer of defense using Google Authenticator or 1Password
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
              className="rounded-full text-xs font-bold h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
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
                    Scan this QR code using Google Authenticator, Authy, or 1Password. If you can&apos;t scan, copy the secret key below:
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
                  className="rounded-xl text-xs h-10 px-5 font-bold bg-primary text-primary-foreground cursor-pointer"
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
                className="text-xs h-8 rounded-full font-bold px-4 cursor-pointer"
              >
                {isDisabling2FA ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                Confirm Disable
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* ── SECTION 3: LOGGED-IN DEVICE SESSIONS ── */}
      <div className="p-5 sm:p-6 space-y-4">
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

        <div className="divide-y divide-border/60 rounded-2xl border border-border/70 overflow-hidden bg-card">
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
                    <div className="size-10 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border/60">
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
  );
}
