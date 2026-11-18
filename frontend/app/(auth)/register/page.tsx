"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeSlash, CircleNotch, WarningCircle } from "@phosphor-icons/react";
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
    <div className="relative min-h-screen bg-paper text-ink flex flex-col justify-between py-8 px-6 font-sans select-none">
      <header className="max-w-md w-full mx-auto">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink uppercase">
          SOLARSCOPE
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted mt-1">
          NEW WORKSPACE ONBOARDING
        </p>
      </header>

      <main className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-surface border border-rule p-8 rounded-[2px] shadow-xs">
          <div className="border-b border-rule pb-4 mb-6">
            <h2 className="font-display text-lg font-bold text-ink uppercase tracking-tight">
              CREATE WORKSPACE
            </h2>
            <p className="font-sans text-xs text-muted mt-1">
              Initialize a clean solar telemetry workspace
            </p>
          </div>

          {displayError && (
            <div className="mb-5 rounded-[2px] border border-magenta/40 bg-magenta-wash px-3.5 py-2.5 text-xs font-mono text-magenta-deep flex items-start gap-2">
              <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5 text-magenta" />
              <span>{displayError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-muted mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={set("name")}
                placeholder="Gokul Analyst"
                className="w-full rounded-[2px] border border-rule bg-paper px-3.5 py-2 text-sm font-sans text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-magenta transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-muted mb-1.5">
                Workspace Name
              </label>
              <input
                type="text"
                value={form.workspace_name}
                onChange={set("workspace_name")}
                placeholder="Chennai Solar Plant"
                className="w-full rounded-[2px] border border-rule bg-paper px-3.5 py-2 text-sm font-sans text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-magenta transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-muted mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="gokul@solarscope.local"
                className="w-full rounded-[2px] border border-rule bg-paper px-3.5 py-2 text-sm font-sans text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-magenta transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-muted mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  placeholder="Min. 8 characters"
                  className="w-full rounded-[2px] border border-rule bg-paper pl-3.5 pr-10 py-2 text-sm font-mono text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-magenta transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                >
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 rounded-[2px] bg-magenta hover:bg-magenta-deep text-white py-3 text-xs font-sans uppercase font-bold tracking-widest transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <CircleNotch size={14} className="animate-spin" />
                  <span>INITIALIZING WORKSPACE…</span>
                </>
              ) : (
                <span>CREATE WORKSPACE & ENTER</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-rule text-center text-xs text-muted">
            <span>Already have an account? </span>
            <Link href="/login" className="font-semibold text-magenta-deep hover:underline">
              Sign in →
            </Link>
          </div>
        </div>
      </main>

      <footer className="text-center font-mono text-xs text-muted">
        © 2026 SolarScope · Perihelion Edge Almanac & Precision Instrument
      </footer>
    </div>
  );
}
