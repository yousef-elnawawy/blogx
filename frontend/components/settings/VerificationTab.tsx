"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import UserBadges from "@/components/ui/UserBadges";
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Upload,
  Loader2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Check,
  X,
  Sparkles,
  Users,
  Search,
  Trash2,
  PenTool,
  Code2,
  Crown,
  Flame,
  UserCheck,
  UserX,
  Lock,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn, getAvatarUrl, getAvatarGradient, getInitials } from "@/lib/utils";
import { PLATFORM_BADGES, BadgeDefinition } from "@/lib/badges";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VerificationData {
  id: number;
  category: string;
  reason: string;
  document_url: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  user?: {
    id: number;
    name: string;
    username: string;
    avatar: string | null;
    verified: boolean;
  };
}

interface AdminUserItem {
  id: number;
  name: string;
  username: string;
  email: string;
  avatar: string | null;
  verified: boolean;
  is_admin: boolean;
  equipped_badges?: string[] | null;
  created_at: string;
  posts_count?: number;
  followers_count?: number;
}

const CATEGORIES = [
  "Content Creator / Influencer",
  "Journalist / Media / News",
  "Business / Brand / Organization",
  "Public Figure / Artist / Author",
  "Developer / Technology Leader",
  "Other",
];

function RenderBadgeIcon({ name, className = "size-4" }: { name: string; className?: string }) {
  switch (name) {
    case "BadgeCheck":
      return <BadgeCheck className={className} />;
    case "PenTool":
      return <PenTool className={className} />;
    case "Code2":
      return <Code2 className={className} />;
    case "Crown":
      return <Crown className={className} />;
    case "Sparkles":
      return <Sparkles className={className} />;
    case "Flame":
      return <Flame className={className} />;
    case "ShieldAlert":
      return <ShieldAlert className={className} />;
    case "ShieldCheck":
      return <ShieldCheck className={className} />;
    default:
      return <Shield className={className} />;
  }
}

