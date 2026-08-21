"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  Image as ImageIcon,
  AlertTriangle,
  Mail,
  AtSign,
  FileText,
  Trash2,
  Plus,
  Share2,
  Globe,
  X,
} from "lucide-react";
import {
  cn,
  getAvatarUrl,
  getAvatarGradient,
  getDefaultBannerGradient,
  getInitials,
  detectSocialPlatform,
} from "@/lib/utils";
import DeleteAccountDialog from "@/components/settings/DeleteAccountDialog";
import { compressImage } from "@/lib/image-compress";
import SocialIcon from "@/components/ui/SocialIcon";

interface AccountSettingsProps {
  onBack: () => void;
}

export default function AccountSettings({ onBack }: AccountSettingsProps) {
  const { user, updateProfile } = useAuth();

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

  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);

  const [socialLinks, setSocialLinks] = useState<string[]>([]);
  const [newSocialInput, setNewSocialInput] = useState("");

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
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
      } else {
        setAvatarPreview(null);
      }
      if (user.cover) {
        setCoverPreview(getAvatarUrl(user.cover) || null);
      } else {
        setCoverPreview(null);
      }

      if (user.social_links) {
        const raw = user.social_links as any;
        const links: string[] = [];
        if (Array.isArray(raw)) {
          raw.forEach((item: any) => {
            if (typeof item === "string" && item.trim()) links.push(item);
            else if (item && typeof item === "object" && typeof item.url === "string") links.push(item.url);
          });
        } else if (raw && typeof raw === "object") {
          Object.values(raw).forEach((val: any) => {
            if (typeof val === "string" && val.trim()) links.push(val);
          });
        }
        setSocialLinks(links);
      }
    }
  }, [user]);

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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        toast.error("Avatar image must be under 100MB");
        return;
      }
      setRemoveAvatar(false);
      try {
        const optimized = await compressImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.90 });
        setAvatarFile(optimized);
        const reader = new FileReader();
        reader.onloadend = () => setAvatarPreview(reader.result as string);
        reader.readAsDataURL(optimized);
      } catch {
        setAvatarFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setAvatarPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        toast.error("Cover banner image must be under 100MB");
        return;
      }
      setRemoveCover(false);
      try {
        const optimized = await compressImage(file, { maxWidth: 2560, maxHeight: 1440, quality: 0.90 });
        setCoverFile(optimized);
        const reader = new FileReader();
        reader.onloadend = () => setCoverPreview(reader.result as string);
        reader.readAsDataURL(optimized);
      } catch {
        setCoverFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setCoverPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(true);
    toast.info("Avatar reset to default initials. Click Save to apply.");
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setRemoveCover(true);
    toast.info("Cover reset to default gradient banner. Click Save to apply.");
  };

  const handleAddSocialLink = () => {
    const clean = newSocialInput.trim();
    if (!clean) return;
    if (socialLinks.includes(clean)) {
      toast.error("This social link is already added.");
      return;
    }
    setSocialLinks((prev) => [...prev, clean]);
    setNewSocialInput("");
    toast.success("Social link added!");
  };

  const handleRemoveSocialLink = (index: number) => {
    setSocialLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrors({});
    setIsSaving(true);

    try {
      const updateData: Record<string, any> = {};

      if (formData.name !== user?.name) updateData.name = formData.name;
      if (formData.username !== user?.username) updateData.username = formData.username;
      if (formData.email !== user?.email) updateData.email = formData.email;
      if (formData.bio !== (user?.bio || "")) updateData.bio = formData.bio;
      if (formData.location !== (user?.location || "")) updateData.location = formData.location;
      if (formData.website !== (user?.website || "")) updateData.website = formData.website;
      if (avatarFile) updateData.avatar = avatarFile;
      if (coverFile) updateData.cover = coverFile;
      if (removeAvatar) updateData.remove_avatar = true;
      if (removeCover) updateData.remove_cover = true;

      updateData.social_links = socialLinks;

      await updateProfile(updateData as Parameters<typeof updateProfile>[0]);
      setAvatarFile(null);
      setCoverFile(null);
      setRemoveAvatar(false);
      setRemoveCover(false);
      toast.success("Profile updated successfully!");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        toast.error("Please fix the validation errors and try again.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const detectedNewPlatform = newSocialInput.trim() ? detectSocialPlatform(newSocialInput) : null;

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
                  Account & Profile
                </h1>
                <p className="text-[11px] text-muted-foreground">
                  Manage your personal identity, avatar, banner, and social links
                </p>
              </div>
            </div>
          </div>

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
        </div>
      </div>

      <form onSubmit={handleSubmit} className="divide-y divide-border/60">
        {/* Section 1: Cover Banner & Profile Avatar */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Cover Banner Section */}
          <div>
            <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ImageIcon className="size-4 text-blue-500" />
                  Profile Cover Banner
                </h3>
                <p className="text-xs text-muted-foreground">Recommended ratio 3:1 (JPG, PNG, WebP up to 100MB)</p>
              </div>

              <div className="flex items-center gap-2">
                {(coverPreview || user?.cover) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveCover}
                    className="h-8 rounded-full text-xs text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
                  >
                    <Trash2 className="size-3.5 mr-1" />
                    Reset to Default
                  </Button>
                )}

                <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border/80 bg-background hover:bg-muted text-xs font-semibold text-foreground cursor-pointer transition-colors shadow-2xs h-8">
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
            </div>

            <div className={cn(
              "relative h-36 sm:h-48 w-full rounded-2xl overflow-hidden border border-border/60 group shadow-inner",
              coverPreview ? "bg-muted" : getDefaultBannerGradient(user?.username || user?.name)
            )}>
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
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/40 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="relative group shrink-0">
                <div className={cn(
                  "size-16 sm:size-20 rounded-full border-2 border-border overflow-hidden flex items-center justify-center shadow-md ring-4 ring-background",
                  avatarPreview ? "bg-muted" : getAvatarGradient(user?.username || user?.name)
                )}>
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="text-xl sm:text-2xl font-extrabold text-white">
                      {getInitials(user?.name)}
                    </span>
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
                  Dynamic initials avatar used automatically if no photo uploaded
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(avatarPreview || user?.avatar) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  className="h-8 rounded-full text-xs text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Reset to Default
                </Button>
              )}

              <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border/80 bg-background hover:bg-muted text-xs font-semibold text-foreground cursor-pointer transition-colors shadow-2xs h-8">
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
        </div>

        {/* Section 2: Personal Information */}
        <div className="p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <User className="size-4 text-blue-500" />
              Personal Information
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Update your public name and unique username handle
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
                Username (@handle)
              </Label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
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
            <Label htmlFor="email" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Mail className="size-3.5 text-muted-foreground" />
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

        {/* Section 3: Biography & Location */}
        <div className="p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileText className="size-4 text-blue-500" />
              Biography & Location
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tell the community about yourself
            </p>
          </div>

          <div>
            <Label htmlFor="bio" className="text-xs font-semibold text-foreground">
              Bio
            </Label>
            <Textarea
              id="bio"
              placeholder="Write a brief bio about yourself..."
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
                Website URL
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
        </div>

        {/* Section 4: Social Media Links (Point 12) */}
        <div className="p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Share2 className="size-4 text-primary" />
              Social Media Accounts
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add your external social profiles (Facebook, Instagram, X, YouTube, GitHub, LinkedIn, etc.)
            </p>
          </div>

          {/* Add Social Link Input */}
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                  {detectedNewPlatform ? (
                    <SocialIcon name={detectedNewPlatform.iconName} className={cn("size-4", detectedNewPlatform.color)} />
                  ) : (
                    <LinkIcon className="size-4 text-muted-foreground" />
                  )}
                </div>
                <Input
                  placeholder="Paste URL (e.g. instagram.com/myname, github.com/user, x.com/...)"
                  value={newSocialInput}
                  onChange={(e) => setNewSocialInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSocialLink();
                    }
                  }}
                  className="pl-9 rounded-xl text-sm"
                />
              </div>

              <Button
                type="button"
                onClick={handleAddSocialLink}
                disabled={!newSocialInput.trim()}
                className="rounded-xl px-4 h-9 font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs shadow-2xs cursor-pointer"
              >
                <Plus className="size-4 mr-1" />
                Add Link
              </Button>
            </div>

            {detectedNewPlatform && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
                <span>Detected platform:</span>
                <span className={cn("font-bold", detectedNewPlatform.color)}>
                  {detectedNewPlatform.name}
                </span>
              </div>
            )}
          </div>

          {/* Saved Social Links List */}
          {socialLinks.length > 0 ? (
            <div className="space-y-2 pt-1">
              {socialLinks.map((linkUrl, idx) => {
                const platformInfo = detectSocialPlatform(linkUrl);
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-card hover:bg-muted/50 transition-colors shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                      <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0", platformInfo.bgColor)}>
                        <SocialIcon name={platformInfo.iconName} className={cn("size-4", platformInfo.color)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-xs font-bold leading-tight", platformInfo.color)}>
                          {platformInfo.name}
                        </p>
                        <a
                          href={platformInfo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-muted-foreground hover:underline truncate block"
                        >
                          {platformInfo.url}
                        </a>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSocialLink(idx)}
                      className="size-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-border/70 text-center text-xs text-muted-foreground bg-muted/20">
              No social accounts added yet. Paste a link above to display it on your profile.
            </div>
          )}
        </div>

        {/* Section 5: Danger Zone */}
        <div className="p-5 sm:p-6 space-y-3 bg-destructive/5 border-t border-destructive/20">
          <h3 className="text-sm font-bold text-destructive flex items-center gap-1.5">
            <AlertTriangle className="size-4" />
            Danger Zone
          </h3>
          <p className="text-xs text-muted-foreground">
            Permanently delete your BlogX account and all associated posts, blogs, series, and bookmarks. This action cannot be undone.
          </p>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="rounded-full text-xs font-bold px-4 h-9 cursor-pointer shadow-xs"
          >
            Delete Account
          </Button>
        </div>
      </form>

      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </div>
  );
}
