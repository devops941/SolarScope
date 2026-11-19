"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Edit3, Zap } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { SkeletonCard } from "@/components/ui/Skeleton";
import SystemForm from "@/features/systems/SystemForm";
import { useSystem } from "@/features/systems/useSystems";

export default function SystemDetailPage({ params }: { params: { systemId: string } }) {
  const { systemId } = params;
  const [editOpen, setEditOpen] = useState(false);
  const { data: system, isLoading } = useSystem(systemId);

  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <div className="h-5 w-24 bg-canvas rounded animate-pulse" />
        <SkeletonCard />
        <div className="grid grid-cols-2 gap-4">
          <SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }

  if (!system) {
    return (
      <div className="w-full">
        <Link href="/sites" className="flex items-center gap-1 text-sm text-muted hover:text-app-text mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Sites
        </Link>
        <div className="rounded-xl border border-danger/30 bg-red-50 p-6 text-sm text-danger">
          System not found or you do not have access.
        </div>
      </div>
    );
  }

  const configFields = [
    { label: "DC Capacity", value: `${system.dc_capacity_kwp} kWp` },
    { label: "AC Capacity", value: `${system.ac_capacity_kw} kW` },
    { label: "Panel Count", value: system.panel_count ? `${system.panel_count} panels` : "—" },
    { label: "Panel Rating", value: system.panel_rating_w ? `${system.panel_rating_w} W each` : "—" },
    { label: "Tilt Angle", value: `${system.tilt_degrees}°` },
    { label: "Azimuth", value: `${system.azimuth_degrees}° (${system.azimuth_degrees === 180 ? "South" : system.azimuth_degrees === 0 ? "North" : system.azimuth_degrees === 90 ? "East" : system.azimuth_degrees === 270 ? "West" : "Custom"})` },
    { label: "Temp Coefficient", value: system.temp_coefficient_per_c != null ? `${(system.temp_coefficient_per_c * 100).toFixed(2)} %/°C` : "—" },
    { label: "Inverter", value: system.inverter_make ?? "—" },
    { label: "Commissioning", value: system.commissioning_date ?? "—" },
  ];

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div>
        <Link href="/sites" className="flex items-center gap-1 text-sm text-muted hover:text-app-text mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Sites
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-app-text">{system.name}</h1>
            <p className="text-sm text-muted mt-0.5">
              {system.dc_capacity_kwp} kWp DC · {system.ac_capacity_kw} kW AC
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge label={system.status} variant="success" dot />
            <button onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:bg-canvas">
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
        </div>
      </div>

      {/* Config card */}
      <div className="rounded-xl bg-surface border border-border p-5">
        <h2 className="text-sm font-semibold text-app-text mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-solar-green" /> Configuration
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
          {configFields.map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted">{label}</p>
              <p className="text-sm font-medium text-app-text mt-0.5">{value}</p>
            </div>
          ))}
        </div>
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
            className="rounded-xl bg-surface border border-border px-4 py-3 text-sm font-medium text-primary-teal hover:bg-canvas">
            {label} →
          </Link>
        ))}
      </div>

      {/* Edit drawer */}
      {system && (
        <SystemForm
          open={editOpen}
          onClose={() => setEditOpen(false)}
          siteId={system.site_id}
          system={system}
        />
      )}
    </div>
  );
}
