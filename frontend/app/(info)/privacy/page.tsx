"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Eye,
  UserCheck,
  Trash2,
  Bell,
  CheckCircle2,
} from "lucide-react";

export default function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = "Privacy Policy — BlogX";
  }, []);

  return (
    <div className="py-12 sm:py-20 px-4 sm:px-6 max-w-4xl mx-auto space-y-12 text-foreground">
      {/* Header */}
      <div className="space-y-4 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="size-4" />
          <span>Simple & Transparent</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-[family-name:var(--font-fraunces)] text-foreground">
          Privacy Policy
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Your privacy matters to us. Here is a clear, simple explanation of how
          BlogX handles your information.
        </p>

        <p className="text-xs text-muted-foreground">
          Last updated: August 2026
        </p>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-2">
          <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <UserCheck className="size-5" />
          </div>
          <h3 className="font-bold text-sm text-foreground">You Own Your Data</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Everything you post, upload, or write belongs to you. You can edit or delete it anytime.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-2">
          <div className="size-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Lock className="size-5" />
          </div>
          <h3 className="font-bold text-sm text-foreground">No Selling Data</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We never sell your personal information or email address to advertisers or third parties.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-2">
          <div className="size-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Trash2 className="size-5" />
          </div>
          <h3 className="font-bold text-sm text-foreground">Easy Account Deletion</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You can delete your account and all associated posts whenever you choose from Settings.
          </p>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-10 text-sm leading-relaxed border-t border-border/60 pt-10">
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-mono">
              1
            </span>
            <span>Information We Collect</span>
          </h2>
          <p className="text-muted-foreground">
            We only collect basic information needed to create and maintain your account:
          </p>
          <ul className="space-y-2 pl-2 text-foreground/90">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Account details:</strong> Name, username, email address, password (encrypted), and profile picture.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Content you share:</strong> Posts, articles, photos, comments, likes, and poll votes.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Basic usage data:</strong> General metrics to ensure the site runs fast, smoothly, and securely.</span>
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-mono">
              2
            </span>
            <span>How We Use Your Information</span>
          </h2>
          <p className="text-muted-foreground">
            Your data is used solely to provide and improve the BlogX experience:
          </p>
          <ul className="space-y-2 pl-2 text-foreground/90">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>To display your posts, articles, and profile to other users.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>To send you notifications when someone likes, comments, or interacts with your posts.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>To protect accounts from spam, abuse, and unauthorized access.</span>
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-mono">
              3
            </span>
            <span>Your Choices & Controls</span>
          </h2>
          <p className="text-muted-foreground">
            You are always in total control of your data on BlogX:
          </p>
          <ul className="space-y-2 pl-2 text-foreground/90">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Edit or Delete Posts:</strong> You can edit or permanently delete any of your posts or comments at any moment.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Notification Preferences:</strong> Manage email and in-app alerts whenever you like from your Settings.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Delete Account:</strong> You can permanently remove your profile and content with one click.</span>
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-mono">
              4
            </span>
            <span>Security</span>
          </h2>
          <p className="text-muted-foreground">
            We use industry-standard encryption (HTTPS / TLS) and secure password
            hashing algorithms to safeguard your account credentials.
          </p>
        </section>

        {/* Section 5 */}
        <section className="p-6 rounded-2xl bg-card border border-border/80 space-y-2">
          <h3 className="font-bold text-foreground">Have Questions?</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            If you have any questions or feedback regarding our privacy practices,
            feel free to connect with us or check our{" "}
            <Link href="/terms" className="text-primary underline font-medium">
              Terms of Service
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
