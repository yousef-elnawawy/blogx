"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ShieldAlert,
  UserX,
  VolumeX,
  Hash,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/api";
import { getAvatarUrl } from "@/lib/utils";

interface BlockedUser {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  verified: boolean;
  blocked_at: string | null;
}

interface MutedUser {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  verified: boolean;
  muted_at: string | null;
}

interface MutedKeyword {
  id: number;
  keyword: string;
  mute_type: string;
  expires_at: string | null;
  created_at: string | null;
}

interface PrivacySettingsProps {
  onBack: () => void;
}

export default function PrivacySettings({ onBack }: PrivacySettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"blocked" | "muted" | "keywords">("blocked");
  
  // Data states
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [mutedUsers, setMutedUsers] = useState<MutedUser[]>([]);
  const [mutedKeywords, setMutedKeywords] = useState<MutedKeyword[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // New keyword form
  const [newKeyword, setNewKeyword] = useState("");
  const [keywordDuration, setKeywordDuration] = useState<"forever" | "7_days" | "30_days">("forever");
  const [addingKeyword, setAddingKeyword] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchPrivacyData();
  }, []);

  const fetchPrivacyData = async () => {
    setLoading(true);
    try {
      const [blocksRes, mutesRes, keywordsRes] = await Promise.all([
        api.get("/api/blocks").catch(() => ({ data: { users: [] } })),
        api.get("/api/mutes").catch(() => ({ data: { users: [] } })),
        api.get("/api/muted-keywords").catch(() => ({ data: { keywords: [] } })),
      ]);

      setBlockedUsers(blocksRes.data.users || []);
      setMutedUsers(mutesRes.data.users || []);
      setMutedKeywords(keywordsRes.data.keywords || []);
    } catch (err) {
      console.error("Failed to load privacy data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId: number) => {
    setActionLoadingId(userId);
    try {
      await api.delete(`/api/blocks/${userId}`);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
      showFeedback("success", "User unblocked successfully");
    } catch (err) {
      showFeedback("error", "Failed to unblock user");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnmute = async (userId: number) => {
    setActionLoadingId(userId);
    try {
      await api.delete(`/api/mutes/${userId}`);
      setMutedUsers((prev) => prev.filter((u) => u.id !== userId));
      showFeedback("success", "User unmuted successfully");
    } catch (err) {
      showFeedback("error", "Failed to unmute user");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newKeyword.trim();
    if (!clean) return;

    setAddingKeyword(true);
    try {
      const res = await api.post("/api/muted-keywords", {
        keyword: clean,
        duration: keywordDuration,
      });

      setMutedKeywords((prev) => [res.data.keyword, ...prev]);
      setNewKeyword("");
      showFeedback("success", `"${clean}" added to muted words`);
    } catch (err: any) {
      showFeedback("error", err.response?.data?.message || "Failed to mute keyword");
    } finally {
      setAddingKeyword(false);
    }
  };

  const handleDeleteKeyword = async (id: number) => {
    setActionLoadingId(id);
    try {
      await api.delete(`/api/muted-keywords/${id}`);
      setMutedKeywords((prev) => prev.filter((k) => k.id !== id));
      showFeedback("success", "Keyword unmuted");
    } catch (err) {
      showFeedback("error", "Failed to remove muted keyword");
    } finally {
      setActionLoadingId(null);
    }
  };

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 rounded-full hover:bg-muted transition-colors text-foreground cursor-pointer"
            aria-label="Back to Settings"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">
              Privacy & Safety
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage blocked users, muted accounts, and hidden words
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl text-sm flex items-center gap-2.5 border transition-all ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <AlertCircle className="size-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Sub Navigation Tabs */}
        <div className="flex rounded-xl bg-muted/60 p-1 border border-border/50">
          <button
            type="button"
            onClick={() => setActiveSubTab("blocked")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeSubTab === "blocked"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserX className="size-4" />
            <span>Blocked ({blockedUsers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("muted")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeSubTab === "muted"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <VolumeX className="size-4" />
            <span>Muted ({mutedUsers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("keywords")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeSubTab === "keywords"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Hash className="size-4" />
            <span>Words ({mutedKeywords.length})</span>
          </button>
        </div>

        {/* Tab 1: Blocked Accounts */}
        {activeSubTab === "blocked" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground leading-relaxed">
              Blocked accounts cannot view your posts, send you messages, or find your profile. You will not see their posts, comments, or suggestions across the platform.
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : blockedUsers.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border/80">
                <UserX className="size-10 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-foreground">No blocked accounts</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  You haven&apos;t blocked any users yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60 border border-border/60 rounded-2xl overflow-hidden bg-card">
                {blockedUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-4 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative size-10 rounded-full overflow-hidden bg-muted shrink-0 border border-border/60">
                        {u.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getAvatarUrl(u.avatar)}
                            alt={u.name}
                            className="size-full object-cover rounded-full"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center font-bold text-xs text-muted-foreground">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {u.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          @{u.username}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnblock(u.id)}
                      disabled={actionLoadingId === u.id}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      {actionLoadingId === u.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        "Unblock"
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Muted Accounts */}
        {activeSubTab === "muted" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground leading-relaxed">
              Muting hides a user&apos;s posts from your feed without letting them know. They can still see your content and message you.
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : mutedUsers.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border/80">
                <VolumeX className="size-10 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-foreground">No muted accounts</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  You haven&apos;t muted any accounts yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60 border border-border/60 rounded-2xl overflow-hidden bg-card">
                {mutedUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-4 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative size-10 rounded-full overflow-hidden bg-muted shrink-0 border border-border/60">
                        {u.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getAvatarUrl(u.avatar)}
                            alt={u.name}
                            className="size-full object-cover rounded-full"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center font-bold text-xs text-muted-foreground">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {u.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          @{u.username}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnmute(u.id)}
                      disabled={actionLoadingId === u.id}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-border text-foreground hover:bg-muted transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      {actionLoadingId === u.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        "Unmute"
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Muted Words & Phrases */}
        {activeSubTab === "keywords" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground leading-relaxed">
              Posts containing these words or hashtags will not appear in your feeds or notifications.
            </div>

            {/* Add Keyword Form */}
            <form onSubmit={handleAddKeyword} className="p-4 rounded-2xl border border-border/60 bg-card space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Add word or phrase to mute
              </label>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="e.g. spoiler, politics, keyword"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  maxLength={100}
                />

                <select
                  value={keywordDuration}
                  onChange={(e) => setKeywordDuration(e.target.value as any)}
                  className="px-3 py-2 rounded-xl text-xs sm:text-sm border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="forever">Forever</option>
                  <option value="30_days">30 Days</option>
                  <option value="7_days">7 Days</option>
                </select>

                <button
                  type="submit"
                  disabled={addingKeyword || !newKeyword.trim()}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {addingKeyword ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="size-4" />
                      <span>Add</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Keywords List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : mutedKeywords.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border/80">
                <Hash className="size-10 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-foreground">No muted words</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Add words or hashtags you want to filter from your feed.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60 border border-border/60 rounded-2xl overflow-hidden bg-card">
                {mutedKeywords.map((k) => (
                  <div key={k.id} className="flex items-center justify-between p-3.5 sm:p-4 gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-foreground">
                        {k.keyword}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {k.expires_at ? `Expires ${new Date(k.expires_at).toLocaleDateString()}` : "Permanent"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteKeyword(k.id)}
                      disabled={actionLoadingId === k.id}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-50"
                      title="Unmute keyword"
                    >
                      {actionLoadingId === k.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