export default function VerificationTab() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(Boolean(user?.verified));
  const [isAdmin, setIsAdmin] = useState(Boolean(user?.is_admin));
  const [latestRequest, setLatestRequest] = useState<VerificationData | null>(null);

  // Equipped Badges state for verified user
  const [equippedBadges, setEquippedBadges] = useState<string[]>(user?.equipped_badges || []);
  const [savingBadges, setSavingBadges] = useState(false);

  // Submission Form State
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [reason, setReason] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Admin View State
  const [adminTab, setAdminTab] = useState<"my_status" | "admin_panel">(
    user?.is_admin ? "admin_panel" : "my_status"
  );
  const [adminSubTab, setAdminSubTab] = useState<"requests" | "users">("requests");

  // Admin Requests State
  const [adminRequests, setAdminRequests] = useState<VerificationData[]>([]);
  const [adminFilter, setAdminFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [adminLoading, setAdminLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Admin Users Management State
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "verified" | "unverified" | "admins">("all");
  const [usersLoading, setUsersLoading] = useState(false);
  const [userActionLoadingId, setUserActionLoadingId] = useState<number | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<AdminUserItem | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/verification/status");
      setIsVerified(res.data.is_verified);
      setIsAdmin(res.data.is_admin);
      setLatestRequest(res.data.latest_request);
      if (user?.equipped_badges) {
        setEquippedBadges(user.equipped_badges);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminRequests = async (filter = adminFilter) => {
    try {
      setAdminLoading(true);
      const res = await api.get(`/api/admin/verification-requests?status=${filter}`);
      setAdminRequests(res.data.data ?? []);
    } catch {
      toast.error("Failed to load verification requests");
    } finally {
      setAdminLoading(false);
    }
  };

  const fetchAdminUsers = async (search = userSearch, filter = userFilter) => {
    try {
      setUsersLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (filter !== "all") params.set("filter", filter);

      const res = await api.get(`/api/admin/users?${params.toString()}`);
      setAdminUsers(res.data.data ?? []);
    } catch {
      toast.error("Failed to load users list");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (isAdmin && adminTab === "admin_panel") {
      if (adminSubTab === "requests") {
        fetchAdminRequests(adminFilter);
      } else {
        fetchAdminUsers(userSearch, userFilter);
      }
    }
  }, [isAdmin, adminTab, adminSubTab, adminFilter, userFilter]);

  // Debounced search for users
  useEffect(() => {
    if (isAdmin && adminTab === "admin_panel" && adminSubTab === "users") {
      const timer = setTimeout(() => {
        fetchAdminUsers(userSearch, userFilter);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [userSearch]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please explain why your account should be verified.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("reason", reason.trim());
      if (documentFile) {
        formData.append("document", documentFile);
      }

      const res = await api.post("/api/verification/request", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(res.data.message || "Request submitted successfully!");
      setLatestRequest(res.data.request);
      setReason("");
      setDocumentFile(null);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message ?? "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminApprove = async (id: number) => {
    setActionLoadingId(id);
    try {
      const res = await api.post(`/api/admin/verification-requests/${id}/approve`);
      toast.success(res.data.message || "Request approved and verified!");
      fetchAdminRequests();
      refreshUser();
    } catch {
      toast.error("Failed to approve request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAdminReject = async (id: number) => {
    const notes = window.prompt("Reason for rejection (feedback for user):", "Does not meet verification requirements at this time.");
    if (notes === null) return;

    setActionLoadingId(id);
    try {
      const res = await api.post(`/api/admin/verification-requests/${id}/reject`, {
        admin_notes: notes,
      });
      toast.success(res.data.message || "Request rejected.");
      fetchAdminRequests();
    } catch {
      toast.error("Failed to reject request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleUserVerification = async (targetUser: AdminUserItem) => {
    setUserActionLoadingId(targetUser.id);
    try {
      const res = await api.post(`/api/admin/users/${targetUser.id}/toggle-verify`, {
        verified: !targetUser.verified,
      });
      toast.success(res.data.message);
      setAdminUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, verified: !targetUser.verified } : u))
      );
      if (user?.id === targetUser.id) {
        refreshUser();
      }
    } catch {
      toast.error("Failed to update user verification status.");
    } finally {
      setUserActionLoadingId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;
    setIsDeletingUser(true);
    try {
      const res = await api.delete(`/api/admin/users/${deleteTargetUser.id}`);
      toast.success(res.data.message);
      setAdminUsers((prev) => prev.filter((u) => u.id !== deleteTargetUser.id));
      setDeleteTargetUser(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete user.");
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleToggleEquippedBadge = (badgeId: string) => {
    if (equippedBadges.includes(badgeId)) {
      setEquippedBadges((prev) => prev.filter((id) => id !== badgeId));
    } else {
      if (equippedBadges.length >= 5) {
        toast.info("You can equip up to 5 badges at once.");
        return;
      }
      setEquippedBadges((prev) => [...prev, badgeId]);
    }
  };

  const handleSaveBadges = async () => {
    setSavingBadges(true);
    try {
      const res = await api.post("/api/user/badges", {
        badges: equippedBadges,
      });
      toast.success(res.data.message || "Badges updated successfully!");
      refreshUser();
    } catch {
      toast.error("Failed to update badges.");
    } finally {
      setSavingBadges(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="size-8 animate-spin mx-auto text-primary" />
        <p className="mt-3 text-xs text-muted-foreground">Checking verification status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl animate-in fade-in duration-300">
      {/* Top Header with Admin Toggle */}
      <div className="border-b border-border/60 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8.5 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shadow-2xs border border-sky-500/20">
            <BadgeCheck className="size-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Verification & Creator Perks</h2>
            <p className="text-xs text-muted-foreground">
              Official verified status and exclusive platform badges
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/50 shrink-0">
            <button
              type="button"
              onClick={() => setAdminTab("my_status")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${adminTab === "my_status"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              My Status
            </button>
            <button
              type="button"
              onClick={() => setAdminTab("admin_panel")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${adminTab === "admin_panel"
                ? "bg-primary text-primary-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Shield className="size-3" />
              <span>Admin Center</span>
            </button>
          </div>
        )}
      </div>

      {/* ── User View ── */}
      {(!isAdmin || adminTab === "my_status") && (
        <div className="space-y-6">
          {/* 1. Verified State: Showcase & Badges Customization */}
          {isVerified ? (
            <div className="space-y-6">
              {/* Verified Card */}
              <div className="p-5 rounded-2xl border border-sky-500/30 bg-sky-500/5 backdrop-blur-xs space-y-3 shadow-inner">
                <div className="flex items-center gap-3.5">
                  <div className="size-11 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-md ring-4 ring-sky-500/20">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                      <span>Account Verified</span>
                      <VerifiedBadge size="md" />
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your identity is confirmed. You have unlocked exclusive creator customization and platform badges.
                    </p>
                  </div>
                </div>
              </div>

              {/* Discord-Inspired Profile Badge Preview */}
              <div className="p-5 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Sparkles className="size-4 text-amber-500" />
                      Live Profile Card Preview
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Hover over badges to see details
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground px-2.5 py-1 rounded-full bg-muted/60">
                    {equippedBadges.length}/5 Equipped
                  </span>
                </div>

                {/* Profile Badge Preview Box */}
                <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-11 ring-2 ring-primary/20">
                      <AvatarImage src={getAvatarUrl(user?.avatar ?? null)} alt={user?.name} />
                      <AvatarFallback className={`text-xs font-bold ${getAvatarGradient(user?.username || user?.name)}`}>
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-foreground">{user?.name}</span>
                        <VerifiedBadge size="sm" />
                        <UserBadges equippedBadges={equippedBadges} size="sm" />
                      </div>
                      <p className="text-xs text-muted-foreground">@{user?.username}</p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleSaveBadges}
                    disabled={savingBadges}
                    className="rounded-full px-5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-8 shadow-xs cursor-pointer"
                  >
                    {savingBadges ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin mr-1.5" />
                        Saving...
                      </>
                    ) : (
                      "Save Badges"
                    )}
                  </Button>
                </div>
              </div>

              {/* Badges Selector Grid */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Crown className="size-4 text-purple-500" />
                    Available Creator Badges
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click on any badge to equip or unequip it on your profile (Max 5)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.values(PLATFORM_BADGES).map((badge) => {
                    const isEquipped = equippedBadges.includes(badge.id);

                    return (
                      <div
                        key={badge.id}
                        onClick={() => handleToggleEquippedBadge(badge.id)}
                        className={cn(
                          "p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 select-none relative group",
                          isEquipped
                            ? "border-primary/60 bg-primary/10 shadow-xs ring-1 ring-primary/25"
                            : "border-border/70 bg-card hover:bg-muted/40 hover:border-border"
                        )}
                      >
                        <div
                          className={cn(
                            "size-7 rounded-full border flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-2xs",
                            badge.bgColor,
                            badge.borderColor,
                            badge.textColor
                          )}
                        >
                          <RenderBadgeIcon name={badge.iconName} className="size-3.5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-foreground truncate">
                            {badge.name}
                          </h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed truncate">
                            {badge.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : latestRequest?.status === "pending" ? (
            /* 2. Request Pending Review */
            <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-foreground">
                      Verification Request Under Review
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      Pending Review
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your request was submitted{" "}
                    {formatDistanceToNow(new Date(latestRequest.created_at), { addSuffix: true })}. Our team is reviewing your details.
                  </p>

                  <div className="mt-3 p-3 rounded-xl bg-card border border-border/60 text-xs space-y-1.5">
                    <div>
                      <span className="font-semibold text-muted-foreground">Category: </span>
                      <span className="text-foreground">{latestRequest.category}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-muted-foreground">Reason: </span>
                      <span className="text-foreground">{latestRequest.reason}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 3. New Application Form / Rejected State */
            <div className="space-y-6">
              {latestRequest?.status === "rejected" && (
                <div className="p-4 rounded-2xl border border-destructive/30 bg-destructive/5 space-y-2">
                  <div className="flex items-center gap-2 text-destructive text-xs font-bold">
                    <XCircle className="size-4" />
                    <span>Previous request was not approved</span>
                  </div>
                  {latestRequest.admin_notes && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <strong>Feedback:</strong> {latestRequest.admin_notes}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    You may submit an updated application below with additional details.
                  </p>
                </div>
              )}

              {/* Application Form */}
              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div>
                  <Label htmlFor="category" className="text-xs font-semibold text-foreground">
                    Select Your Category
                  </Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full mt-1.5 h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="reason" className="text-xs font-semibold text-foreground">
                    Why should your account be verified?
                  </Label>
                  <Textarea
                    id="reason"
                    required
                    placeholder="Describe your public work, brand, achievements, or paste verifiable social links..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1.5 min-h-[100px] text-sm rounded-xl resize-none"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground">
                    Supporting Document or ID (Optional)
                  </Label>
                  <div className="mt-1.5 flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/80 bg-muted/30 hover:bg-muted text-xs font-semibold cursor-pointer transition-colors">
                      <Upload className="size-3.5" />
                      <span>{documentFile ? documentFile.name : "Upload Document / Photo ID"}</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) setDocumentFile(e.target.files[0]);
                        }}
                      />
                    </label>
                    {documentFile && (
                      <button
                        type="button"
                        onClick={() => setDocumentFile(null)}
                        className="text-xs text-destructive hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={submitting || !reason.trim()}
                    className="rounded-full px-6 text-xs font-bold h-9 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin mr-1.5" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Verification Request"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ── Admin Panel View ── */}
      {isAdmin && adminTab === "admin_panel" && (
        <div className="space-y-5">
          {/* Admin Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <button
              type="button"
              onClick={() => setAdminSubTab("requests")}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                adminSubTab === "requests"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="size-3.5" />
              <span>Verification Requests</span>
            </button>

            <button
              type="button"
              onClick={() => setAdminSubTab("users")}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                adminSubTab === "users"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="size-3.5" />
              <span>User Accounts & Verification</span>
            </button>
          </div>

          {/* Sub-tab 1: Verification Requests */}
          {adminSubTab === "requests" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {(["all", "pending", "approved", "rejected"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setAdminFilter(filter)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold capitalize transition-colors cursor-pointer",
                      adminFilter === filter
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {adminLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="size-6 animate-spin mx-auto text-primary" />
                  <p className="mt-2 text-xs text-muted-foreground">Loading requests...</p>
                </div>
              ) : adminRequests.length === 0 ? (
                <div className="py-12 text-center p-6 border border-border/60 rounded-2xl bg-muted/20">
                  <ShieldCheck className="size-8 mx-auto text-muted-foreground mb-2" />
                  <h4 className="text-sm font-semibold text-foreground">No requests found</h4>
                  <p className="text-xs text-muted-foreground">
                    There are no {adminFilter !== "all" ? adminFilter : ""} requests.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {adminRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl border border-border/80 bg-card hover:border-border transition-all shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10 ring-1 ring-border">
                            <AvatarImage src={getAvatarUrl(req.user?.avatar ?? null)} />
                            <AvatarFallback className="bg-muted text-xs font-bold">
                              {req.user ? getInitials(req.user.name) : "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1">
                              <h4 className="text-sm font-bold text-foreground">
                                {req.user?.name}
                              </h4>
                              {Boolean(req.user?.verified) && <VerifiedBadge size="sm" />}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              @{req.user?.username} · {req.category}
                            </p>
                          </div>
                        </div>

                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize border",
                            req.status === "approved"
                              ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                              : req.status === "rejected"
                                ? "bg-destructive/15 text-destructive border-destructive/30"
                                : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          )}
                        >
                          {req.status}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-muted/40 border border-border/40 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                        {req.reason}
                      </div>

                      {req.document_url && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await api.get(req.document_url!, { responseType: "blob" });
                              const blob = new Blob([res.data], {
                                type: (res.headers["content-type"] as string) || "application/pdf",
                              });
                              const blobUrl = URL.createObjectURL(blob);
                              window.open(blobUrl, "_blank");
                            } catch {
                              toast.error("Failed to load verification document.");
                            }
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold cursor-pointer"
                        >
                          <FileText className="size-3.5" />
                          <span>View Attached Document</span>
                          <ExternalLink className="size-3" />
                        </button>
                      )}

                      {req.status === "pending" && (
                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/40">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdminReject(req.id)}
                            disabled={actionLoadingId === req.id}
                            className="rounded-full h-8 text-xs font-bold text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
                          >
                            <X className="size-3.5 mr-1" />
                            Reject
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleAdminApprove(req.id)}
                            disabled={actionLoadingId === req.id}
                            className="rounded-full h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                          >
                            {actionLoadingId === req.id ? (
                              <Loader2 className="size-3.5 animate-spin mr-1" />
                            ) : (
                              <Check className="size-3.5 mr-1" />
                            )}
                            Approve & Verify
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 2: User Accounts & Direct Verification Management */}
          {adminSubTab === "users" && (
            <div className="space-y-4">
              {/* Search & Filters */}
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name, @username, or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9 rounded-xl text-sm"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {(["all", "verified", "unverified", "admins"] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setUserFilter(filter)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold capitalize transition-colors cursor-pointer",
                        userFilter === filter
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Users List */}
              {usersLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="size-6 animate-spin mx-auto text-primary" />
                  <p className="mt-2 text-xs text-muted-foreground">Loading users...</p>
                </div>
              ) : adminUsers.length === 0 ? (
                <div className="py-12 text-center p-6 border border-border/60 rounded-2xl bg-muted/20">
                  <Users className="size-8 mx-auto text-muted-foreground mb-2" />
                  <h4 className="text-sm font-semibold text-foreground">No users found</h4>
                  <p className="text-xs text-muted-foreground">
                    Try adjusting your search query or filter.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {adminUsers.map((targetUser) => {
                    const isSelf = targetUser.id === user?.id;

                    return (
                      <div
                        key={targetUser.id}
                        className="p-3.5 rounded-2xl border border-border/80 bg-card hover:border-border transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        {/* User Meta */}
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="size-10 ring-1 ring-border shrink-0">
                            <AvatarImage src={getAvatarUrl(targetUser.avatar)} />
                            <AvatarFallback className={`text-xs font-bold ${getAvatarGradient(targetUser.username || targetUser.name)}`}>
                              {getInitials(targetUser.name)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-bold text-foreground truncate">
                                {targetUser.name}
                              </span>
                              {Boolean(targetUser.verified) && <VerifiedBadge size="sm" />}
                              {Boolean(targetUser.is_admin) && (
                                <span className="px-1.5 py-0.2 rounded-sm text-[9px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                                  ADMIN
                                </span>
                              )}
                              <UserBadges equippedBadges={targetUser.equipped_badges} size="xs" />
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              @{targetUser.username} · {targetUser.email}
                            </p>
                          </div>
                        </div>

                        {/* Admin Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {/* Direct Toggle Verification */}
                          <Button
                            size="sm"
                            variant={targetUser.verified ? "outline" : "default"}
                            disabled={userActionLoadingId === targetUser.id}
                            onClick={() => handleToggleUserVerification(targetUser)}
                            className={cn(
                              "rounded-full h-8 text-xs font-bold px-3.5 cursor-pointer",
                              targetUser.verified
                                ? "text-destructive hover:bg-destructive/10 border-destructive/30"
                                : "bg-sky-600 hover:bg-sky-700 text-white"
                            )}
                          >
                            {userActionLoadingId === targetUser.id ? (
                              <Loader2 className="size-3 animate-spin mr-1" />
                            ) : targetUser.verified ? (
                              <UserX className="size-3.5 mr-1" />
                            ) : (
                              <UserCheck className="size-3.5 mr-1" />
                            )}
                            {targetUser.verified ? "Revoke Verify" : "Verify Account"}
                          </Button>

                          {/* Delete User Button */}
                          {!isSelf && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteTargetUser(targetUser)}
                              className="size-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Delete Account"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={Boolean(deleteTargetUser)} onOpenChange={(open) => !open && setDeleteTargetUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete @{deleteTargetUser?.username} ({deleteTargetUser?.name})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingUser}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeletingUser}
            >
              {isDeletingUser ? "Deleting..." : "Permanently Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
