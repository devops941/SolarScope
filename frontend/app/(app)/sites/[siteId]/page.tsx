"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Zap, MapPin, Clock, Edit3, Plus } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import SiteForm from "@/features/sites/SiteForm";
import SystemForm from "@/features/systems/SystemForm";
import { useSite } from "@/features/sites/useSites";
import { useSystemsBySite } from "@/features/systems/useSystems";

export default function SiteDetailPage({ params }: { params: { siteId: string } }) {
  const { siteId } = params;
  const [editSiteOpen, setEditSiteOpen] = useState(false);
  const [createSystemOpen, setCreateSystemOpen] = useState(false);

  const { data: site, isLoading: siteLoading } = useSite(siteId);
  const { data: systems = [], isLoading: systemsLoading } = useSystemsBySite(siteId);

  if (siteLoading) {
    return (
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="h-5 w-24 bg-canvas rounded animate-pulse" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="max-w-[1200px] mx-auto">
        <Link href="/sites" className="flex items-center gap-1 text-sm text-muted hover:text-app-text mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Sites
        </Link>
        <div className="rounded-xl border border-danger/30 bg-red-50 p-6 text-sm text-danger">
          Site not found or you do not have access.
        </div>
      </div>
    );
  }

  const totalDcKwp = systems.reduce((s, sys) => s + sys.dc_capacity_kwp, 0);
  const totalAcKw = systems.reduce((s, sys) => s + sys.ac_capacity_kw, 0);

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      {/* Back + header */}
      <div>
        <Link href="/sites" className="flex items-center gap-1 text-sm text-muted hover:text-app-text mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Sites
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-app-text">{site.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              {site.address && (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <MapPin className="h-3 w-3" /> {site.address}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-muted">
                <Clock className="h-3 w-3" /> {site.timezone}
              </span>
              <StatusBadge
                label={site.status}
                variant={site.status === "active" ? "success" : "muted"}
                dot
              />
            </div>
          </div>
          <button onClick={() => setEditSiteOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:bg-canvas">
            <Edit3 className="h-3.5 w-3.5" /> Edit
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total DC Capacity", value: `${totalDcKwp.toFixed(1)} kWp` },
          { label: "Total AC Capacity", value: `${totalAcKw.toFixed(1)} kW` },
          { label: "Active Systems", value: systems.filter(s => s.status === "active").length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-surface border border-border p-4">
            <p className="text-xs text-muted mb-1">{label}</p>
            <p className="text-xl font-bold text-app-text">{value}</p>
          </div>
        ))}
      </div>

      {/* Systems */}
      <div className="rounded-xl bg-surface border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-app-text flex items-center gap-2">
            <Zap className="h-4 w-4 text-solar-green" /> Solar Systems ({systems.length})
          </h2>
          <button onClick={() => setCreateSystemOpen(true)}
            className="flex items-center gap-1 text-xs text-primary-teal hover:underline">
            <Plus className="h-3.5 w-3.5" /> Add System
          </button>
        </div>

        {systemsLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-14 bg-canvas rounded-lg animate-pulse" />)}
          </div>
        ) : systems.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <p className="text-sm text-muted mb-3">No solar systems configured yet.</p>
            <button onClick={() => setCreateSystemOpen(true)}
              className="rounded-lg bg-primary-teal px-4 py-2 text-xs font-medium text-white hover:bg-deep-teal">
              Add first system
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {systems.map((sys) => (
              <div key={sys.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-app-text">{sys.name}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {sys.dc_capacity_kwp} kWp DC · {sys.ac_capacity_kw} kW AC
                    {sys.panel_count ? ` · ${sys.panel_count} panels` : ""}
                    {sys.inverter_make ? ` · ${sys.inverter_make}` : ""}
                  </p>
                </div>
                <StatusBadge label={sys.status} variant="success" dot />
                <Link href={`/systems/${sys.id}`} className="text-xs text-primary-teal hover:underline">
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Import Data", href: "/imports/new" },
          { label: "View Readings", href: "/readings" },
          { label: "Run Analytics", href: "/analytics" },
          { label: "View Reports", href: "/reports" },
        ].map(({ label, href }) => (
          <Link key={href} href={href}
            className="rounded-xl bg-surface border border-border px-4 py-3 text-sm font-medium text-primary-teal hover:bg-canvas transition-colors">
            {label} →
          </Link>
        ))}
      </div>

      {/* Drawers */}
      <SiteForm open={editSiteOpen} onClose={() => setEditSiteOpen(false)} site={site} />
      <SystemForm open={createSystemOpen} onClose={() => setCreateSystemOpen(false)} siteId={siteId} />
    </div>
  );
}
