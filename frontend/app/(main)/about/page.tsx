"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Sparkles,
  MessageSquare,
  BookOpen,
  Users2,
  ShieldCheck,
  Search,
  BarChart2,
  Lock,
  Zap,
  Globe,
  ArrowRight,
  CheckCircle2,
  Heart,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const FEATURES = [
  {
    icon: <MessageSquare className="size-6 text-primary" />,
    title: "Micro-Posts & Social Discussions",
    description:
      "Share real-time thoughts, code snippets, and media. Express ideas with Markdown, link previews, and English-only mentions.",
    badge: "Social Feed",
  },
  {
    icon: <BarChart2 className="size-6 text-amber-500" />,
    title: "Interactive YouTube-Style Polls",
    description:
      "Engage your audience with live animated voting polls. Real-time percentage bars, multi-day durations, and instant vote toggles.",
    badge: "New Feature",
  },
  {
    icon: <BookOpen className="size-6 text-emerald-500" />,
    title: "Long-Form Engineering Blogs",
    description:
      "Publish comprehensive technical tutorials, architecture blueprints, and engineering stories with rich tags, cover headers, and estimated reading time.",
    badge: "Publishing",
  },
  {
    icon: <Users2 className="size-6 text-blue-500" />,
    title: "Public Communities & Hubs",
    description:
      "Discover dedicated public communities for Laravel, Next.js, AI, and design. Connect with creators sharing your passions.",
    badge: "Communities",
  },
  {
    icon: <Zap className="size-6 text-purple-500" />,
    title: "Direct Real-time Messaging",
    description:
      "Chat with fellow developers in private direct messages with photo attachments, emoji reactions, and instant typing feedback.",
    badge: "Real-time",
  },
  {
    icon: <ShieldCheck className="size-6 text-teal-500" />,
    title: "Enterprise Security & Verification",
    description:
      "TOTP Two-Factor Authentication, multi-device active session controls, rate limiting protection, and verified badge tiers.",
    badge: "Security",
  },
];

const STATS = [
  { label: "Community Members", value: "10,000+" },
  { label: "Engineering Articles", value: "2,500+" },
  { label: "Interactive Polls", value: "1,200+" },
  { label: "Direct Messages Sent", value: "50,000+" },
];

export default function AboutPage() {
  useEffect(() => {
    document.title = "About BlogX — Modern Engineering Social Platform";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 selection:bg-primary/20">
      {/* ── 1. Hero Section ── */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-border/60 bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary shadow-xs"
          >
            <Sparkles className="size-3.5" />
            <span>Welcome to BlogX</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-[family-name:var(--font-fraunces)] leading-tight text-foreground"
          >
            Where Developers Share Ideas, Stories & Community
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            BlogX combines the immediacy of short-form feeds with the depth of long-form engineering blogs, interactive polls, public forums, and direct messaging.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center justify-center gap-3 pt-3 flex-wrap"
          >
            <Link href="/">
              <Button
                className="rounded-2xl h-11 px-6 font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 cursor-pointer"
              >
                <span>Explore Feed</span>
                <ArrowRight className="size-4 ml-1" />
              </Button>
            </Link>
            <Link href="/blogs">
              <Button
                variant="outline"
                className="rounded-2xl h-11 px-6 font-semibold text-sm border-border bg-card/60 backdrop-blur-xs hover:bg-muted cursor-pointer"
              >
                <BookOpen className="size-4 mr-1.5 text-primary" />
                <span>Read Blog Stories</span>
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── 2. Live Metrics ── */}
      <section className="border-b border-border/60 py-10 bg-card/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {STATS.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="space-y-1"
              >
                <div className="text-2xl sm:text-4xl font-extrabold text-foreground font-mono">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Core Features Showcase ── */}
      <section className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-fraunces)] text-foreground">
            Everything You Need in One Unified Hub
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Built from the ground up for programmers, writers, creators, and engineering teams.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {FEATURES.map((feat, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="p-5 sm:p-6 rounded-3xl border border-border/80 bg-card/60 hover:border-primary/40 hover:bg-card transition-all shadow-xs space-y-3 relative group"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-2xl bg-muted/60 border border-border/60 group-hover:scale-105 transition-transform">
                  {feat.icon}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  {feat.badge}
                </span>
              </div>

              <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                {feat.title}
              </h3>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {feat.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── 4. Security & Privacy Pillar ── */}
      <section className="border-t border-border/60 py-16 bg-muted/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="p-6 sm:p-10 rounded-3xl border border-border/80 bg-card shadow-lg space-y-6">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Lock className="size-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground font-[family-name:var(--font-fraunces)]">
                  Privacy & Data Ownership First
                </h3>
                <p className="text-xs text-muted-foreground">
                  Built with rock-solid Laravel Sanctum, TOTP 2FA, and encrypted sessions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-muted/40">
                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Multi-Device session manager with remote one-click revoke</span>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-muted/40">
                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Brute-force lockout and rate-limiting on sensitive endpoints</span>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-muted/40">
                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Two-Factor Authentication with downloadable emergency recovery codes</span>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-muted/40">
                <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Public-only, open forums with anti-spam and verified badging</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Bottom Call to Action ── */}
      <section className="py-16 text-center max-w-xl mx-auto px-4 space-y-4">
        <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-fraunces)] text-foreground">
          Ready to join the conversation?
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Create your account today, follow your favorite engineers, cast your votes, and start sharing your knowledge with the world.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link href="/signup">
            <Button
              className="rounded-2xl h-11 px-8 font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer"
            >
              Sign Up for Free
            </Button>
          </Link>
          <Link href="/login">
            <Button
              variant="outline"
              className="rounded-2xl h-11 px-6 font-semibold text-sm cursor-pointer"
            >
              Sign In
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
