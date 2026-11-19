"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";

export default function RegisterPage() {
  const { register, loading, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    workspace_name: "",
  });
  const [formError, setFormError] = useState("");

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const { name, email, password, workspace_name } = form;
    if (!name || !email || !password || !workspace_name) {
      setFormError("All fields are required.");
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    try {
      await register({ name, email, password, workspace_name });
    } catch {
      // error shown via useAuth().error
    }
  }

  const displayError = formError || error;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden bg-gradient-to-br from-[#EAF2F4] via-[#F3F7F8] to-[#E3EFEA]">
      {/* Ambient background energy orbs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-solar-green/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[30rem] h-[30rem] rounded-full bg-primary-teal/20 blur-3xl pointer-events-none" />

      {/* Main Split Neumorphic Card */}
      <div className="w-full max-w-[1020px] min-h-[640px] rounded-[32px] bg-white shadow-[0_30px_70px_-15px_rgba(18,50,71,0.22)] border border-white/80 overflow-hidden flex flex-col lg:flex-row relative z-10">
        {/* ── LEFT PANEL: Welcome Back Brand Panel ── */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 lg:p-14 relative overflow-hidden bg-gradient-to-br from-[#0D212F] via-[#137C70] to-[#2BA784] text-white">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full border border-white/10 bg-white/5 blur-xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full border border-emerald-400/20 bg-solar-green/10 blur-2xl pointer-events-none" />

          {/* Top Status */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-emerald-200 border border-white/20">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Plant Onboarding</span>
            </div>
            <span className="text-xs font-mono text-white/50">v2.4</span>
          </div>

          {/* Center Welcome Back */}
          <div className="relative z-10 my-auto py-8 text-center space-y-4">
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
              One Step<br />
              <span className="text-emerald-300 drop-shadow-sm">To Energy Insights!</span>
            </h1>

            <p className="text-sm text-white/80 max-w-sm mx-auto leading-relaxed">
              Create your organization workspace to monitor inverter telemetries and performance ratios.
            </p>

            <div className="pt-4">
              <p className="text-xs font-medium text-white/70 mb-3 uppercase tracking-wider">
                Already Have An Account?
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-white/40 bg-white/10 backdrop-blur-md px-10 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg hover:bg-white/20 hover:border-white active:scale-[0.98] transition-all cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>SIGN IN</span>
              </Link>
            </div>
          </div>

          {/* Bottom standards */}
          <div className="relative z-10 border-t border-white/15 pt-5 text-center text-xs text-white/70">
            Certified IEC 61724 Standard Compliant Architecture
          </div>
        </div>

        {/* ── RIGHT PANEL: Soft Neumorphic Sign-Up Form ── */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 lg:p-14 flex flex-col justify-between bg-[#F8FAFC]">
          <div>
            {/* Top brand */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-teal to-solar-green text-white shadow-md shadow-solar-green/20">
                <Zap className="h-5 w-5" />
              </div>
              <span className="text-base font-bold text-app-text tracking-tight">
                SolarScope
              </span>
            </div>

            {/* Title */}
            <div className="text-center my-4">
              <h2 className="text-3xl font-extrabold text-app-text tracking-tight">
                Create Account
              </h2>
              <p className="text-xs text-muted mt-1">
                Enter your details to register a new solar workspace
              </p>
            </div>

            {/* Error Message */}
            {displayError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 shadow-xs">
                {displayError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div className="relative rounded-2xl bg-[#EEF3F6] shadow-[inset_2px_2px_5px_rgba(18,50,71,0.08),inset_-2px_-2px_5px_rgba(255,255,255,0.9)] border border-slate-200/40 transition-all focus-within:ring-2 focus-within:ring-primary-teal/40">
                <input
                  type="text"
                  value={form.name}
                  onChange={set("name")}
                  placeholder="Full Name"
                  autoComplete="name"
                  required
                  className="w-full bg-transparent px-5 py-3 text-sm text-app-text placeholder:text-muted/70 focus:outline-none"
                />
              </div>

              {/* Email */}
              <div className="relative rounded-2xl bg-[#EEF3F6] shadow-[inset_2px_2px_5px_rgba(18,50,71,0.08),inset_-2px_-2px_5px_rgba(255,255,255,0.9)] border border-slate-200/40 transition-all focus-within:ring-2 focus-within:ring-primary-teal/40">
                <input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="Work Email"
                  autoComplete="email"
                  required
                  className="w-full bg-transparent px-5 py-3 text-sm text-app-text placeholder:text-muted/70 focus:outline-none"
                />
              </div>

              {/* Workspace Name */}
              <div className="relative rounded-2xl bg-[#EEF3F6] shadow-[inset_2px_2px_5px_rgba(18,50,71,0.08),inset_-2px_-2px_5px_rgba(255,255,255,0.9)] border border-slate-200/40 transition-all focus-within:ring-2 focus-within:ring-primary-teal/40">
                <input
                  type="text"
                  value={form.workspace_name}
                  onChange={set("workspace_name")}
                  placeholder="Workspace Name (e.g. Chennai Solar Plant)"
                  required
                  className="w-full bg-transparent px-5 py-3 text-sm text-app-text placeholder:text-muted/70 focus:outline-none"
                />
              </div>

              {/* Password */}
              <div className="relative rounded-2xl bg-[#EEF3F6] shadow-[inset_2px_2px_5px_rgba(18,50,71,0.08),inset_-2px_-2px_5px_rgba(255,255,255,0.9)] border border-slate-200/40 transition-all focus-within:ring-2 focus-within:ring-primary-teal/40">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  placeholder="Password (min 8 characters)"
                  autoComplete="new-password"
                  required
                  className="w-full bg-transparent px-5 py-3 pr-12 text-sm text-app-text placeholder:text-muted/70 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-app-text transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Submit */}
              <div className="pt-2 text-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-teal to-solar-green px-12 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-[0_10px_20px_-5px_rgba(19,124,112,0.4),0_4px_8px_rgba(43,167,132,0.2)] hover:brightness-105 active:scale-[0.98] disabled:opacity-60 transition-all cursor-pointer"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{loading ? "Creating Account…" : "SIGN UP"}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-border/60 text-center lg:hidden">
            <p className="text-xs text-muted">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-primary-teal hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
