"use client"

import { LoginForm } from "@/components/login-form"
import { Fraunces } from "next/font/google"

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600"],
  style: ["italic"],
  variable: "--font-fraunces",
})

export default function LoginPage() {
  return (
    <div className={`${fraunces.variable} grid min-h-svh lg:grid-cols-2 bg-background`}>
      {/* Left Section - Login Form */}
      <div className="flex flex-col gap-4 p-6 md:p-10 relative overflow-hidden">
        {/* Large transparent watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <img
            src="/logo.svg"
            alt=""
            className="w-[min(60vw,450px)] h-auto opacity-[0.04] pointer-events-none select-none translate-x-10 translate-y-10 dark:hidden"
          />
          <img
            src="/logo-dark.svg"
            alt=""
            className="w-[min(60vw,450px)] h-auto opacity-[0.04] pointer-events-none select-none translate-x-10 translate-y-10 hidden dark:block"
          />
        </div>

        <div className="flex justify-center gap-2 md:justify-start relative z-10">
          <a href="/" className="flex items-center gap-2 font-medium">
            <img src="/logo.svg" alt="BlogX" className="h-8 w-auto dark:hidden" />
            <img src="/logo-dark.svg" alt="BlogX" className="h-8 w-auto hidden dark:block" />
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center relative z-10">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>
      </div>

      {/* Right Section - Image */}
      <div className="relative hidden bg-muted lg:block overflow-hidden rounded-l-2xl">
        <img
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2832&auto=format&fit=crop"
          alt="Nature landscape"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Large logo watermark on image */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <img
            src="/logo-dark.svg"
            alt=""
            className="w-[400px] h-auto opacity-10 pointer-events-none select-none"
          />
        </div>

        <div className="absolute bottom-10 left-10 right-10 text-white">
          <h2 className="text-3xl font-bold italic mb-2">Share Your Post</h2>
          <p className="text-white/80">Join a community of thinkers, creators, and Posttellers.</p>
        </div>
      </div>
    </div>
  )
}