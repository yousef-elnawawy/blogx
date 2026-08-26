"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserCheck, Tag, Loader2 } from "lucide-react";
import { messagesService } from "@/services/messages";
import { toast } from "sonner";

interface ContactNicknameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  userName: string;
  userUsername: string;
  initialNickname?: string | null;
  onNicknameUpdated: (nickname: string | null, displayName: string) => void;
}

export default function ContactNicknameDialog({
  open,
  onOpenChange,
  userId,
  userName,
  userUsername,
  initialNickname,
  onNicknameUpdated,
}: ContactNicknameDialogProps) {
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setNickname(initialNickname || "");
    }
  }, [open, initialNickname]);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      setLoading(true);
      const trimmed = nickname.trim();
      const res = await messagesService.setContactNickname(userId, trimmed || null);
      toast.success(trimmed ? "Private contact nickname set!" : "Nickname cleared");
      onNicknameUpdated(res.nickname, res.display_name);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to set nickname");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setNickname("");
    try {
      setLoading(true);
      const res = await messagesService.setContactNickname(userId, null);
      toast.info("Nickname removed");
      onNicknameUpdated(null, res.display_name);
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to clear nickname");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Tag className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Custom Contact Nickname</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Set a private name for @{userUsername}. Only you will see this name.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              Nickname / Alias
            </label>
            <Input
              type="text"
              placeholder={`e.g. ${userName} (Work)`}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={60}
              className="rounded-xl h-10 text-sm"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Original full name: <strong>{userName}</strong> (@{userUsername})
            </p>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2">
            {initialNickname ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={loading}
                className="text-xs text-destructive hover:bg-destructive/10 rounded-xl"
              >
                Clear Nickname
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="text-xs font-semibold rounded-xl gap-1.5"
              >
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <UserCheck className="size-3.5" />}
                Save Name
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
