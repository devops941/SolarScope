"use client";

import Link from "next/link";
import { ShieldCheck, Activity, Globe, Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-border/70 py-6 text-xs text-muted transition-colors">
      <div className="w-full max-w-[1720px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Certifications & Standards */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-app-text">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-solar-green/15 text-primary-teal">
              <Sparkles className="h-3 w-3 text-solar-green" />
            </div>
            <span>SolarScope Intelligence</span>
            <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-muted">
              v2.4
            </span>
          </div>
          <span className="text-border">·</span>
          <div className="flex items-center gap-1 text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-solar-green" />
            <span>IEC 61724-1:2021 Standard Verified</span>
          </div>
          <span className="text-border">·</span>
          <div className="flex items-center gap-1 text-muted">
            <Globe className="h-3.5 w-3.5 text-primary-teal" />
            <span>UTC &amp; Asia/Kolkata (IST) Normalized</span>
          </div>
        </div>

        {/* Center / Status */}
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-solar-green animate-pulse" />
          <span className="font-medium text-app-text">Telemetry Engine:</span>
          <span className="text-solar-green font-semibold">100% Inverters Operational</span>
        </div>

        {/* Right: Quick Links */}
        <div className="flex items-center gap-4 text-muted">
          <Link href="/analytics" className="hover:text-primary-teal transition-colors">
            Formula Disclosure
          </Link>
          <span className="text-border">·</span>
          <Link href="/reports" className="hover:text-primary-teal transition-colors">
            Export Reports
          </Link>
          <span className="text-border">·</span>
          <Link href="/systems" className="hover:text-primary-teal transition-colors">
            Fleet Architecture
          </Link>
        </div>
      </div>
    </footer>
  );
}
