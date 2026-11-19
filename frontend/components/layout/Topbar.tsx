"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Bell,
  ChevronDown,
  Activity,
  Layers,
  Sparkles,
  Search,
  Radio,
} from "lucide-react";
import { useSites } from "@/features/sites/useSites";
import { useAlertCounts } from "@/features/alerts/useAlerts";
import { useAuth } from "@/features/auth/useAuth";

const PAGE_METADATA: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": { title: "Executive Dashboard", subtitle: "Real-time Fleet Intelligence" },
  "/sites": { title: "Solar Sites", subtitle: "PV Plant Locations & Infrastructure" },
  "/systems": { title: "Systems & Arrays", subtitle: "Inverters, Arrays & Panel Telemetry" },
  "/imports": { title: "Telemetry Ingestion", subtitle: "CSV Upload & Timezone Normalization" },
  "/readings": { title: "Readings & Visual Analytics", subtitle: "High-Resolution Sensor Stream" },
  "/analytics": { title: "Performance Intelligence", subtitle: "IEC 61724 Certified Engine" },
  "/alerts": { title: "Anomaly Detection & Alerts", subtitle: "Automated Sensor Rule Diagnostics" },
  "/reports": { title: "Reports & Exports", subtitle: "Audit Proof Compliance & CSVs" },
};

interface TopbarProps {
  onMenuClick: () => void;
  title?: string;
}

export default function Topbar({ onMenuClick, title }: TopbarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: sitesData } = useSites();
  const { data: alertCounts } = useAlertCounts();

  const sites = sitesData?.items ?? [];
  const primarySite = sites[0]?.name ?? "All Sites";

  const currentPage = useMemo(() => {
    for (const [route, meta] of Object.entries(PAGE_METADATA)) {
      if (pathname === route || pathname.startsWith(route + "/")) {
        return meta;
      }
    }
    return { title: title || "Performance Intelligence", subtitle: "Solar PV Operations" };
  }, [pathname, title]);

  const activeAlerts = (alertCounts?.critical ?? 0) + (alertCounts?.warning ?? 0);

  const userInitials = useMemo(() => {
    if (!user?.name) return "GK";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [user]);

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center border-b border-border/80 bg-surface/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 transition-all">
      <div className="w-full max-w-[1720px] mx-auto flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger + Dynamic Breadcrumb & Page Context */}
        <div className="flex items-center gap-3">
          <button
            aria-label="Open navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted hover:bg-canvas hover:text-app-text lg:hidden transition"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider hidden sm:inline">
                SolarScope
              </span>
              <span className="text-border text-xs hidden sm:inline">/</span>
              <h1 className="text-sm sm:text-base font-bold text-app-text tracking-tight truncate max-w-[200px] sm:max-w-xs md:max-w-none">
                {currentPage.title}
              </h1>
            </div>
            {currentPage.subtitle && (
              <p className="text-[11px] text-muted hidden md:block">
                {currentPage.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Center: Live Telemetry Operational Status Banner */}
        <div className="hidden xl:flex items-center gap-2 rounded-full border border-solar-green/30 bg-pale-mint/70 px-3.5 py-1 text-xs text-primary-teal shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-solar-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-solar-green" />
          </span>
          <span className="font-semibold text-primary-teal">100% Inverters Operational</span>
          <span className="text-muted/60">·</span>
          <span className="text-muted text-[11px] font-medium">Telemetry Sync Normal</span>
        </div>

        {/* Right: Site Selector + Alerts + Profile shortcut */}
        <div className="flex items-center gap-2.5">
          {/* Site Selector Dropdown Shortcut */}
          <Link
            href="/sites"
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-app-text hover:bg-canvas hover:border-border/80 transition-all shadow-xs"
          >
            <span className="h-2 w-2 rounded-full bg-solar-green shrink-0" />
            <span className="truncate max-w-[110px] sm:max-w-[150px]">{primarySite}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted shrink-0" />
          </Link>

          {/* Alert Notification Bell with Live Counter */}
          <Link
            href="/alerts"
            title="System alerts & anomalies"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted hover:bg-canvas hover:text-app-text transition-all shadow-xs"
          >
            <Bell className="h-4 w-4" />
            {activeAlerts > 0 ? (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white shadow-xs">
                {activeAlerts}
              </span>
            ) : (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-solar-green ring-2 ring-surface" />
            )}
          </Link>

          {/* User Profile Capsule */}
          <div className="flex items-center gap-2 pl-1 border-l border-border/80">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-teal to-solar-green text-white text-xs font-bold shadow-xs">
              {userInitials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-app-text leading-tight truncate max-w-[90px]">
                {user?.name || "Gokul"}
              </p>
              <p className="text-[10px] text-muted leading-none capitalize">
                {user?.role?.toLowerCase() || "Analyst"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
