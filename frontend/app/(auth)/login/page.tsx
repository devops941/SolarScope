"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Zap, Loader2 } from "lucide-react";
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
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[480px] flex-col justify-between bg-deep-teal p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-solar-green">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-white">SolarScope</p>
            <p className="text-xs text-white/50">Performance Intelligence</p>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white leading-snug mb-4">
            Solar analytics that<br />actually makes sense.
          </h1>
          <p className="text-white/60 text-sm leading-relaxed mb-10">
            Import your solar data, run performance analysis, detect anomalies and
            export consistent reports — all from one platform.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Energy Today", value: "128.4 kWh" },
              { label: "Performance Ratio", value: "82.6%" },
              { label: "Specific Yield", value: "5.14 kWh/kWp" },
              { label: "Data Coverage", value: "96.2%" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-white/8 p-4">
                <p className="text-xs text-white/40 mb-1">{label}</p>
                <p className="text-lg font-bold text-solar-green">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/30">© 2026 SolarScope · Solar Performance Intelligence</p>
      </div>

      {/* Right login form */}
      <div className="flex flex-1 items-center justify-center bg-canvas px-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-deep-teal">
              <Zap className="h-4 w-4 text-solar-green" />
            </div>
            <span className="font-bold text-app-text">SolarScope</span>
          </div>

          <h2 className="text-2xl font-bold text-app-text mb-1">Welcome back</h2>
          <p className="text-sm text-muted mb-7">Sign in to your workspace</p>

          {displayError && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-app-text mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-app-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-app-text">Password</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 pr-10 text-sm text-app-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app-text"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-deep-teal disabled:opacity-60 transition-colors mt-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            New to SolarScope?{" "}
            <Link href="/register" className="font-medium text-primary-teal hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
