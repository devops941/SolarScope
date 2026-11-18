"use client";

import { Menu, Bell, ChevronDown, Sparkles, RefreshCw, Zap } from "lucide-react";
import Link from "next/link";
import { useDemoSeed } from "@/features/demo/useDemoSeed";

interface TopbarProps {
  onMenuClick: () => void;
  title?: string;
}

export default function Topbar({ onMenuClick, title }: TopbarProps) {
  const { seedDemo, isSeeding } = useDemoSeed();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 lg:px-6">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-app-text lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </button>
        {title ? (
          <h1 className="text-base font-semibold text-app-text">{title}</h1>
        ) : (
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted">
            <span className="flex h-2 w-2 rounded-full bg-solar-green animate-pulse" />
            <span className="font-medium text-app-text">System Status:</span>
            <span className="text-solar-green font-semibold">100% Inverters Operational</span>
          </div>
        )}
      </div>

      {/* Right: Quick Demo Seeder + Alerts + Sites */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => seedDemo()}
          disabled={isSeeding}
          title="Quick seed 30-day demo telemetry"
          className="flex items-center gap-1.5 rounded-lg border border-solar-green/30 bg-pale-mint/80 px-3 py-1.5 text-xs font-semibold text-primary-teal hover:bg-pale-mint transition disabled:opacity-50"
        >
          {isSeeding ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Seeding…</span>
            </>
          ) : (
            <>
              <Zap className="h-3.5 w-3.5 text-solar-green fill-solar-green" />
              <span className="hidden md:inline">Quick Demo Data</span>
            </>
          )}
        </button>

        {/* Site selector shortcut */}
        <Link
          href="/sites"
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-canvas hover:text-app-text transition"
        >
          <span>All Sites</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </Link>

        {/* Alert bell */}
        <Link
          href="/alerts"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-app-text transition"
        >
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />
        </Link>
      </div>
    </header>
  );
}
