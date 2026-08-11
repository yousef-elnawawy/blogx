"use client";

import { useState, useMemo } from "react";
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
import {
  User,
  Mail,
  Lock,
  MapPin,
  Link as LinkIcon,
  FileText,
  Check,
  ChevronRight,
  ChevronLeft,
  Camera,
  Sparkles,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  XCircle,
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

  // Live Password Strength Calculation
  const passwordCriteria = useMemo(() => {
    const pwd = formData.password;
    return {
      hasMinLength: pwd.length >= 8,
      hasLetters: /[a-zA-Z]/.test(pwd),
      hasNumbers: /[0-9]/.test(pwd),
      hasSpecial: /[^a-zA-Z0-9]/.test(pwd),
      isMatching: pwd.length > 0 && pwd === formData.confirmPassword,
    };
  }, [formData.password, formData.confirmPassword]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (passwordCriteria.hasMinLength) score += 25;
    if (passwordCriteria.hasLetters) score += 25;
    if (passwordCriteria.hasNumbers) score += 25;
    if (passwordCriteria.hasSpecial) score += 25;
    return score;
  }, [passwordCriteria]);

  const strengthLabel = useMemo(() => {
    if (strengthScore === 0) return { text: "Too Short", color: "bg-muted text-muted-foreground" };
    if (strengthScore <= 50) return { text: "Weak", color: "bg-destructive text-destructive-foreground" };
    if (strengthScore <= 75) return { text: "Good", color: "bg-amber-500 text-white" };
    return { text: "Strong & Secure", color: "bg-emerald-500 text-white" };
  }, [strengthScore]);

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
      passwordCriteria.hasLetters &&
      passwordCriteria.hasNumbers &&
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

      // Submit optional profile details
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
          // Profile optional update failure
        }
      }

      toast.success("Account created successfully! Welcome to BlogX.");
      setCurrentStep(3);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        const apiErrors = err.response.data.errors || {};
        setErrors(apiErrors);
        const step1Fields = ["name", "username", "email", "password"];
        if (step1Fields.some((f) => apiErrors[f])) {
          setCurrentStep(1);
        }
        toast.error("Please resolve validation errors to proceed.");
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
    <div className="w-full">
      {/* Timeline Steps */}
      <div className="mb-8 px-2">
        <div className="flex items-center">
          {steps.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isLast = index === steps.length - 1;

            return (
              <div
                key={step.id}
                className="flex items-center flex-1 last:flex-none"
              >
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                      isCompleted
                        ? "bg-primary border-primary text-primary-foreground"
                        : isCurrent
                        ? "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20 shadow-lg shadow-primary/20"
                        : "bg-background border-border text-muted-foreground"
                    )}
                  >
                    <step.icon className="size-5" />
                  </div>
                  <span
                    className={cn(
                      "text-xs font-semibold transition-colors",
                      isCurrent ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-3 -mt-5 transition-colors duration-500",
                      isCompleted ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Account Info */}
      {currentStep === 1 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Join BlogX in seconds to share ideas and stories
            </p>
          </div>

          <Button
            variant="outline"
            type="button"
            onClick={() => {
              window.location.href = `${BACKEND_URL}/auth/google/redirect`;
            }}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl border-border bg-card/80 py-5 font-medium hover:bg-accent text-foreground transition-all cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="18"
              height="18"
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
            Sign up with Google
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground font-semibold">
                Or fill details manually
              </span>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-foreground text-xs font-semibold">
                Full name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="Alex Morgan"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className={cn(
                    "pl-9 rounded-xl border-border bg-card/80 focus:border-ring focus:ring-ring/20",
                    errors.name && "border-destructive focus:border-destructive"
                  )}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-foreground text-xs font-semibold">
                Username
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                  @
                </span>
                <Input
                  id="username"
                  placeholder="alex_morgan"
                  value={formData.username}
                  onChange={(e) => updateField("username", e.target.value)}
                  className={cn(
                    "pl-8 rounded-xl border-border bg-card/80 focus:border-ring focus:ring-ring/20",
                    errors.username && "border-destructive focus:border-destructive"
                  )}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-destructive mt-1">{errors.username[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-foreground text-xs font-semibold">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="alex@example.com"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={cn(
                    "pl-9 rounded-xl border-border bg-card/80 focus:border-ring focus:ring-ring/20",
                    errors.email && "border-destructive focus:border-destructive"
                  )}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email[0]}</p>
              )}
            </div>

            {/* Password with Strength Meter */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-foreground text-xs font-semibold">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  className={cn(
                    "pl-9 pr-10 rounded-xl border-border bg-card/80 focus:border-ring focus:ring-ring/20",
                    errors.password && "border-destructive focus:border-destructive"
                  )}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              {/* Password Strength Progress Bar */}
              {formData.password.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-medium">Strength:</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", strengthLabel.color)}>
                      {strengthLabel.text}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden flex gap-1">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        strengthScore <= 25
                          ? "bg-destructive w-1/4"
                          : strengthScore <= 50
                          ? "bg-amber-500 w-2/4"
                          : strengthScore <= 75
                          ? "bg-blue-500 w-3/4"
                          : "bg-emerald-500 w-full"
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] pt-1">
                    <div className={cn("flex items-center gap-1.5", passwordCriteria.hasMinLength ? "text-emerald-500" : "text-muted-foreground")}>
                      {passwordCriteria.hasMinLength ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                      8+ Characters
                    </div>
                    <div className={cn("flex items-center gap-1.5", passwordCriteria.hasLetters ? "text-emerald-500" : "text-muted-foreground")}>
                      {passwordCriteria.hasLetters ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                      Includes Letters
                    </div>
                    <div className={cn("flex items-center gap-1.5", passwordCriteria.hasNumbers ? "text-emerald-500" : "text-muted-foreground")}>
                      {passwordCriteria.hasNumbers ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                      Includes Numbers
                    </div>
                    <div className={cn("flex items-center gap-1.5", passwordCriteria.isMatching ? "text-emerald-500" : "text-muted-foreground")}>
                      {passwordCriteria.isMatching ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                      Passwords Match
                    </div>
                  </div>
                </div>
              )}
              {errors.password && (
                <p className="text-xs text-destructive mt-1">{errors.password[0]}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-foreground text-xs font-semibold">
                Confirm password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  className={cn(
                    "pl-9 pr-10 rounded-xl border-border bg-card/80 focus:border-ring focus:ring-ring/20",
                    formData.confirmPassword && !passwordCriteria.isMatching && "border-destructive focus:border-destructive"
                  )}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button
            onClick={handleNext}
            disabled={!canProceedStep1()}
            className="w-full rounded-xl font-semibold py-6 text-sm mt-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all cursor-pointer"
          >
            Next: Customize Profile
            <ChevronRight className="size-4 ml-1" />
          </Button>

          <p className="text-center text-xs text-muted-foreground pt-2">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary underline underline-offset-4 hover:text-foreground font-semibold"
            >
              Sign In
            </Link>
          </p>
        </div>
      )}

      {/* Step 2: Profile Customization */}
      {currentStep === 2 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Customize Your Profile
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Add your bio and photo to stand out (optional)
            </p>
          </div>

          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="relative group">
              <div
                className={cn(
                  "size-24 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden transition-colors group-hover:border-primary bg-card/80",
                  avatarPreview && "border-solid border-primary"
                )}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="size-full object-cover"
                  />
                ) : (
                  <Camera className="size-8 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
              <label className="absolute inset-0 cursor-pointer rounded-full">
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
                  className="absolute -top-1 -right-1 size-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs hover:scale-110 transition-transform shadow-md"
                >
                  ×
                </button>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              Click to choose avatar
            </span>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-foreground text-xs font-semibold">
                Bio
              </Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Textarea
                  id="bio"
                  placeholder="Share a short bio about what you write and think..."
                  value={formData.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  className="pl-9 rounded-xl border-border bg-card/80 focus:border-ring focus:ring-ring/20 min-h-[90px] resize-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-foreground text-xs font-semibold">
                Location
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder="San Francisco, CA"
                  value={formData.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  className="pl-9 rounded-xl border-border bg-card/80 focus:border-ring focus:ring-ring/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="website" className="text-foreground text-xs font-semibold">
                Personal Website
              </Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="website"
                  placeholder="https://yourblog.com"
                  value={formData.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  className="pl-9 rounded-xl border-border bg-card/80 focus:border-ring focus:ring-ring/20"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1 rounded-xl border-border hover:bg-accent py-6 font-semibold"
            >
              <ChevronLeft className="size-4 mr-1" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={isLoading}
              className="flex-1 rounded-xl font-semibold py-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  Complete Registration
                  <Sparkles className="size-4 ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Success Welcome */}
      {currentStep === 3 && (
        <div className="flex flex-col items-center text-center py-8 animate-in zoom-in-95 duration-500">
          <div className="size-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 ring-4 ring-emerald-500/20 text-emerald-500 shadow-xl">
            <Check className="size-10 stroke-[3]" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
            Welcome to BlogX!
          </h1>
          <p className="text-muted-foreground text-sm mb-8 max-w-xs leading-relaxed">
            Your account is ready. Explore articles, connect with authors, or publish your first story.
          </p>

          <div className="w-full space-y-3">
            <Button
              className="w-full rounded-xl font-semibold py-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 cursor-pointer"
              onClick={() => router.push("/")}
            >
              Start Exploring Feed
              <ChevronRight className="size-4 ml-1.5" />
            </Button>

            <Button
              variant="outline"
              className="w-full rounded-xl border-border hover:bg-accent py-5 text-sm font-semibold"
              onClick={() => router.push("/settings")}
            >
              Account Settings & Security
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}