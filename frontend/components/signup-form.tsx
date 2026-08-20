"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BACKEND_URL } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import axios from "axios";
import confetti from "canvas-confetti";
import {
  User,
  Mail,
  Lock,
  MapPin,
  Globe,
  FileText,
  Check,
  ChevronRight,
  ChevronLeft,
  Camera,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ArrowRight,
  PartyPopper,
  Compass,
  AtSign,
} from "lucide-react";

const steps = [
  { id: 1, label: "Account", icon: User },
  { id: 2, label: "Profile", icon: FileText },
  { id: 3, label: "Ready", icon: Check },
];

export function SignUpForm() {
  const { register, updateProfile } = useAuth();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    bio: "",
    location: "",
    website: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Live Password Criteria & Strength Calculation
  const passwordCriteria = useMemo(() => {
    const pwd = formData.password;
    const hasMinLength = pwd.length >= 8;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumbers = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    const isMatching = pwd.length > 0 && pwd === formData.confirmPassword;

    return {
      hasMinLength,
      hasUpperLower: hasUpper && hasLower,
      hasNumbers,
      hasSpecial,
      isMatching,
    };
  }, [formData.password, formData.confirmPassword]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (passwordCriteria.hasMinLength) score += 25;
    if (passwordCriteria.hasUpperLower) score += 25;
    if (passwordCriteria.hasNumbers) score += 25;
    if (passwordCriteria.hasSpecial || formData.password.length >= 12) score += 25;
    return score;
  }, [passwordCriteria, formData.password]);

  const strengthInfo = useMemo(() => {
    if (formData.password.length === 0) {
      return { label: "", color: "bg-muted", textClass: "text-muted-foreground" };
    }
    if (strengthScore <= 25) {
      return { label: "Weak", color: "bg-destructive", textClass: "text-destructive" };
    }
    if (strengthScore <= 50) {
      return { label: "Fair", color: "bg-amber-500", textClass: "text-amber-500" };
    }
    if (strengthScore <= 75) {
      return { label: "Good", color: "bg-blue-500", textClass: "text-blue-500" };
    }
    return { label: "Strong & Secure", color: "bg-emerald-500", textClass: "text-emerald-500" };
  }, [strengthScore, formData.password]);

  // Trigger Celebratory Confetti on Step 3 (First-time registration only)
  useEffect(() => {
    if (currentStep === 3) {
      // Big initial explosion
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#d97706", "#2563eb", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"],
      });

      // Side fireworks cannons
      const end = Date.now() + 2000;
      const interval: NodeJS.Timeout = setInterval(() => {
        if (Date.now() > end) {
          clearInterval(interval);
          return;
        }

        confetti({
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          origin: {
            x: Math.random(),
            y: Math.random() - 0.2,
          },
          colors: ["#d97706", "#10b981", "#3b82f6", "#f59e0b"],
        });
      }, 350);

      return () => clearInterval(interval);
    }
  }, [currentStep]);

  const updateField = (field: string, value: string) => {
    let cleanVal = value;
    if (field === "username") {
      cleanVal = value.toLowerCase().replace(/[^a-zA-Z0-9_]/g, "");
    }
    setFormData((prev) => ({ ...prev, [field]: cleanVal }));
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

  const canProceedStep1 = () => {
    return (
      formData.name.trim().length >= 2 &&
      formData.username.trim().length >= 3 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
      passwordCriteria.hasMinLength &&
      passwordCriteria.isMatching
    );
  };

  const handleCreateAccount = async () => {
    setErrors({});
    setIsLoading(true);

    try {
      await register({
        name: formData.name,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
      });

      // Submit optional profile details if provided
      const hasProfileData =
        formData.bio || formData.location || formData.website || avatarFile;
      if (hasProfileData) {
        try {
          const profileData: Record<string, string | File> = {};
          if (formData.bio) profileData.bio = formData.bio;
          if (formData.location) profileData.location = formData.location;
          if (formData.website) profileData.website = formData.website;
          if (avatarFile) profileData.avatar = avatarFile;
          await updateProfile(profileData as Parameters<typeof updateProfile>[0]);
        } catch {
          // Profile optional update failed silently without blocking registration
        }
      }

      toast.success("Account created successfully! Welcome to BlogX.");
      setCurrentStep(3);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        const apiErrors = err.response.data.errors || {};
        setErrors(apiErrors);
        const step1Fields = ["name", "username", "email", "password", "password_confirmation"];
        if (step1Fields.some((f) => apiErrors[f])) {
          setCurrentStep(1);
        }
        toast.error("Please review the highlighted errors.");
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 2) {
      handleCreateAccount();
    } else if (currentStep < 3) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Polished Stepper Progress Indicator */}
      <div className="px-1">
        <div className="flex items-center justify-between relative">
          {/* Background Track Line */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-border -z-0" />
          {/* Active Progress Line */}
          <div
            className="absolute top-4 left-6 h-0.5 bg-primary transition-all duration-500 ease-out -z-0"
            style={{
              width:
                currentStep === 1
                  ? "0%"
                  : currentStep === 2
                  ? "50%"
                  : "calc(100% - 48px)",
            }}
          />

          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <div
                key={step.id}
                className="flex flex-col items-center gap-2 relative z-10"
              >
                <div
                  className={cn(
                    "size-8 sm:size-9 rounded-full flex items-center justify-center font-semibold text-xs transition-all duration-300",
                    isCompleted
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-100"
                      : isCurrent
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-md shadow-primary/25 scale-105"
                      : "bg-card border-2 border-border text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-4 stroke-[2.5]" />
                  ) : (
                    <step.icon className="size-4" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium transition-colors tracking-tight",
                    isCurrent
                      ? "text-foreground font-semibold"
                      : isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Account Info */}
      {currentStep === 1 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
          {/* Header */}
          <div className="text-center sm:text-left space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-fraunces)]">
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Join BlogX to share ideas and stories
            </p>
          </div>

          {/* Google Sign Up Button */}
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              window.location.href = `${BACKEND_URL}/auth/google/redirect`;
            }}
            className="h-11 w-full rounded-xl border border-border/80 bg-card/70 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground text-sm font-semibold transition-all flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.99] cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              className="shrink-0"
            >
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.11 0-5.74-2.1-6.68-4.92H1.26v3.15C3.26 21.32 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.32 14.28a7.169 7.169 0 0 1 0-4.56V6.57H1.26a11.908 11.908 0 0 0 0 10.86l4.06-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.68 1.26 6.57l4.06 3.15c.94-2.82 3.57-4.97 6.68-4.97z"
              />
            </svg>
            <span>Sign up with Google</span>
          </Button>

          {/* Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-medium">
              <span className="bg-background px-3 text-muted-foreground">
                Or fill details manually
              </span>
            </div>
          </div>

          {/* Inputs Grid */}
          <div className="space-y-3.5">
            {/* Name and Username in 2 columns on sm screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-foreground text-xs font-semibold flex items-center gap-1.5">
                  <User className="size-3.5 text-muted-foreground" />
                  <span>Full Name</span>
                </Label>
                <div className="relative">
                  <Input
                    id="name"
                    placeholder="Alex Morgan"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className={cn(
                      "h-11 px-3.5 rounded-xl border-border bg-card/70 backdrop-blur-sm text-sm focus-visible:ring-2 focus-visible:ring-primary/20",
                      errors.name && "border-destructive focus-visible:ring-destructive/20"
                    )}
                  />
                </div>
                {errors.name && (
                  <p className="text-xs text-destructive mt-1 font-medium">{errors.name[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-foreground text-xs font-semibold flex items-center gap-1.5">
                  <AtSign className="size-3.5 text-muted-foreground" />
                  <span>Username</span>
                </Label>
                <div className="relative">
                  <Input
                    id="username"
                    placeholder="alex_morgan"
                    value={formData.username}
                    onChange={(e) => updateField("username", e.target.value)}
                    className={cn(
                      "h-11 px-3.5 rounded-xl border-border bg-card/70 backdrop-blur-sm text-sm focus-visible:ring-2 focus-visible:ring-primary/20",
                      errors.username && "border-destructive focus-visible:ring-destructive/20"
                    )}
                  />
                </div>
                {errors.username && (
                  <p className="text-xs text-destructive mt-1 font-medium">{errors.username[0]}</p>
                )}
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-foreground text-xs font-semibold flex items-center gap-1.5">
                <Mail className="size-3.5 text-muted-foreground" />
                <span>Email Address</span>
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="alex@example.com"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={cn(
                    "h-11 px-3.5 rounded-xl border-border bg-card/70 backdrop-blur-sm text-sm focus-visible:ring-2 focus-visible:ring-primary/20",
                    errors.email && "border-destructive focus-visible:ring-destructive/20"
                  )}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive mt-1 font-medium">{errors.email[0]}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-foreground text-xs font-semibold flex items-center gap-1.5">
                <Lock className="size-3.5 text-muted-foreground" />
                <span>Password</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  className={cn(
                    "h-11 pl-3.5 pr-10 rounded-xl border-border bg-card/70 backdrop-blur-sm text-sm focus-visible:ring-2 focus-visible:ring-primary/20",
                    errors.password && "border-destructive focus-visible:ring-destructive/20"
                  )}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              {/* Live Password Strength Meter & Interactive Checklist */}
              {formData.password.length > 0 && (
                <div className="space-y-2 pt-1.5 animate-in fade-in duration-200">
                  {/* Strength Bar */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground text-[11px] font-medium">
                      Password strength:
                    </span>
                    <span className={cn("text-[11px] font-bold", strengthInfo.textClass)}>
                      {strengthInfo.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        strengthScore >= 25 ? strengthInfo.color : "bg-muted"
                      )}
                    />
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        strengthScore >= 50 ? strengthInfo.color : "bg-muted"
                      )}
                    />
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        strengthScore >= 75 ? strengthInfo.color : "bg-muted"
                      )}
                    />
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        strengthScore === 100 ? strengthInfo.color : "bg-muted"
                      )}
                    />
                  </div>

                  {/* Requirements Checklist */}
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
                    <div
                      className={cn(
                        "flex items-center gap-1.5 transition-colors",
                        passwordCriteria.hasMinLength
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {passwordCriteria.hasMinLength ? (
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle className="size-3.5 shrink-0 text-muted-foreground/60" />
                      )}
                      <span>8+ characters</span>
                    </div>

                    <div
                      className={cn(
                        "flex items-center gap-1.5 transition-colors",
                        passwordCriteria.hasUpperLower
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {passwordCriteria.hasUpperLower ? (
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle className="size-3.5 shrink-0 text-muted-foreground/60" />
                      )}
                      <span>Upper & lower case</span>
                    </div>

                    <div
                      className={cn(
                        "flex items-center gap-1.5 transition-colors",
                        passwordCriteria.hasNumbers
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {passwordCriteria.hasNumbers ? (
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle className="size-3.5 shrink-0 text-muted-foreground/60" />
                      )}
                      <span>At least one number</span>
                    </div>

                    <div
                      className={cn(
                        "flex items-center gap-1.5 transition-colors",
                        passwordCriteria.isMatching
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {passwordCriteria.isMatching ? (
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle className="size-3.5 shrink-0 text-muted-foreground/60" />
                      )}
                      <span>Passwords match</span>
                    </div>
                  </div>
                </div>
              )}

              {errors.password && (
                <p className="text-xs text-destructive mt-1 font-medium">{errors.password[0]}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-foreground text-xs font-semibold flex items-center gap-1.5">
                <Lock className="size-3.5 text-muted-foreground" />
                <span>Confirm Password</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  className={cn(
                    "h-11 pl-3.5 pr-10 rounded-xl border-border bg-card/70 backdrop-blur-sm text-sm focus-visible:ring-2 focus-visible:ring-primary/20",
                    formData.confirmPassword &&
                      !passwordCriteria.isMatching &&
                      "border-destructive focus-visible:ring-destructive/20"
                  )}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {formData.confirmPassword && !passwordCriteria.isMatching && (
                <p className="text-xs text-destructive mt-1 font-medium">
                  Passwords do not match
                </p>
              )}
            </div>
          </div>

          {/* Next Button */}
          <Button
            type="button"
            onClick={handleNext}
            disabled={!canProceedStep1()}
            className="h-11 w-full rounded-xl font-semibold text-sm bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>Next: Customize Profile</span>
            <ChevronRight className="size-4" />
          </Button>

          {/* Sign In Link */}
          <p className="text-center text-xs text-muted-foreground pt-1">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary underline underline-offset-4 hover:text-foreground font-semibold transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      )}

      {/* Step 2: Profile Customization */}
      {currentStep === 2 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
          <div className="text-center sm:text-left space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-fraunces)]">
              Personalize Profile
            </h1>
            <p className="text-sm text-muted-foreground">
              Add your photo and bio (optional)
            </p>
          </div>

          {/* Avatar Upload */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative group">
              <div
                className={cn(
                  "size-24 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden transition-all group-hover:border-primary bg-card/70 shadow-sm",
                  avatarPreview && "border-solid border-primary ring-4 ring-primary/10"
                )}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
                    <Camera className="size-7" />
                    <span className="text-[10px] font-medium">Upload</span>
                  </div>
                )}
              </div>
              <label className="absolute inset-0 cursor-pointer rounded-full" aria-label="Upload photo">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarPreview(null);
                    setAvatarFile(null);
                  }}
                  className="absolute -top-1 -right-1 size-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs hover:scale-110 transition-transform shadow-md cursor-pointer"
                  title="Remove avatar"
                >
                  ×
                </button>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground mt-2">
              Click to choose avatar photo (PNG, JPG, max 5MB)
            </span>
          </div>

          <div className="space-y-3.5">
            {/* Bio */}
            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-foreground text-xs font-semibold flex items-center gap-1.5">
                <FileText className="size-3.5 text-muted-foreground" />
                <span>Bio / About You</span>
              </Label>
              <div className="relative">
                <Textarea
                  id="bio"
                  placeholder="Share a short bio about what you write, think, or create..."
                  value={formData.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  className="p-3.5 rounded-xl border-border bg-card/70 backdrop-blur-sm text-sm focus-visible:ring-2 focus-visible:ring-primary/20 min-h-[85px] resize-none"
                />
              </div>
            </div>

            {/* Location & Website */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="location" className="text-foreground text-xs font-semibold flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  <span>Location</span>
                </Label>
                <div className="relative">
                  <Input
                    id="location"
                    placeholder="San Francisco, CA"
                    value={formData.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    className="h-11 px-3.5 rounded-xl border-border bg-card/70 backdrop-blur-sm text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="website" className="text-foreground text-xs font-semibold flex items-center gap-1.5">
                  <Globe className="size-3.5 text-muted-foreground" />
                  <span>Website / Portfolio</span>
                </Label>
                <div className="relative">
                  <Input
                    id="website"
                    placeholder="https://yourblog.com"
                    value={formData.website}
                    onChange={(e) => updateField("website", e.target.value)}
                    className="h-11 px-3.5 rounded-xl border-border bg-card/70 backdrop-blur-sm text-sm focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={isLoading}
              className="h-11 flex-1 rounded-xl border border-border/80 hover:bg-accent text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="size-4" />
              <span>Back</span>
            </Button>

            <Button
              type="button"
              onClick={handleNext}
              disabled={isLoading}
              className="h-11 flex-1 rounded-xl font-semibold text-sm bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>Complete Signup</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: First-Time Welcome Celebration Experience */}
      {currentStep === 3 && (
        <div className="flex flex-col items-center text-center py-6 animate-in zoom-in-95 duration-500">
          {/* Celebratory Glowing Badge */}
          <div className="relative mb-5">
            <div className="size-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center ring-8 ring-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xl">
              <PartyPopper className="size-9 stroke-[2.2] animate-bounce" />
            </div>
          </div>

          {/* Personalized Welcome Header */}
          <div className="space-y-2 mb-5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-fraunces)]">
              Welcome to BlogX, {formData.name ? formData.name.split(" ")[0] : "Friend"}! 🎉
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Your account is ready! Discover what you can do on BlogX:
            </p>
          </div>

          {/* Quick Platform Tour Cards */}
          <div className="w-full grid grid-cols-1 gap-2.5 mb-6 text-left">
            <div className="p-3 rounded-2xl border border-border/70 bg-card/60 flex items-start gap-3">
              <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="size-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Write & Share Posts</h4>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Publish rich short posts, photos, polls, and long-form blog stories.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl border border-border/70 bg-card/60 flex items-start gap-3">
              <div className="size-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                <Compass className="size-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Explore Communities</h4>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Join specialized forums, engage in niche discussions, or create your own space.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl border border-border/70 bg-card/60 flex items-start gap-3">
              <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                <AtSign className="size-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Connect with Creators</h4>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Follow inspiring authors, exchange live messages, and grow your audience.
                </p>
              </div>
            </div>
          </div>

          {/* Onboarding Action CTAs */}
          <div className="w-full space-y-2.5 pt-1">
            <Button
              type="button"
              onClick={() => router.push("/")}
              className="h-11 w-full rounded-xl font-bold text-xs sm:text-sm bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Compass className="size-4" />
              <span>Start Exploring Feed</span>
              <ArrowRight className="size-4 ml-auto sm:ml-1" />
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/@${formData.username || ""}`)}
              className="h-10 w-full rounded-xl border border-border/80 hover:bg-accent text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <User className="size-3.5" />
              <span>View My Profile</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}