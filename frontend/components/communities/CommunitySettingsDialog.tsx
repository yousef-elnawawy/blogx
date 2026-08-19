"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Settings, Globe, Lock, UserCheck, UserX, Loader2, Check, X, Shield, Trash2 } from "lucide-react";
import { getAvatarUrl, getInitials } from "@/lib/utils";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
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
import api from "@/lib/api";
import { toast } from "sonner";

interface CommunitySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  community: any;
  onCommunityUpdated?: (community: any) => void;
}

export default function CommunitySettingsDialog({
  open,
  onOpenChange,
  community,
  onCommunityUpdated,
}: CommunitySettingsDialogProps) {
  const [tab, setTab] = useState<"settings" | "requests">("settings");
  const [name, setName] = useState(community?.name || "");
  const [description, setDescription] = useState(community?.description || "");
  const [type, setType] = useState<"public" | "restricted">(community?.type || "public");
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteCommunity = async () => {
    if (!community?.id) return;
    setDeleting(true);
    try {
      await api.delete(`/api/communities/${community.id}`);
      toast.success("Community deleted successfully");
      onOpenChange(false);
      window.location.href = "/communities";
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete community");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  useEffect(() => {
    if (community) {
      setName(community.name);
      setDescription(community.description || "");
      setType(community.type || "public");
    }
  }, [community]);

  const loadRequests = async () => {
    if (!community?.id) return;
    setLoadingRequests(true);
    try {
      const res = await api.get(`/api/communities/${community.id}/join-requests`);
      setRequests(res.data.data || []);
    } catch {
      toast.error("Failed to load join requests");
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (open && tab === "requests") {
      loadRequests();
    }
  }, [open, tab, community?.id]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post(`/api/communities/${community.id}`, {
        name,
        description,
        type,
      });
      toast.success("Community settings updated!");
      if (onCommunityUpdated) onCommunityUpdated(res.data.community);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update community");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (userId: number) => {
    setProcessingId(userId);
    try {
      await api.post(`/api/communities/${community.id}/join-requests/${userId}/approve`);
      toast.success("Join request approved!");
      setRequests((prev) => prev.filter((r) => r.user_id !== userId));
    } catch {
      toast.error("Failed to approve request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: number) => {
    setProcessingId(userId);
    try {
      await api.post(`/api/communities/${community.id}/join-requests/${userId}/reject`);
      toast.success("Join request rejected");
      setRequests((prev) => prev.filter((r) => r.user_id !== userId));
    } catch {
      toast.error("Failed to reject request");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-6 bg-card border-border shadow-2xl rounded-3xl overflow-hidden max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-border/60">
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <Settings className="size-5 text-primary" />
            <span>Manage Community: {community?.name}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex rounded-2xl bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => setTab("settings")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
              tab === "settings"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => setTab("requests")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
              tab === "requests"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pending Requests ({requests.length})
          </button>
        </div>

        {tab === "settings" ? (
          <form onSubmit={handleUpdateSettings} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Community Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl border-border bg-background text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="rounded-xl border-border bg-background text-xs resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Privacy Policy</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType("public")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    type === "public"
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                      : "border-border bg-background text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Globe className="size-4" />
                    <span className="text-xs font-bold">Public</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Anyone can join & post</p>
                </button>

                <button
                  type="button"
                  onClick={() => setType("restricted")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    type === "restricted"
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                      : "border-border bg-background text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Lock className="size-4" />
                    <span className="text-xs font-bold">Approval Required</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Admin approves members</p>
                </button>
              </div>
            </div>

            {/* Danger Zone: Delete Community */}
            <div className="pt-4 mt-2 border-t border-destructive/20 space-y-2">
              <Label className="text-xs font-bold text-destructive">Danger Zone</Label>
              <div className="p-3 rounded-2xl border border-destructive/30 bg-destructive/5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-foreground">Delete this Community</p>
                  <p className="text-[11px] text-muted-foreground">Permanently delete this group and remove its members.</p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="rounded-full px-3.5 text-xs font-bold shrink-0 h-8"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  <span>Delete</span>
                </Button>
              </div>
            </div>

            <div className="-mx-6 -mb-6 mt-6 flex items-center justify-end gap-2 border-t border-border/60 bg-muted/50 p-4 rounded-b-3xl">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="rounded-full px-5 text-xs font-semibold shadow-2xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="rounded-full px-6 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                <span>Save Changes</span>
              </Button>
            </div>
          </form>
        ) : (
          /* Join Requests Tab */
          <div className="space-y-3 pt-1">
            {loadingRequests ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : requests.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Shield className="size-8 mx-auto mb-2 text-muted-foreground/60" />
                <p className="text-sm font-semibold">No pending requests</p>
                <p className="text-xs">New member requests will appear here for your approval.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-border/80 bg-background"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="size-9 ring-1 ring-border/40 shrink-0">
                        <AvatarImage src={getAvatarUrl(req.avatar)} alt={req.name} />
                        <AvatarFallback className="text-xs font-bold">
                          {getInitials(req.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-foreground truncate">{req.name}</span>
                          {Boolean(req.verified) && <VerifiedBadge size="xs" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground">@{req.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(req.user_id)}
                        disabled={processingId === req.user_id}
                        className="rounded-full size-8 p-0 text-destructive hover:bg-destructive/10 border-border"
                      >
                        <X className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(req.user_id)}
                        disabled={processingId === req.user_id}
                        className="rounded-full size-8 p-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      >
                        {processingId === req.user_id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>

      {/* Delete Community Confirmation Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Are you sure you want to delete this community?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This action cannot be undone. All posts in &quot;{community?.name}&quot; will be unlinked from the community and members will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={deleting}
              className="rounded-full text-xs font-semibold"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCommunity}
              disabled={deleting}
              className="rounded-full text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Trash2 className="size-3.5 mr-1.5" />}
              <span>Delete Community</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
