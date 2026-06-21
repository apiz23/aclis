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
    <div className="min-h-dvh flex">

      {/* ── Left: identity panel ── */}
      <div className="hidden lg:flex lg:w-[44%] flex-col justify-between p-12 pt-[52px] bg-primary text-primary-foreground relative overflow-hidden animate-in fade-in-0 duration-500">

        {/* Thin accent strip at top */}
        <div className="absolute top-0 inset-x-0 h-[3px] bg-primary-foreground/20 z-10" />

        {/* Cartographic rings — radiate from bottom center, survey/district reference */}
        <svg
          aria-hidden
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[640px] pointer-events-none select-none"
          viewBox="0 0 640 640"
          fill="none"
        >
          <circle cx="320" cy="640" r="100" stroke="currentColor" strokeWidth="1"   opacity="0.07"/>
          <circle cx="320" cy="640" r="200" stroke="currentColor" strokeWidth="0.8" opacity="0.08"/>
          <circle cx="320" cy="640" r="300" stroke="currentColor" strokeWidth="0.8" opacity="0.08"/>
          <circle cx="320" cy="640" r="400" stroke="currentColor" strokeWidth="0.6" opacity="0.06"/>
          <circle cx="320" cy="640" r="500" stroke="currentColor" strokeWidth="0.6" opacity="0.05"/>
          <circle cx="320" cy="640" r="600" stroke="currentColor" strokeWidth="0.5" opacity="0.04"/>
          <line x1="320" y1="640" x2="320" y2="40"  stroke="currentColor" strokeWidth="0.4" opacity="0.04"/>
          <line x1="320" y1="640" x2="640" y2="290" stroke="currentColor" strokeWidth="0.4" opacity="0.03"/>
          <line x1="320" y1="640" x2="0"   y2="290" stroke="currentColor" strokeWidth="0.4" opacity="0.03"/>
          <line x1="320" y1="640" x2="570" y2="90"  stroke="currentColor" strokeWidth="0.3" opacity="0.025"/>
          <line x1="320" y1="640" x2="70"  y2="90"  stroke="currentColor" strokeWidth="0.3" opacity="0.025"/>
        </svg>

        {/* ── Top content zone ── */}
        <div className="relative z-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/40 mb-8">
            Sistem AI · Pejabat Daerah
          </p>

          {/* Logo mark */}
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary-foreground/10 border border-primary-foreground/20 mb-8">
            <svg viewBox="0 0 20 20" className="h-7 w-7" fill="none" aria-hidden>
              <path d="M4 16L10 4L16 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.5 12h7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>

          {/* System name */}
          <h1 className="font-heading text-[76px] font-bold tracking-tight uppercase leading-none text-primary-foreground mb-5">
            ACLIS
          </h1>
          <p className="text-sm text-primary-foreground/55 leading-relaxed max-w-[22ch]">
            Pengurusan Data Ketua Kampung<br/>
            &amp; Penghulu berasaskan AI
          </p>
        </div>

        {/* ── Bottom: district identity ── */}
        <div className="relative z-10 flex items-end justify-between">
          <div>
            <div className="w-5 h-[1px] bg-primary-foreground/30 mb-4" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/55">
              Pejabat Daerah Pontian
            </p>
            <p className="text-[10px] mt-0.5 text-primary-foreground/35">
              Johor Darul Ta&apos;zim
            </p>
          </div>
          <span className="text-[10px] font-mono text-primary-foreground/20 tracking-widest select-none">
            2025
          </span>
        </div>
      </div>

      {/* ── Right: form panel ── */}
      <div className="flex-1 flex items-center justify-center bg-background animate-in fade-in-0 slide-in-from-bottom-3 duration-400 p-6">
        <div className="w-full max-w-sm">

          {/* Logo + heading */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-md">
              <svg viewBox="0 0 20 20" className="h-6 w-6" fill="none" aria-hidden>
                <path d="M4 16L10 4L16 16" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.5 12h7" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="text-center">
              <h2 className="font-heading text-2xl font-bold tracking-tight">Selamat Datang</h2>
              <p className="text-sm text-muted-foreground mt-1">Log masuk ke akaun ACLIS anda</p>
            </div>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border bg-card shadow-sm p-7">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Kata Laluan</Label>
                </div>
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

              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? "Memasuk…" : "Log Masuk"}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Pejabat Daerah Pontian &mdash; Johor Darul Ta&apos;zim
          </p>
        </div>
      </div>

    </div>
  );
}
