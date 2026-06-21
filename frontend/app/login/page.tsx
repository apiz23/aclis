"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [err, setErr]           = useState("");
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setErr(error.message);
    router.push("/dashboard");
  }

  return (
    <div className="relative min-h-dvh flex items-center justify-center overflow-hidden bg-primary dark:bg-background">

      {/* ── SVG background ── */}
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full pointer-events-none select-none text-primary-foreground dark:text-primary"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {/* Contour lines */}
        <path d="M-100 700C150 620 300 680 500 580C700 480 850 550 1100 420C1250 340 1350 380 1550 250" stroke="currentColor" strokeWidth="1" opacity="0.05"/>
        <path d="M-100 550C150 470 300 520 520 420C740 320 900 380 1180 250C1320 190 1400 210 1550 130" stroke="currentColor" strokeWidth="1" opacity="0.06"/>
        <path d="M-100 380C180 320 350 350 600 250C850 150 1050 220 1550 40" stroke="currentColor" strokeWidth="1" opacity="0.04"/>
        <path d="M-100 820C200 760 400 800 650 700C900 600 1100 660 1550 520" stroke="currentColor" strokeWidth="1" opacity="0.04"/>

        {/* District outline */}
        <path
          d="M450 170 L620 130 L800 180 L930 290 L980 450 L920 610 L760 760 L540 780 L350 700 L240 520 L280 310 Z"
          stroke="currentColor" strokeWidth="2" opacity="0.1"
        />
        {/* Inner section */}
        <path d="M520 220L690 250L820 380L770 560L610 640L450 540L420 360Z" stroke="currentColor" strokeWidth="1" opacity="0.07"/>
        <path d="M360 470L610 640" stroke="currentColor" strokeWidth="1" opacity="0.05"/>
        <path d="M690 250L610 640" stroke="currentColor" strokeWidth="1" opacity="0.05"/>

        {/* AI nodes */}
        <circle cx="520" cy="220" r="4" fill="currentColor" opacity="0.12"/>
        <circle cx="690" cy="250" r="4" fill="currentColor" opacity="0.12"/>
        <circle cx="820" cy="380" r="4" fill="currentColor" opacity="0.12"/>
        <circle cx="770" cy="560" r="4" fill="currentColor" opacity="0.12"/>
        <circle cx="610" cy="640" r="4" fill="currentColor" opacity="0.12"/>
        <line x1="520" y1="220" x2="690" y2="250" stroke="currentColor" opacity="0.07"/>
        <line x1="690" y1="250" x2="820" y2="380" stroke="currentColor" opacity="0.07"/>
        <line x1="820" y1="380" x2="770" y2="560" stroke="currentColor" opacity="0.07"/>
        <line x1="770" y1="560" x2="610" y2="640" stroke="currentColor" opacity="0.07"/>

        {/* Radial rings from bottom-right */}
        <circle cx="1350" cy="850" r="200" stroke="currentColor" strokeWidth="0.8" opacity="0.05"/>
        <circle cx="1350" cy="850" r="350" stroke="currentColor" strokeWidth="0.6" opacity="0.04"/>
        <circle cx="1350" cy="850" r="500" stroke="currentColor" strokeWidth="0.5" opacity="0.03"/>

        {/* Glow blobs */}
        <circle cx="1100" cy="150" r="220" fill="currentColor" opacity="0.025"/>
        <circle cx="200"  cy="780" r="180" fill="currentColor" opacity="0.02"/>
      </svg>

      {/* Thin accent strip at top */}
      <div className="absolute top-0 inset-x-0 h-[3px] bg-primary-foreground/20 dark:bg-primary/40 z-10" />

      {/* ── Form card ── */}
      <div className="relative z-10 w-full max-w-sm mx-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">

        {/* Logo + heading */}
        <div className="flex flex-col items-center gap-3 mb-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg dark:shadow-primary/20">
            <svg viewBox="0 0 20 20" className="h-7 w-7 text-primary-foreground" fill="none" aria-hidden>
              <path d="M4 16L10 4L16 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.5 12h7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/50 dark:text-muted-foreground mb-1">
              Pejabat Daerah Pontian
            </p>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-primary-foreground dark:text-foreground">ACLIS</h1>
            <p className="text-sm text-primary-foreground/60 dark:text-muted-foreground mt-1">Log masuk ke akaun anda</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-card border border-border shadow-2xl p-7">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">E-mel</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@pontian.gov.my"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Kata Laluan</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPw ? "Sembunyikan kata laluan" : "Tunjukkan kata laluan"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {err && (
              <p className="text-sm text-destructive" role="alert">{err}</p>
            )}

            <Button type="submit" className="w-full h-10 mt-1" disabled={loading}>
              {loading ? "Memasuk…" : "Log Masuk"}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-primary-foreground/35 dark:text-muted-foreground/50 mt-5 tracking-wide">
          Johor Darul Ta&apos;zim &mdash; 2025
        </p>
      </div>

    </div>
  );
}
