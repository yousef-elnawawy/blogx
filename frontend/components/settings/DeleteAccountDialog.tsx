"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeleteAccountDialog({
  open,
  onOpenChange,
}: DeleteAccountDialogProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setStep(1);
    setPassword("");
    setShowPassword(false);
    setConfirmed(false);
    setError(null);
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !confirmed || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await api.post("/api/user/delete", { password });
      toast.success("Your account has been deleted.");
      localStorage.removeItem("auth_token");
      await logout();
      handleClose(false);
      router.push("/login");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.errors?.password) {
        setError(err.response.data.errors.password[0]);
      } else if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Failed to delete account. Please check your password and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 gap-6 bg-card border-border shadow-2xl">
        <DialogHeader className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
            <AlertTriangle className="size-6" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-foreground">
              {step === 1 ? "Delete Account" : "Confirm Account Deletion"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {step === 1
                ? "This action is permanent and cannot be undone."
                : "Enter your password to authorize deletion."}
            </p>
          </div>
        </DialogHeader>

        {step === 1 ? (
          /* Step 1: Warning Details */
          <div className="space-y-4">
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive space-y-2">
              <p className="text-xs sm:text-sm font-medium leading-relaxed">
                Deleting your account will permanently wipe all your data from BlogX:
              </p>
              <ul className="text-xs space-y-1.5 list-disc list-inside text-destructive/90">
                <li>All your published posts and images</li>
                <li>Your comments and replies</li>
                <li>Your likes, bookmarks, and interactions</li>
                <li>Your profile information and handle</li>
              </ul>
            </div>

            <div className="-mx-6 -mb-6 mt-4 flex items-center justify-end gap-2 border-t border-border/60 bg-muted/50 p-4 rounded-b-3xl">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                className="rounded-lg px-4 text-xs font-semibold cursor-pointer shadow-2xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-lg px-4 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white gap-1.5 shadow-xs cursor-pointer"
              >
                <span>I understand, continue</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          /* Step 2: Password & Checkbox */
          <form onSubmit={handleDelete} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="delete-password" className="text-xs font-semibold text-foreground">
                Enter Your Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="delete-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Your account password"
                  className="pl-10 pr-10 rounded-xl border-border bg-background text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {error && <p className="text-xs text-destructive font-medium">{error}</p>}
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <Checkbox
                id="confirm-check"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(Boolean(checked))}
                className="mt-0.5 cursor-pointer"
              />
              <Label
                htmlFor="confirm-check"
                className="text-xs text-muted-foreground leading-snug cursor-pointer select-none"
              >
                I confirm that I want to permanently delete my account and erase all associated data.
              </Label>
            </div>

            <div className="-mx-6 -mb-6 mt-4 flex items-center justify-between gap-2 border-t border-border/60 bg-muted/50 p-4 rounded-b-3xl">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
                className="rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleClose(false)}
                  className="rounded-lg px-4 text-xs font-semibold cursor-pointer shadow-2xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!password.trim() || !confirmed || submitting}
                  className="rounded-lg px-4 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Permanently Delete"
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
