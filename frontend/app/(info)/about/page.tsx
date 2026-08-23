"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Sparkles,
  Heart,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Repeat2,
  Share2,
  Bookmark,
  BarChart3,
  Users2,
  BookOpen,
  Flame,
  ArrowRight,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import CodeSnippetBlock from "@/components/post/CodeSnippetBlock";
import api from "@/lib/api";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function AboutPage() {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  // Real Database Platform Stats
  const [stats, setStats] = useState({
    users_count: 12,
    posts_count: 12,
    blogs_count: 7,
    polls_count: 5,
    interactions_count: 44,
  });

  // Interactive Live Poll State for the Demo
  const [selectedPollOption, setSelectedPollOption] = useState<number | null>(0);
  const [pollVotes, setPollVotes] = useState([850, 420, 190]);

  // Interactive Post Demo State
  const [isLiked, setIsLiked] = useState(true);
  const [likeCount, setLikeCount] = useState(342);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    api
      .get("/api/platform/stats")
      .then((res) => {
        if (res.data) {
          setStats(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleVote = (idx: number) => {
    if (selectedPollOption === idx) return;
    const newVotes = [...pollVotes];
    if (selectedPollOption !== null) {
      newVotes[selectedPollOption] = Math.max(0, newVotes[selectedPollOption] - 1);
    }
    newVotes[idx] += 1;
    setPollVotes(newVotes);
    setSelectedPollOption(idx);
  };

  const handleLikeToggle = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikeCount((prev) => prev - 1);
    } else {
      setIsLiked(true);
      setLikeCount((prev) => prev + 1);
      gsap.fromTo(
        "#demo-like-btn",
        { scale: 0.8 },
        { scale: 1.25, duration: 0.2, yoyo: true, repeat: 1, ease: "back.out(2)" }
      );
    }
  };

  const totalPollVotes = pollVotes.reduce((a, b) => a + b, 0);

  useEffect(() => {
    document.title = "About BlogX — Share Thoughts, Stories & Connect";

    const ctx = gsap.context(() => {
      // 1. Hero floating animations
      gsap.fromTo(
        ".hero-badge",
        { opacity: 0, scale: 0.7, y: -20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: "back.out(1.7)" }
      );

      gsap.fromTo(
        ".hero-title-line",
        { opacity: 0, y: 35, skewY: 2 },
        { opacity: 1, y: 0, skewY: 0, duration: 0.9, stagger: 0.15, ease: "power4.out", delay: 0.1 }
      );

      gsap.fromTo(
        ".hero-subtext",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.7, delay: 0.4, ease: "power3.out" }
      );

      gsap.fromTo(
        ".hero-cta-box",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.55, ease: "power3.out" }
      );

      // Hero Mockup Card
      gsap.fromTo(
        ".hero-mockup-card",
        { opacity: 0, y: 60, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 1.1, delay: 0.35, ease: "power3.out" }
      );

      // Floating Badges
      gsap.to(".float-element-1", {
        y: -14,
        rotation: 3,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".float-element-2", {
        y: 16,
        rotation: -4,
        duration: 3.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 0.5,
      });
      gsap.to(".float-element-3", {
        y: -10,
        rotation: 2,
        duration: 2.7,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 1,
      });

      // 2. Scroll showcase reveal
      const sections = document.querySelectorAll(".scroll-showcase-section");
      sections.forEach((sec) => {
        const textSide = sec.querySelector(".showcase-text");
        const cardSide = sec.querySelector(".showcase-card");

        if (textSide) {
          gsap.fromTo(
            textSide,
            { opacity: 0, x: -40 },
            {
              opacity: 1,
              x: 0,
              duration: 0.85,
              ease: "power3.out",
              scrollTrigger: {
                trigger: sec,
                start: "top 80%",
                toggleActions: "play none none none",
              },
            }
          );
        }

        if (cardSide) {
          gsap.fromTo(
            cardSide,
            { opacity: 0, x: 40, scale: 0.96 },
            {
              opacity: 1,
              x: 0,
              scale: 1,
              duration: 0.95,
              ease: "power3.out",
              scrollTrigger: {
                trigger: sec,
                start: "top 80%",
                toggleActions: "play none none none",
              },
            }
          );
        }
      });

      // 3. Staggered Community cards on scroll
      gsap.fromTo(
        ".community-pill-card",
        { opacity: 0, y: 30, scale: 0.9 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          stagger: 0.1,
          duration: 0.6,
          ease: "back.out(1.5)",
          scrollTrigger: {
            trigger: ".community-grid-container",
            start: "top 85%",
          },
        }
      );

      // 4. Live Counter on Scroll
      const counterElements = document.querySelectorAll(".scroll-stat-number");
      counterElements.forEach((el) => {
        const target = parseInt(el.getAttribute("data-target") || "0", 10);
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          duration: 2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
          },
          onUpdate: () => {
            el.innerHTML = Math.floor(obj.val).toLocaleString();
          },
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="overflow-x-hidden bg-background text-foreground selection:bg-primary/25">
      {/* ── 1. HERO SECTION ── */}
      <section
        ref={heroRef}
        className="relative pt-12 pb-20 sm:pt-20 sm:pb-32 border-b border-border/60 bg-gradient-to-b from-primary/10 via-background/95 to-background overflow-hidden"
      >
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-gradient-to-tr from-amber-500/15 via-primary/20 to-violet-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Floating Badges */}
        <div className="float-element-1 absolute top-16 left-6 md:left-24 hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card/80 backdrop-blur-md border border-border shadow-lg text-xs font-bold text-foreground">
          <span className="text-base">✨</span>
          <span>Share your thoughts</span>
        </div>

        <div className="float-element-2 absolute top-28 right-8 md:right-28 hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card/80 backdrop-blur-md border border-border shadow-lg text-xs font-bold text-foreground">
          <span className="text-base">🚀</span>
          <span>Discover new ideas</span>
        </div>

        <div className="float-element-3 absolute bottom-24 left-10 md:left-32 hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card/80 backdrop-blur-md border border-border shadow-lg text-xs font-bold text-foreground">
          <span className="text-base">📊</span>
          <span>Live voting polls</span>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="hero-badge inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-xs font-bold text-amber-500 shadow-sm">
            <Sparkles className="size-3.5 animate-spin" style={{ animationDuration: "4s" }} />
            <span>Welcome to BlogX — Social & Publishing Platform</span>
          </div>

          <div className="space-y-1">
            <h1 className="hero-title-line text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight font-[family-name:var(--font-fraunces)] text-foreground leading-[1.1]">
              Share Ideas, Stories
            </h1>
            <h1 className="hero-title-line text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight font-[family-name:var(--font-fraunces)] bg-gradient-to-r from-amber-500 via-primary to-orange-500 bg-clip-text text-transparent leading-[1.1]">
              & Connect with Everyone.
            </h1>
          </div>

          <p className="hero-subtext text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            BlogX is an open, friendly social platform where anyone can post
            quick updates, write long-form articles, vote on live polls, and
            connect with like-minded people.
          </p>

          <div className="hero-cta-box flex items-center justify-center gap-3.5 pt-2 flex-wrap">
            {user ? (
              <>
                <Link href="/">
                  <Button className="rounded-full h-12 px-8 font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 cursor-pointer hover:scale-105 transition-transform">
                    <span>Open Feed</span>
                    <ArrowRight className="size-4 ml-1.5" />
                  </Button>
                </Link>
                <Link href="/blogs">
                  <Button
                    variant="outline"
                    className="rounded-full h-12 px-7 font-bold text-sm border-border bg-card/80 backdrop-blur-xs hover:bg-muted cursor-pointer"
                  >
                    <span>Read Articles</span>
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/signup">
                  <Button className="rounded-full h-12 px-8 font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 cursor-pointer hover:scale-105 transition-transform">
                    <span>Get Started for Free</span>
                    <ArrowRight className="size-4 ml-1.5" />
                  </Button>
                </Link>
                <Link href="/">
                  <Button
                    variant="outline"
                    className="rounded-full h-12 px-7 font-bold text-sm border-border bg-card/80 backdrop-blur-xs hover:bg-muted cursor-pointer"
                  >
                    <span>Browse Feed</span>
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* ── Hero Interactive Post Demo ── */}
          <div className="hero-mockup-card pt-10 max-w-xl mx-auto text-left">
            <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group">
              <div className="flex gap-3 items-start">
                <div className="size-10 rounded-full shrink-0 overflow-hidden ring-1 ring-border shadow-xs">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
                    alt="Sarah"
                    className="size-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-foreground hover:underline">
                        Sarah
                      </span>
                      <VerifiedBadge size="xs" />
                      <span className="text-xs text-muted-foreground">
                        @sarah
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        2m ago
                      </span>
                    </div>

                    <button
                      type="button"
                      className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </div>

                  <div className="mt-1.5 text-[15px] leading-[1.6] text-foreground">
                    Just started writing on <span className="mention-link">@BlogX</span>! Loving the clean look and how fast everything is. ✨ What are you all working on today? <span className="hashtag-link">#welcome</span>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-3 flex items-center justify-between text-muted-foreground -ml-2 select-none text-xs">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-teal-500 hover:bg-teal-500/10 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="size-[15px]" />
                      <span>58</span>
                    </button>

                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                    >
                      <Repeat2 className="size-[15px]" />
                      <span>24</span>
                    </button>

                    <button
                      id="demo-like-btn"
                      type="button"
                      onClick={handleLikeToggle}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
                        isLiked
                          ? "text-rose-500 bg-rose-500/10 font-bold"
                          : "text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                      }`}
                    >
                      <Heart
                        className={`size-[15px] ${
                          isLiked ? "fill-rose-500 text-rose-500" : ""
                        }`}
                      />
                      <span>{likeCount}</span>
                    </button>

                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-muted-foreground">
                      <BarChart3 className="size-[15px]" />
                      <span>1.8k</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsBookmarked(!isBookmarked)}
                      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                        isBookmarked
                          ? "text-violet-500 bg-violet-500/10"
                          : "text-muted-foreground hover:text-violet-500 hover:bg-violet-500/10"
                      }`}
                    >
                      <Bookmark
                        className={`size-[15px] ${
                          isBookmarked ? "fill-violet-500 text-violet-500" : ""
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                    >
                      <Share2 className="size-[15px]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. REAL STATS STRIP ── */}
      <section className="border-b border-border/60 py-10 bg-card/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="text-3xl sm:text-5xl font-extrabold text-foreground font-mono">
                <span className="scroll-stat-number" data-target={stats.users_count}>
                  {stats.users_count}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-muted-foreground">
                Members
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-5xl font-extrabold text-amber-500 font-mono">
                <span className="scroll-stat-number" data-target={stats.blogs_count}>
                  {stats.blogs_count}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-muted-foreground">
                Published Articles
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-5xl font-extrabold text-blue-500 font-mono">
                <span className="scroll-stat-number" data-target={stats.polls_count}>
                  {stats.polls_count}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-muted-foreground">
                Live Polls
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-5xl font-extrabold text-emerald-500 font-mono">
                <span className="scroll-stat-number" data-target={stats.interactions_count}>
                  {stats.interactions_count}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-muted-foreground">
                Interactions & Likes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. SHOWCASE 1: POSTS & FEED ── */}
      <section className="scroll-showcase-section py-20 sm:py-28 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="showcase-text space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
              <Flame className="size-4" />
              <span>Real-Time Social Feed</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-[family-name:var(--font-fraunces)] text-foreground leading-tight">
              Post anything. Express yourself freely.
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Share quick updates, thoughts, pictures, questions, and ideas.
              Mention friends, use hashtags, and join discussions in a clean,
              distraction-free feed.
            </p>
            <ul className="space-y-3 text-sm text-foreground/90 pt-2">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>Add photos, links, and rich formatting</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>Simple, clean discussions with zero spam</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>Instant notifications and real-time interaction</span>
              </li>
            </ul>
          </div>

          <div className="showcase-card">
            <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xl space-y-3 relative">
              <div className="flex gap-3 items-start">
                <div className="size-10 rounded-full shrink-0 overflow-hidden ring-1 ring-border shadow-xs">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"
                    alt="Alex"
                    className="size-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-foreground">Alex</span>
                      <VerifiedBadge size="xs" />
                      <span className="text-xs text-muted-foreground">@alex</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">12m ago</span>
                    </div>
                    <MoreHorizontal className="size-4 text-muted-foreground" />
                  </div>

                  <p className="mt-1 text-sm text-foreground/90 leading-relaxed">
                    Working on some new creative projects this weekend. Here is a preview of the new workspace setup: ✨
                  </p>

                  <div className="mt-3 rounded-xl overflow-hidden border border-border/80 relative aspect-video bg-muted/40 group/img">
                    <img
                      src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80"
                      alt="Workspace"
                      className="size-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-muted-foreground -ml-2 text-xs">
                    <span className="flex items-center gap-1.5 px-2 py-1 hover:text-teal-500">
                      <MessageSquare className="size-3.5" /> 42
                    </span>
                    <span className="flex items-center gap-1.5 px-2 py-1 hover:text-emerald-500">
                      <Repeat2 className="size-3.5" /> 12
                    </span>
                    <span className="flex items-center gap-1.5 px-2 py-1 text-rose-500 font-bold">
                      <Heart className="size-3.5 fill-rose-500" /> 189
                    </span>
                    <span className="flex items-center gap-1.5 px-2 py-1 hover:text-primary">
                      <Bookmark className="size-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. SHOWCASE 2: LIVE VOTING POLLS ── */}
      <section className="scroll-showcase-section py-20 sm:py-28 border-t border-border/60 bg-muted/15">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="showcase-card order-2 lg:order-1">
              <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                      <BarChart3 className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Interactive Poll</h4>
                      <p className="text-xs text-muted-foreground">Click an option to vote!</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-muted text-foreground">
                    {totalPollVotes.toLocaleString()} votes
                  </span>
                </div>

                <p className="text-base font-bold text-foreground">
                  What is your favorite time to read or create content?
                </p>

                <div className="space-y-3">
                  {[
                    { title: "Early Morning with Coffee ☕", idx: 0 },
                    { title: "Afternoon Break ☀️", idx: 1 },
                    { title: "Late Night Focus 🌙", idx: 2 },
                  ].map((opt) => {
                    const votes = pollVotes[opt.idx];
                    const percent = totalPollVotes > 0 ? Math.round((votes / totalPollVotes) * 100) : 0;
                    const isSelected = selectedPollOption === opt.idx;

                    return (
                      <button
                        key={opt.idx}
                        onClick={() => handleVote(opt.idx)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all relative overflow-hidden cursor-pointer group ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border hover:border-border/80 hover:bg-muted/40"
                        }`}
                      >
                        <div
                          className={`absolute top-0 bottom-0 left-0 transition-all duration-700 -z-0 ${
                            isSelected
                              ? "bg-primary/20"
                              : "bg-muted/70 group-hover:bg-muted"
                          }`}
                          style={{ width: `${percent}%` }}
                        />

                        <div className="relative z-10 flex items-center justify-between text-xs sm:text-sm font-semibold">
                          <span className="flex items-center gap-2">
                            {isSelected && <CheckCircle2 className="size-4 text-primary" />}
                            <span className={isSelected ? "text-primary font-bold" : "text-foreground"}>
                              {opt.title}
                            </span>
                          </span>
                          <span className="font-mono font-bold text-foreground/90">
                            {percent}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>● 2 days remaining</span>
                  <span>Live percentages</span>
                </div>
              </div>
            </div>

            <div className="showcase-text space-y-5 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-500">
                <BarChart3 className="size-4" />
                <span>Interactive Voting</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-[family-name:var(--font-fraunces)] text-foreground leading-tight">
                Ask questions and see what people think.
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Want feedback or opinions on any topic? Launch an interactive
                poll in seconds. Watch results come in with live animated bars.
              </p>
              <ul className="space-y-3 text-sm text-foreground/90 pt-2">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  <span>One-click voting with instant visual results</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  <span>Set durations from 1 to 7 days</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. SHOWCASE 3: BLOGS & LONG-FORM ARTICLES ── */}
      <section className="scroll-showcase-section py-20 sm:py-28 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="showcase-text space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-500">
              <BookOpen className="size-4" />
              <span>Stories & Articles</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-[family-name:var(--font-fraunces)] text-foreground leading-tight">
              Publish rich stories and deep thoughts.
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              When you want to write more than a short post, publish full articles
              with headers, cover photos, reading time, and bookmarking.
            </p>
            <div className="pt-2">
              <Link href="/blogs">
                <Button className="rounded-full h-11 px-6 font-bold text-xs bg-emerald-500 text-white hover:bg-emerald-600 shadow-md cursor-pointer">
                  <span>Explore Articles</span>
                  <ArrowRight className="size-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="showcase-card">
            <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-2xl group">
              <div className="relative h-48 sm:h-56 bg-muted overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=80"
                  alt="Article Cover"
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-bold text-white">
                  Featured Article
                </div>
              </div>

              <div className="p-6 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-primary">Lifestyle & Productivity</span>
                  <span>•</span>
                  <span>4 min read</span>
                </div>

                <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                  How Small Daily Habits Create Massive Life Changes
                </h3>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  Practical tips on staying focused, managing time effectively, and building creative momentum every day.
                </p>

                <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
                      alt="Tariq"
                      className="size-7 rounded-full object-cover"
                    />
                    <span className="text-xs font-bold text-foreground">Tariq</span>
                  </div>
                  <Bookmark className="size-4 text-muted-foreground hover:text-primary cursor-pointer" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. COMMUNITIES ── */}
      <section className="py-20 sm:py-28 border-t border-border/60 bg-muted/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-500">
              <Users2 className="size-4" />
              <span>Public Communities</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-fraunces)] text-foreground">
              Find Communities You Care About
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Join groups dedicated to technology, design, writing, hobbies, and ideas.
            </p>
          </div>

          <div className="community-grid-container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                name: "Technology & Web",
                tag: "#tech",
                members: "4.8k",
                badge: "Popular",
                img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=100&auto=format&fit=crop&q=80",
              },
              {
                name: "Writing & Stories",
                tag: "#writing",
                members: "3.2k",
                badge: "Creators",
                img: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=100&auto=format&fit=crop&q=80",
              },
              {
                name: "Design & Art",
                tag: "#design",
                members: "2.9k",
                badge: "Inspiration",
                img: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=100&auto=format&fit=crop&q=80",
              },
              {
                name: "Daily Thoughts & Ideas",
                tag: "#general",
                members: "5.4k",
                badge: "Active",
                img: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=100&auto=format&fit=crop&q=80",
              },
            ].map((comm, idx) => (
              <div
                key={idx}
                className="community-pill-card p-5 rounded-3xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-xl transition-all duration-300 space-y-4 relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="size-12 rounded-2xl overflow-hidden border border-border">
                    <img src={comm.img} alt={comm.name} className="size-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {comm.badge}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                    {comm.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {comm.members} members
                  </p>
                </div>

                <Link href="/communities" className="block pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-full text-xs font-bold h-8 border-border group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all cursor-pointer"
                  >
                    Join Hub
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. CTA ── */}
      <section className="py-24 text-center max-w-2xl mx-auto px-4 space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-xs font-bold text-primary animate-bounce">
          <Sparkles className="size-4" />
          <span>{user ? "You're Part of the Community" : "Start Posting Today"}</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold font-[family-name:var(--font-fraunces)] text-foreground leading-tight">
          {user ? `Welcome Back, ${user.name}! 🚀` : "Ready to join the conversation?"}
        </h2>

        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {user
            ? "Dive back into your feed, publish your latest thoughts, or vote on live polls."
            : "Create your account in seconds and start connecting with people."}
        </p>

        <div className="pt-4 flex items-center justify-center gap-4 flex-wrap">
          {user ? (
            <>
              <Link href="/">
                <Button className="rounded-full h-12 px-9 font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/30 cursor-pointer hover:scale-105 transition-transform">
                  <span>Go to Feed</span>
                  <ArrowRight className="size-4 ml-1.5" />
                </Button>
              </Link>
              <Link href={`/@${user.username}`}>
                <Button
                  variant="outline"
                  className="rounded-full h-12 px-7 font-semibold text-sm cursor-pointer"
                >
                  <span>My Profile</span>
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/signup">
                <Button className="rounded-full h-12 px-9 font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/30 cursor-pointer hover:scale-105 transition-transform">
                  Create Free Account
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  className="rounded-full h-12 px-7 font-semibold text-sm cursor-pointer"
                >
                  Sign In
                </Button>
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
