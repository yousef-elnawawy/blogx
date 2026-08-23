"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  HeartHandshake,
  ShieldAlert,
  UserCheck,
  CheckCircle2,
} from "lucide-react";

export default function TermsOfServicePage() {
  useEffect(() => {
    document.title = "Terms of Service — BlogX";
  }, []);

  return (
    <div className="py-12 sm:py-20 px-4 sm:px-6 max-w-4xl mx-auto space-y-12 text-foreground">
      {/* Header */}
      <div className="space-y-4 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
          <FileText className="size-4" />
          <span>Simple Rules</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-[family-name:var(--font-fraunces)] text-foreground">
          Terms of Service
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Welcome to BlogX! By using our platform, you agree to these simple,
          common-sense rules designed to keep our community safe and enjoyable.
        </p>

        <p className="text-xs text-muted-foreground">
          Last updated: August 2026
        </p>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-2">
          <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <HeartHandshake className="size-5" />
          </div>
          <h3 className="font-bold text-sm text-foreground">Be Respectful</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Treat others with kindness. No harassment, hate speech, or abuse.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-2">
          <div className="size-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <UserCheck className="size-5" />
          </div>
          <h3 className="font-bold text-sm text-foreground">Your Content is Yours</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You retain 100% ownership of everything you write, post, and share.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-2">
          <div className="size-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <ShieldAlert className="size-5" />
          </div>
          <h3 className="font-bold text-sm text-foreground">No Spam or Fraud</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Keep BlogX clean. Automated spam, phishing, and fake accounts are prohibited.
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
            <span>Creating an Account</span>
          </h2>
          <p className="text-muted-foreground">
            To participate and post on BlogX, you create a free account:
          </p>
          <ul className="space-y-2 pl-2 text-foreground/90">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Provide accurate information and keep your login credentials secure.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>You are responsible for the activity that happens under your account.</span>
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-mono">
              2
            </span>
            <span>Community Guidelines</span>
          </h2>
          <p className="text-muted-foreground">
            We want BlogX to remain an open and welcoming community for everyone:
          </p>
          <ul className="space-y-2 pl-2 text-foreground/90">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Respectful discussions:</strong> Constructive debates and friendly sharing are always welcome.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Prohibited content:</strong> No illegal material, hate speech, bullying, malicious links, or repetitive spam.</span>
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-mono">
              3
            </span>
            <span>Content Ownership</span>
          </h2>
          <p className="text-muted-foreground">
            You own the content you post on BlogX. By posting, you give BlogX
            permission to display and format your posts to other users across
            our web feeds and search features.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-mono">
              4
            </span>
            <span>Account Termination</span>
          </h2>
          <p className="text-muted-foreground">
            You may stop using BlogX or delete your account at any time. We reserve
            the right to suspend or remove accounts that repeatedly violate
            community safety guidelines.
          </p>
        </section>

        {/* Footer Note */}
        <section className="p-6 rounded-2xl bg-card border border-border/80 space-y-2">
          <h3 className="font-bold text-foreground">Need More Info?</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Read our{" "}
            <Link href="/privacy" className="text-primary underline font-medium">
              Privacy Policy
            </Link>{" "}
            to learn how we safeguard your personal information.
          </p>
        </section>
      </div>
    </div>
  );
}
