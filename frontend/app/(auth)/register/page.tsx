"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";

export default function RegisterPage() {
  const { register, loading, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", workspace_name: "",
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
    <div className="min-h-screen flex items-center justify-center bg-canvas px-6 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-deep-teal">
            <Zap className="h-5 w-5 text-solar-green" />
          </div>
          <span className="text-lg font-bold text-app-text">SolarScope</span>
        </div>

        <h2 className="text-2xl font-bold text-app-text mb-1">Create your account</h2>
        <p className="text-sm text-muted mb-7">Set up your workspace to get started</p>

        {displayError && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-app-text mb-1.5">Full name</label>
            <input
              type="text"
              value={form.name}
              onChange={set("name")}
              placeholder="Your name"
              autoComplete="name"
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-app-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-teal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-1.5">Work email</label>
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="you@company.com"
              autoComplete="email"
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-app-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-teal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                placeholder="Min 8 characters"
                autoComplete="new-password"
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 pr-10 text-sm text-app-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-teal"
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

          <div>
            <label className="block text-sm font-medium text-app-text mb-1.5">Workspace name</label>
            <input
              type="text"
              value={form.workspace_name}
              onChange={set("workspace_name")}
              placeholder="e.g. Chennai Solar Plant"
              className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-app-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-teal"
            />
            <p className="text-xs text-muted mt-1">You can invite team members after setup.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-deep-teal disabled:opacity-60 transition-colors mt-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Creating account…" : "Create account & workspace"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary-teal hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
