"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeSlash, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/useAuth";

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const searchParams = useSearchParams();
  const isExpired = searchParams.get("expired") === "true";

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("gokul@solarscope.local");
  const [password, setPassword] = useState("admin123");
  const [formError, setFormError] = useState("");

  // Calculate sun position on horizon from user local time
  const [localHour, setLocalHour] = useState(13);
  useEffect(() => {
    const now = new Date();
    setLocalHour(now.getHours() + now.getMinutes() / 60);
  }, []);

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
      // error surfaced via useAuth().error
    }
  }

  const displayError = formError || error;

  // Horizon geometry
  const sunrise = 6.0;
  const sunset = 18.5;
  const clampedH = Math.max(sunrise, Math.min(localHour, sunset));
  const sunFraction = (clampedH - sunrise) / (sunset - sunrise); // 0 to 1

  return (
    <div className="relative min-h-screen bg-paper text-ink flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Expired Session Banner (Sun-wash strip on top) */}
      {isExpired && (
        <div className="w-full bg-magenta-wash border-b border-magenta/30 px-6 py-2.5 text-xs font-mono text-magenta-deep flex items-center justify-center gap-2">
          <WarningCircle size={14} weight="bold" />
          <span>SESSION EXPIRED — PLEASE SIGN IN TO RE-AUTHENTICATE TELEMETRY STREAM</span>
        </div>
      )}

      {/* Top Header: Brand in Unbounded */}
      <header className="p-8 sm:p-12 z-10 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-ink uppercase">
            SOLARSCOPE
          </h1>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted mt-1">
            SOLAR PERFORMANCE INTELLIGENCE · ALMANAC & INSTRUMENT
          </p>
        </div>

        <div className="hidden sm:block text-right font-mono text-xs text-muted">
          <p>EDITION: PERIHELION EDGE</p>
          <p>LOCAL TIME: {Math.floor(localHour)}:{String(Math.floor((localHour % 1) * 60)).padStart(2, "0")}</p>
        </div>
      </header>

      {/* Center Main: Credentials Rectangle (under horizon line) */}
      <main className="z-10 px-6 max-w-md w-full mx-auto my-auto">
        <div className="bg-surface border border-rule p-8 rounded-[2px] shadow-xs">
          <div className="border-b border-rule pb-4 mb-6">
            <h2 className="font-display text-lg font-bold tracking-tight text-ink uppercase">
              AUTHENTICATION
            </h2>
            <p className="font-sans text-xs text-muted mt-1">
              Sign in with your workspace credentials
            </p>
          </div>

          {/* Error Message */}
          {displayError && (
            <div className="mb-5 rounded-[2px] border border-magenta/40 bg-magenta-wash px-3.5 py-2.5 text-xs font-mono text-magenta-deep flex items-start gap-2">
              <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5 text-magenta" />
              <span>{displayError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-muted mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="analyst@solarscope.local"
                className="w-full rounded-[2px] border border-rule bg-paper px-3.5 py-2.5 text-sm font-sans text-ink placeholder:text-muted/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-magenta transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted">
                  Password
                </label>
                <Link
                  href="/register"
                  className="text-xs font-mono text-magenta hover:text-magenta-deep hover:underline"
                >
                  Forgot?
                </Link>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-[2px] border border-rule bg-paper pl-3.5 pr-10 py-2.5 text-sm font-mono text-ink placeholder:text-muted/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-magenta transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition"
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
                  <span>AUTHENTICATING…</span>
                </>
              ) : (
                <span>SIGN IN TO SOLAR ALMANAC</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-rule flex items-center justify-between text-xs text-muted font-sans">
            <span>New workspace?</span>
            <Link href="/register" className="font-semibold text-magenta-deep hover:underline">
              Create an account →
            </Link>
          </div>
        </div>
      </main>

      {/* Bottom Horizon Arc Graphic (SVG) */}
      <div className="w-full h-36 relative pointer-events-none select-none overflow-hidden">
        <svg viewBox="0 0 1440 144" className="w-full h-full preserve-3d" preserveAspectRatio="none">
          {/* Horizon Line */}
          <line x1="0" y1="110" x2="1440" y2="110" stroke="#E3E1E6" strokeWidth="1.5" />

          {/* Half-circle horizon arc */}
          <path
            d="M 120,110 Q 720,-30 1320,110"
            fill="none"
            stroke="#FBE8F3"
            strokeWidth="3"
            strokeDasharray="4,4"
          />

          {/* Dynamic Sun Position on Horizon */}
          {(() => {
            const t = sunFraction;
            const x = 120 + t * (1320 - 120);
            // Parabolic curve: peak at t=0.5 where y=10
            const y = 110 - 4 * (110 - 10) * t * (1 - t);

            return (
              <g style={{ transition: "all 600ms cubic-bezier(0.16, 1, 0.3, 1)" }}>
                <circle cx={x} cy={y} r="18" fill="#F08A00" opacity="0.15" />
                <circle cx={x} cy={y} r="8" fill="#F08A00" stroke="#FFFFFF" strokeWidth="2" />
                <text
                  x={x}
                  y={y - 14}
                  fontSize="9"
                  fontFamily="Azeret Mono"
                  fill="#F08A00"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  SOLAR ALTITUDE
                </text>
              </g>
            );
          })()}

          {/* Tick Labels */}
          <text x="120" y="126" fontSize="10" fontFamily="Azeret Mono" fill="#6B6571">
            06:00 DAWN
          </text>
          <text x="720" y="126" fontSize="10" fontFamily="Azeret Mono" fill="#6B6571" textAnchor="middle">
            12:00 ZENITH
          </text>
          <text x="1320" y="126" fontSize="10" fontFamily="Azeret Mono" fill="#6B6571" textAnchor="end">
            18:30 DUSK
          </text>
        </svg>
      </div>
    </div>
  );
}
