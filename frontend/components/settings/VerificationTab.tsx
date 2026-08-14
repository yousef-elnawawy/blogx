"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
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
  ExternalLink,
  Check,
  X,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { getAvatarUrl } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

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

const CATEGORIES = [
  "Content Creator / Influencer",
  "Journalist / Media / News",
  "Business / Brand / Organization",
  "Public Figure / Artist / Author",
  "Developer / Technology Leader",
  "Other",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function VerificationTab() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(Boolean(user?.verified));
  const [isAdmin, setIsAdmin] = useState(Boolean(user?.is_admin));
  const [latestRequest, setLatestRequest] = useState<VerificationData | null>(null);

  // Submission Form State
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [reason, setReason] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Admin View State
  const [adminTab, setAdminTab] = useState<"my_status" | "admin_panel">(
    user?.is_admin ? "admin_panel" : "my_status"
  );
  const [adminRequests, setAdminRequests] = useState<VerificationData[]>([]);
  const [adminFilter, setAdminFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [adminLoading, setAdminLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/verification/status");
      setIsVerified(res.data.is_verified);
      setIsAdmin(res.data.is_admin);
      setLatestRequest(res.data.latest_request);
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

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (isAdmin && adminTab === "admin_panel") {
      fetchAdminRequests(adminFilter);
    }
  }, [isAdmin, adminTab, adminFilter]);

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
      toast.success(res.data.message || "Request approved!");
      fetchAdminRequests();
      refreshUser();
    } catch {
      toast.error("Failed to approve request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAdminReject = async (id: number) => {
    const notes = window.prompt("Reason for rejection (optional feedback for user):", "Does not meet verification requirements at this time.");
    if (notes === null) return; // cancelled

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
      {/* Header with Admin Toggle */}
      <div className="border-b border-border/60 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
            <BadgeCheck className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Account Verification</h2>
            <p className="text-xs text-muted-foreground">
              Get the official verified badge next to your BlogX profile
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/50 shrink-0">
            <button
              type="button"
              onClick={() => setAdminTab("my_status")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${adminTab === "my_status"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              My Status
            </button>
            <button
              type="button"
              onClick={() => setAdminTab("admin_panel")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${adminTab === "admin_panel"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Shield className="size-3" />
              <span>Admin Panel</span>
            </button>
          </div>
        )}
      </div>

      {/* ── User View ── */}
      {(!isAdmin || adminTab === "my_status") && (
        <div className="space-y-6">
          {/* 1. Already Verified */}
          {isVerified ? (
            <div className="p-5 rounded-2xl border border-sky-500/30 bg-sky-500/5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <span>Your account is Verified</span>
                    <VerifiedBadge size="sm" />
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    You have an official verified badge confirmed on BlogX.
                  </p>
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
                      Pending Admin Review
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your request was submitted{" "}
                    {formatDistanceToNow(new Date(latestRequest.created_at), { addSuffix: true })}. Our admin team is reviewing your profile and will update your status soon.
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
            /* 3. New Request / Rejected State */
            <div className="space-y-6">
              {latestRequest?.status === "rejected" && (
                <div className="p-4 rounded-2xl border border-destructive/30 bg-destructive/5 space-y-2">
                  <div className="flex items-center gap-2 text-destructive text-xs font-bold">
                    <XCircle className="size-4" />
                    <span>Previous request was not approved</span>
                  </div>
                  {latestRequest.admin_notes && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <strong>Admin Feedback:</strong> {latestRequest.admin_notes}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    You may submit an updated request below with additional details or documents.
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
                    placeholder="Tell us about your public presence, work, achievements, or website links..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1.5 min-h-[100px] text-sm rounded-xl resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Provide verifiable links or reasons demonstrating public recognition.
                  </p>
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
                        className="text-xs text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    PNG, JPG, WEBP or PDF (max 10MB)
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={submitting || !reason.trim()}
                    className="rounded-full px-6 text-xs font-bold h-9 bg-primary text-primary-foreground hover:bg-primary/90"
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

      {/* ── Admin Panel View (Only for admins) ── */}
      {isAdmin && adminTab === "admin_panel" && (
        <div className="space-y-5">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(["all", "pending", "approved", "rejected"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setAdminFilter(filter)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold capitalize transition-colors ${adminFilter === filter
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Requests List */}
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
                There are no {adminFilter !== "all" ? adminFilter : ""} verification requests at the moment.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {adminRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl border border-border/80 bg-card hover:border-border transition-all shadow-sm space-y-3"
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

                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${req.status === "approved"
                          ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                          : req.status === "rejected"
                            ? "bg-destructive/15 text-destructive border border-destructive/30"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  {/* Reason text */}
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/40 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                    {req.reason}
                  </div>

                  {/* Document attachment if present */}
                  {req.document_url && (
                    <a
                      href={req.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
                    >
                      <FileText className="size-3.5" />
                      <span>View Attached Document</span>
                      <ExternalLink className="size-3" />
                    </a>
                  )}

                  {/* Admin Actions */}
                  {req.status === "pending" && (
                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/40">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAdminReject(req.id)}
                        disabled={actionLoadingId === req.id}
                        className="rounded-full h-8 text-xs font-bold text-destructive hover:bg-destructive/10 border-destructive/30"
                      >
                        <X className="size-3.5 mr-1" />
                        Reject
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleAdminApprove(req.id)}
                        disabled={actionLoadingId === req.id}
                        className="rounded-full h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
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
    </div>
  );
}
