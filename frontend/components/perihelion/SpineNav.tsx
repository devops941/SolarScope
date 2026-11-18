"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAlertCounts } from "@/features/alerts/useAlerts";
import { useAuth } from "@/features/auth/useAuth";
import { Role } from "@/types";

interface NavItem {
  id: string;
  label: string;
  href: string;
  minRole?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", href: "/dashboard" },
  { id: "sites", label: "Sites", href: "/sites" },
  { id: "imports", label: "Imports", href: "/imports" },
  { id: "readings", label: "Readings", href: "/readings" },
  { id: "analytics", label: "Analytics", href: "/analytics" },
  { id: "alerts", label: "Alerts", href: "/alerts" },
  { id: "reports", label: "Reports", href: "/reports" },
  { id: "team", label: "Team", href: "/team", minRole: "workspace_admin" },
];

export default function SpineNav() {
  const pathname = usePathname();
  const { data: alertCounts } = useAlertCounts();
  const { user } = useAuth();
  const navRef = useRef<HTMLElement>(null);

  const openAlertsCount = (alertCounts?.critical ?? 0) + (alertCounts?.warning ?? 0);

  // Filter items based on user role
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.minRole) return true;
    if (!user) return false;
    // Admins see team tab
    return user.role === "workspace_admin" || user.role === "platform_admin";
  });

  // Keyboard navigation (Arrow Up / Down / Left / Right)
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      nextIndex = (index + 1) % visibleItems.length;
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      nextIndex = (index - 1 + visibleItems.length) % visibleItems.length;
    }

    if (nextIndex >= 0) {
      e.preventDefault();
      const links = navRef.current?.querySelectorAll<HTMLAnchorElement>("a[data-spine-tab]");
      links?.[nextIndex]?.focus();
    }
  };

  return (
    <>
      {/* Desktop Right-Edge Spine Nav (44px fixed width strip) */}
      <nav
        ref={navRef}
        aria-label="Primary Navigation"
        className="hidden md:flex fixed right-0 top-0 bottom-0 w-[44px] z-40 bg-paper border-l border-rule flex-col items-center justify-between select-none"
      >
        {/* Top Brand Glyph */}
        <div className="h-12 w-full flex items-center justify-center border-b border-rule bg-paper">
          <Link
            href="/dashboard"
            title="SolarScope Perihelion Edge"
            className="flex items-center justify-center font-display text-xs font-bold text-magenta hover:text-magenta-deep transition"
          >
            ☉
          </Link>
        </div>

        {/* Central Vertical Spine Tabs */}
        <div className="flex-1 w-full flex flex-col justify-center divide-y divide-rule py-1">
          {visibleItems.map((item, idx) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.id}
                href={item.href}
                data-spine-tab="true"
                onKeyDown={(e) => handleKeyDown(e, idx)}
                title={item.label}
                className={`relative w-full flex-1 flex items-center justify-center transition-colors group ${
                  isActive
                    ? "bg-magenta text-white font-medium"
                    : "bg-paper text-ink hover:bg-magenta-wash/40 hover:text-magenta-deep"
                }`}
              >
                {/* 90-degree Rotated Typography */}
                <span
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                  className="text-[12px] tracking-wide font-sans py-2 uppercase whitespace-nowrap"
                >
                  {item.label}
                </span>

                {/* Alert count bubble on Alerts tab */}
                {item.id === "alerts" && openAlertsCount > 0 && (
                  <span
                    className={`absolute top-2 right-1.5 flex h-2 w-2 rounded-full ${
                      isActive ? "bg-sun ring-2 ring-magenta" : "bg-magenta ring-2 ring-paper"
                    }`}
                    title={`${openAlertsCount} active alerts`}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom Profile Dot / Workspace Glyph */}
        <div className="h-12 w-full flex items-center justify-center border-t border-rule bg-paper">
          <Link
            href="/team"
            title={user ? `${user.name} (${user.role})` : "Settings"}
            className="flex h-6 w-6 items-center justify-center rounded-[2px] border border-rule text-[10px] font-mono text-muted hover:border-magenta hover:text-magenta transition"
          >
            {user ? user.name.slice(0, 2).toUpperCase() : "SS"}
          </Link>
        </div>
      </nav>

      {/* Mobile Bottom-Edge Scrolling Tab Row */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 h-12 z-40 bg-surface border-t border-rule flex items-center overflow-x-auto px-2 space-x-1"
      >
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex-shrink-0 px-3 py-1.5 text-xs font-sans tracking-wide uppercase rounded-[2px] transition ${
                isActive
                  ? "bg-magenta text-white font-semibold"
                  : "text-muted hover:text-ink hover:bg-paper"
              }`}
            >
              {item.label}
              {item.id === "alerts" && openAlertsCount > 0 && (
                <span className="ml-1 text-[10px] font-mono font-bold text-sun">
                  ({openAlertsCount})
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
