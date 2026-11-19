"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Layers,
  Plus,
  Search,
  Zap,
  ArrowRight,
  Upload,
  RefreshCw,
  SlidersHorizontal,
  Compass,
  Cpu,
  CheckCircle2,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useSites } from "@/features/sites/useSites";
import { useAllSystems, type SolarSystem } from "@/features/systems/useSystems";
import SystemCreateModal from "@/features/systems/SystemCreateModal";

export default function SystemsFleetPage() {
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { data: sitesData } = useSites();
  const sites = sitesData?.items ?? [];

  const { data: systems = [], isLoading, error, refetch } = useAllSystems(
    selectedSiteId || undefined
  );

  const filteredSystems = useMemo(() => {
    return systems.filter((sys) => {
      const matchSearch =
        sys.name.toLowerCase().includes(search.toLowerCase()) ||
        (sys.inverter_make ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (sys.site_name ?? "").toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [systems, search]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalDc = systems.reduce((acc, s) => acc + (s.dc_capacity_kwp || 0), 0);
    const totalAc = systems.reduce((acc, s) => acc + (s.ac_capacity_kw || 0), 0);
    const totalPanels = systems.reduce((acc, s) => acc + (s.panel_count || 0), 0);
    return {
      count: systems.length,
      totalDc: Math.round(totalDc * 10) / 10,
      totalAc: Math.round(totalAc * 10) / 10,
      totalPanels,
    };
  }, [systems]);

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <div className="h-8 w-44 bg-canvas rounded animate-pulse" />
        <SkeletonTable rows={5} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-app-text">Solar Systems & Arrays</h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-muted">
              {metrics.count} system{metrics.count !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-sm text-muted mt-0.5">
            Manage your solar PV array configurations, inverter ratings, tilt angles, and electrical parameters.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            title="Refresh fleet"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted hover:bg-canvas transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary-teal px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-deep-teal transition"
          >
            <Plus className="h-4 w-4" /> Add Solar System
          </button>
        </div>
      </div>

      {/* KPI Highlights Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Solar Arrays</p>
          <p className="text-2xl font-bold text-app-text mt-1">{metrics.count}</p>
          <p className="text-xs text-solar-green mt-1 flex items-center gap-1 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-solar-green inline-block"></span>
            Configured Inverter Units
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total DC Fleet Capacity</p>
          <p className="text-2xl font-bold text-primary-teal mt-1">{metrics.totalDc} <span className="text-sm font-normal text-muted">kWp</span></p>
          <p className="text-xs text-muted mt-1">{metrics.totalPanels > 0 ? `${metrics.totalPanels.toLocaleString()} PV Panels Installed` : "Panel arrays monitored"}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Inverter AC Capacity</p>
          <p className="text-2xl font-bold text-app-text mt-1">{metrics.totalAc} <span className="text-sm font-normal text-muted">kW</span></p>
          <p className="text-xs text-muted mt-1">Grid Export Rating</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Operational Health</p>
          <p className="text-2xl font-bold text-solar-green mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-5 w-5 text-solar-green" /> 100% Active
          </p>
          <p className="text-xs text-muted mt-1">Telemetry ready</p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface border border-border rounded-xl p-3 shadow-xs">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by system name, inverter…"
            className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-app-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-teal transition"
          />
        </div>

        {/* Site Filter */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted whitespace-nowrap">Filter Site:</span>
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-primary-teal transition w-full sm:w-56"
          >
            <option value="">All Sites ({sites.length})</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fleet Table / Empty State */}
      {filteredSystems.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-pale-mint mb-4">
            <Zap className="h-8 w-8 text-primary-teal" />
          </div>
          <h3 className="text-lg font-semibold text-app-text mb-1">
            {search || selectedSiteId ? "No matching solar systems found" : "No Solar Systems Configured Yet"}
          </h3>
          <p className="text-sm text-muted max-w-md mx-auto mb-6">
            {search || selectedSiteId
              ? "Try adjusting your search criteria or clear the site filter."
              : "Add your first solar PV system / inverter array to begin logging 15-minute telemetry and evaluating PR metrics."}
          </p>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 mx-auto rounded-xl bg-primary-teal px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-deep-teal transition"
          >
            <Plus className="h-4 w-4" /> Add New Solar System
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-surface border border-border overflow-hidden shadow-xs">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-canvas/70">
                <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">System / Array</th>
                <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">Parent Site</th>
                <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">DC Capacity</th>
                <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider hidden md:table-cell">AC Inverter</th>
                <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider hidden lg:table-cell">Panels & Orientation</th>
                <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-right font-semibold text-muted text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSystems.map((sys) => {
                const clippingRatio = Math.round((sys.ac_capacity_kw / sys.dc_capacity_kwp) * 100);
                return (
                  <tr key={sys.id} className="hover:bg-canvas/40 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pale-mint text-primary-teal shrink-0">
                          <Cpu className="h-4 w-4" />
                        </div>
                        <div>
                          <Link href={`/systems/${sys.id}`} className="font-semibold text-app-text hover:text-primary-teal hover:underline">
                            {sys.name}
                          </Link>
                          <p className="text-xs text-muted">
                            {sys.inverter_make ? sys.inverter_make : "Inverter Array"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {sys.site_id ? (
                        <Link
                          href={`/sites/${sys.site_id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-teal hover:underline bg-pale-mint/60 border border-solar-green/20 px-2 py-0.5 rounded-md"
                        >
                          {sys.site_name || "Site Details"} →
                        </Link>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-bold text-app-text">{sys.dc_capacity_kwp}</span>{" "}
                      <span className="text-xs text-muted">kWp</span>
                    </td>

                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="font-medium text-app-text">{sys.ac_capacity_kw} kW</span>
                      <span className="ml-1.5 text-[11px] text-muted">({clippingRatio}% ratio)</span>
                    </td>

                    <td className="px-5 py-4 hidden lg:table-cell text-xs text-muted">
                      <div>
                        {sys.panel_count ? `${sys.panel_count} modules` : "—"}
                        {sys.panel_rating_w ? ` @ ${sys.panel_rating_w}W` : ""}
                      </div>
                      <div className="text-[11px] text-muted/80 mt-0.5 flex items-center gap-1">
                        <Compass className="h-3 w-3" /> Tilt: {sys.tilt_degrees}° · Az: {sys.azimuth_degrees}°
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge label={sys.status} variant={sys.status === "active" ? "success" : "muted"} dot />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href="/imports/new"
                          className="flex items-center gap-1 rounded-lg bg-pale-mint/80 px-2.5 py-1.5 text-xs font-semibold text-primary-teal hover:bg-pale-mint transition"
                          title="Import CSV Telemetry"
                        >
                          <Upload className="h-3.5 w-3.5" /> Import CSV
                        </Link>

                        <Link
                          href={`/systems/${sys.id}`}
                          className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:text-app-text hover:bg-canvas transition"
                        >
                          Details →
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Standalone Add System Modal */}
      <SystemCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        defaultSiteId={selectedSiteId}
        onCreated={() => {
          refetch();
        }}
      />
    </div>
  );
}
