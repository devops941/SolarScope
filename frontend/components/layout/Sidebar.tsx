"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  Cpu,
  UploadCloud,
  Activity,
  BarChart3,
  Bell,
  FileText,
  Zap,
  X,
  LogOut,
  Building2,
  ChevronRight,
  ShieldCheck,
  Radio,
} from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useSites } from "@/features/sites/useSites";
import { useAllSystems } from "@/features/systems/useSystems";
import { useAlertCounts } from "@/features/alerts/useAlerts";
import { cn } from "@/lib/utils";

interface NavItemConfig {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeVariant?: "emerald" | "amber" | "neutral";
}

interface NavSection {
  title: string;
  items: NavItemConfig[];
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, workspace, logout } = useAuth();
  const { data: sitesData } = useSites();
  const { data: systems = [] } = useAllSystems();
  const { data: alertCounts } = useAlertCounts();

  const totalSites = sitesData?.total ?? sitesData?.items?.length ?? 0;
  const totalSystems = systems.length;
  const pendingAlerts = (alertCounts?.critical ?? 0) + (alertCounts?.warning ?? 0);

  const sections: NavSection[] = useMemo(() => {
    return [
      {
        title: "Fleet & Monitoring",
        items: [
          { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          {
            label: "Solar Sites",
            href: "/sites",
            icon: MapPin,
            badge: totalSites > 0 ? totalSites : undefined,
            badgeVariant: "neutral",
          },
          {
            label: "Systems & Arrays",
            href: "/systems",
            icon: Cpu,
            badge: totalSystems > 0 ? totalSystems : undefined,
            badgeVariant: "neutral",
          },
          { label: "Readings Explorer", href: "/readings", icon: Activity },
        ],
      },
      {
        title: "Analytics & Compliance",
        items: [
          { label: "Imports Ingestion", href: "/imports", icon: UploadCloud },
          { label: "Performance Analytics", href: "/analytics", icon: BarChart3 },
          {
            label: "Anomalies & Alerts",
            href: "/alerts",
            icon: Bell,
            badge: pendingAlerts > 0 ? pendingAlerts : undefined,
            badgeVariant: "amber",
          },
          { label: "Reports & Audit", href: "/reports", icon: FileText },
        ],
      },
    ];
  }, [totalSites, totalSystems, pendingAlerts]);

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
    <>
      {/* Mobile Backdrop Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col bg-gradient-to-b from-[#0D212F] via-[#102737] to-[#0A1A26] border-r border-white/[0.08] text-white shadow-2xl transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-white/[0.08]">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-teal to-solar-green shadow-md shadow-solar-green/20 group-hover:scale-105 transition-transform">
              <Zap className="h-5 w-5 text-white" />
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#0D212F]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-white font-sans">
                  SolarScope
                </span>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-300 border border-emerald-500/30">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-white/50 tracking-wider font-medium">
                Performance Intelligence
              </p>
            </div>
          </Link>

          <button
            aria-label="Close navigation"
            className="lg:hidden rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white transition"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Workspace Capsule */}
        <div className="mx-4 mt-4">
          <Link
            href="/sites"
            className="group flex items-center justify-between rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] p-3 transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-teal/30 text-emerald-300 border border-emerald-500/20">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  Active Plant
                </p>
                <p className="text-xs font-semibold text-white truncate group-hover:text-emerald-300 transition-colors">
                  {workspace?.name || "Chennai Solar Plant"}
                </p>
              </div>
            </div>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
          </Link>
        </div>

        {/* Categorized Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/35">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ label, href, icon: Icon, badge, badgeVariant }) => {
                  const active = pathname === href || pathname.startsWith(href + "/");
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      className={cn(
                        "group relative flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all",
                        active
                          ? "bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent text-emerald-300 font-semibold border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.12)]"
                          : "text-white/65 hover:bg-white/[0.06] hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            active
                              ? "text-emerald-400"
                              : "text-white/45 group-hover:text-white/80"
                          )}
                        />
                        <span className="truncate">{label}</span>
                      </div>

                      {/* Pill Badge */}
                      {badge !== undefined && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 transition-all",
                            badgeVariant === "amber"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                              : active
                              ? "bg-emerald-500/30 text-emerald-200"
                              : "bg-white/10 text-white/70 group-hover:bg-white/20"
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Live Inverter Engine Health Indicator */}
        <div className="mx-4 mb-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20 p-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-[11px] font-semibold text-emerald-300">
                Grid Synchronized
              </span>
            </div>
            <span className="text-[10px] text-emerald-400/80 font-mono">100% OK</span>
          </div>
        </div>

        {/* User Profile Card & Logout */}
        <div className="border-t border-white/[0.08] p-3.5 bg-black/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-teal to-solar-green text-white text-xs font-bold shadow-md shadow-solar-green/20">
                  {userInitials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#0A1A26]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {user?.name || "Gokul"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block rounded bg-white/10 px-1.5 py-0.2 text-[9px] font-medium text-white/60 capitalize">
                    {user?.role?.toLowerCase() || "analyst"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="rounded-lg p-2 text-white/45 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
