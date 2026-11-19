"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Zap, Loader2, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!email || !password) {
      setFormError("Please enter your email and password.");
      return;
    }
    try {
      await login({ email, password });
    } catch {
      // error is surfaced via useAuth().error
    }
  }

  const displayError = formError || error;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden bg-gradient-to-br from-[#EAF2F4] via-[#F3F7F8] to-[#E3EFEA]">
      {/* Ambient background energy orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-solar-green/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[30rem] h-[30rem] rounded-full bg-primary-teal/20 blur-3xl pointer-events-none" />

      {/* Main Split Neumorphic Card */}
      <div className="w-full max-w-[1020px] min-h-[620px] rounded-[32px] bg-white shadow-[0_30px_70px_-15px_rgba(18,50,71,0.22)] border border-white/80 overflow-hidden flex flex-col lg:flex-row relative z-10">
        {/* ── LEFT PANEL: Clean Neumorphic Sign-in Form ── */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 lg:p-14 flex flex-col justify-between bg-[#F8FAFC]">
          <div>
            {/* Top brand icon for mobile */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-teal to-solar-green text-white shadow-md shadow-solar-green/20">
                <Zap className="h-5 w-5" />
              </div>
              <span className="text-base font-bold text-app-text tracking-tight">
                SolarScope
              </span>
              <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 ml-1">
                v2.4
              </span>
            </div>

            {/* Title */}
            <div className="text-center my-8">
              <h2 className="text-3xl font-extrabold text-app-text tracking-tight">
                Sign in
              </h2>
              <p className="text-xs text-muted mt-2">
                Access your solar fleet operations &amp; telemetry
              </p>
            </div>

            {/* Error Message */}
            {displayError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 shadow-xs">
                {displayError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div className="space-y-1.5">
                <div className="relative rounded-2xl bg-[#EEF3F6] shadow-[inset_2px_2px_5px_rgba(18,50,71,0.08),inset_-2px_-2px_5px_rgba(255,255,255,0.9)] border border-slate-200/40 transition-all focus-within:ring-2 focus-within:ring-primary-teal/40">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    autoComplete="email"
                    required
                    className="w-full bg-transparent px-5 py-3.5 text-sm text-app-text placeholder:text-muted/70 focus:outline-none"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="relative rounded-2xl bg-[#EEF3F6] shadow-[inset_2px_2px_5px_rgba(18,50,71,0.08),inset_-2px_-2px_5px_rgba(255,255,255,0.9)] border border-slate-200/40 transition-all focus-within:ring-2 focus-within:ring-primary-teal/40">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    required
                    className="w-full bg-transparent px-5 py-3.5 pr-12 text-sm text-app-text placeholder:text-muted/70 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-app-text transition"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button (Soft Neumorphic Embossed Pill) */}
              <div className="pt-2 text-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-teal to-solar-green px-12 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-[0_10px_20px_-5px_rgba(19,124,112,0.4),0_4px_8px_rgba(43,167,132,0.2)] hover:brightness-105 active:scale-[0.98] disabled:opacity-60 transition-all cursor-pointer"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{loading ? "Signing in…" : "SIGN IN"}</span>
                </button>
              </div>
            </form>

            {/* Forgot password */}
            <div className="text-center mt-4">
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Please contact your workspace administrator to reset your password.");
                }}
                className="text-xs text-muted hover:text-primary-teal transition-colors"
              >
                Forgot your password?
              </a>
            </div>

            {/* Quick Demo Credentials 1-Click Auto-fill */}
            <div className="mt-6 pt-5 border-t border-slate-200/60">
              <div className="rounded-2xl border border-solar-green/30 bg-pale-mint/60 p-3.5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary-teal flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 fill-solar-green text-solar-green" /> Demo Access
                  </span>
                  <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-solar-green border border-solar-green/20">
                    Click to Auto-fill
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("admin@gmail.com");
                      setPassword("password123");
                      setFormError("");
                    }}
                    className="flex flex-col items-start p-2.5 rounded-xl border border-border bg-white hover:border-solar-green hover:shadow-xs text-left transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <span className="text-xs font-bold text-app-text">Admin Account</span>
                    <span className="text-[10px] text-muted truncate w-full mt-0.5">admin@gmail.com</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmail("analyst@solarscope.io");
                      setPassword("password123");
                      setFormError("");
                    }}
                    className="flex flex-col items-start p-2.5 rounded-xl border border-border bg-white hover:border-solar-green hover:shadow-xs text-left transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <span className="text-xs font-bold text-app-text">Analyst Account</span>
                    <span className="text-[10px] text-muted truncate w-full mt-0.5">analyst@solarscope.io</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick link on mobile to sign up */}
          <div className="mt-6 pt-4 border-t border-border/60 text-center lg:hidden">
            <p className="text-xs text-muted">
              Don't have an account?{" "}
              <Link href="/register" className="font-bold text-primary-teal hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* ── RIGHT PANEL: SolarScope Theme Vibrant Welcome Panel ── */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 lg:p-14 relative overflow-hidden bg-gradient-to-br from-[#0D212F] via-[#137C70] to-[#2BA784] text-white">
          {/* Decorative ambient glowing solar rings */}
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full border border-white/10 bg-white/5 blur-xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full border border-emerald-400/20 bg-solar-green/10 blur-2xl pointer-events-none" />

          {/* Top Status Pill */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-emerald-200 border border-white/20">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>IEC 61724 Certified Engine</span>
            </div>
            <span className="text-xs font-mono text-white/50">v2.4</span>
          </div>

          {/* Center Welcome Content */}
          <div className="relative z-10 my-auto py-8 text-center space-y-4">
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Welcome To<br />
              <span className="text-emerald-300 drop-shadow-sm">SolarScope!</span>
            </h1>

            <p className="text-sm text-white/80 max-w-sm mx-auto leading-relaxed">
              Solar Panel Performance Intelligence, Sensor Telemetry &amp; Energy Efficiency Analysis Platform.
            </p>

            <div className="pt-4">
              <p className="text-xs font-medium text-white/70 mb-3 uppercase tracking-wider">
                New Here?
              </p>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-white/40 bg-white/10 backdrop-blur-md px-10 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg hover:bg-white/20 hover:border-white active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>SIGN UP</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Bottom Fleet Highlights */}
          <div className="relative z-10 grid grid-cols-3 gap-3 border-t border-white/15 pt-5 text-center">
            <div>
              <p className="text-lg font-bold text-emerald-300">100%</p>
              <p className="text-[10px] text-white/60">Fleet Operational</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">15 min</p>
              <p className="text-[10px] text-white/60">Sampling Rate</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-300">&gt; 80%</p>
              <p className="text-[10px] text-white/60">PR Benchmark</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
