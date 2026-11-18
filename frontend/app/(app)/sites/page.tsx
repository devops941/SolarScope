"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, MapPin, RefreshCw, Zap, Sparkles, Activity, CheckCircle2, ArrowRight } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import SiteForm from "@/features/sites/SiteForm";
import { useSites, useArchiveSite } from "@/features/sites/useSites";
import { useDemoSeed } from "@/features/demo/useDemoSeed";

export default function SitesPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error, refetch } = useSites();
  const archiveMutation = useArchiveSite();
  const { seedDemo, isSeeding, successMessage, error: seedError } = useDemoSeed();

  const sites = data?.items ?? [];
  const filtered = sites.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.address ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <div className="h-8 w-32 bg-canvas rounded animate-pulse mb-5" />
        <SkeletonTable rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <div className="rounded-xl border border-danger/30 bg-red-50 p-6 text-sm text-danger">
          Failed to load sites. {error.message}
          <button onClick={() => refetch()} className="ml-3 underline">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Success Notification */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-xl bg-pale-mint border border-solar-green/30 px-4 py-3 text-sm text-deep-teal">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-solar-green shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <Link href="/dashboard" className="flex items-center gap-1 font-semibold text-primary-teal hover:underline text-xs">
            Open Dashboard <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Seed Error Notification */}
      {seedError && (
        <div className="rounded-xl bg-red-50 border border-danger/30 px-4 py-3 text-sm text-danger">
          Failed to load demo data: {seedError}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-app-text">Solar Sites</h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-muted">
              {data?.total ?? 0}
            </span>
          </div>
          <p className="text-sm text-muted mt-0.5">
            Manage your solar PV plant installations, locations, and system arrays.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            title="Refresh list"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted hover:bg-canvas transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          {/* Quick Demo Seeder Button */}
          <button
            onClick={() => seedDemo()}
            disabled={isSeeding}
            className="flex items-center gap-1.5 rounded-lg border border-solar-green/40 bg-pale-mint/70 px-3.5 py-2 text-sm font-medium text-primary-teal hover:bg-pale-mint transition disabled:opacity-50"
          >
            {isSeeding ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-primary-teal" />
                <span>Seeding Demo Data…</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-solar-green" />
                <span>Load Demo Farm</span>
              </>
            )}
          </button>

          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary-teal px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-deep-teal transition"
          >
            <Plus className="h-4 w-4" /> New Site
          </button>
        </div>
      </div>

      {/* Sites Fleet Overview Highlights (when sites exist) */}
      {sites.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Total Monitored Sites</p>
            <p className="text-2xl font-bold text-app-text mt-1">{sites.length}</p>
            <p className="text-xs text-solar-green mt-1 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-solar-green inline-block"></span>
              All Active & Operational
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Total Array Systems</p>
            <p className="text-2xl font-bold text-primary-teal mt-1">
              {sites.reduce((acc, s) => acc + (s.system_count || 1), 0)}
            </p>
            <p className="text-xs text-muted mt-1">Connected Inverters & Panels</p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Telemetry Status</p>
            <p className="text-2xl font-bold text-solar-green mt-1 flex items-center gap-2">
              <Activity className="h-5 w-5 text-solar-green" />
              Real-time Ingestion
            </p>
            <p className="text-xs text-muted mt-1">15-minute sampling interval</p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sites by name or address…"
            className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-app-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-teal transition"
          />
        </div>
      </div>

      {/* Content Area */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-pale-mint mb-4">
            <Zap className="h-8 w-8 text-primary-teal" />
          </div>
          <h3 className="text-lg font-semibold text-app-text mb-1">
            {search ? "No sites match your search" : "No Solar Sites Yet"}
          </h3>
          <p className="text-sm text-muted max-w-md mx-auto mb-6">
            {search
              ? "Try adjusting your search terms or clear the filter."
              : "Get started right away by loading a pre-configured 25 kWp Solar Farm with 30 days of clean telemetry, or create a new site from scratch."}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => seedDemo()}
              disabled={isSeeding}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-primary-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-deep-teal transition disabled:opacity-50"
            >
              {isSeeding ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Loading Demo Farm…</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-solar-green" />
                  <span>⚡ Load 30-Day Demo Solar Plant</span>
                </>
              )}
            </button>

            <button
              onClick={() => setCreateOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-app-text hover:bg-canvas transition"
            >
              <Plus className="h-4 w-4" /> Create Custom Site
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-surface border border-border overflow-hidden shadow-xs">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-canvas/70">
                <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">Site Name</th>
                <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider hidden md:table-cell">Location & Address</th>
                <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider hidden md:table-cell">Timezone</th>
                <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider hidden lg:table-cell">Arrays</th>
                <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-right font-semibold text-muted text-xs uppercase tracking-wider">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((site) => (
                <tr key={site.id} className="hover:bg-canvas/40 transition">
                  <td className="px-5 py-4 font-semibold text-app-text">
                    <Link href={`/sites/${site.id}`} className="hover:text-primary-teal flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pale-mint text-primary-teal shrink-0">
                        <Zap className="h-4 w-4" />
                      </div>
                      <span>{site.name}</span>
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-muted hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-solar-green" />
                      <span className="truncate max-w-xs">{site.address ?? "OMR Corridor, Chennai, India"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted hidden md:table-cell text-xs font-mono">
                    {site.timezone}
                  </td>
                  <td className="px-5 py-4 text-app-text hidden lg:table-cell">
                    <span className="rounded-md bg-canvas px-2.5 py-1 text-xs font-medium text-app-text">
                      {site.system_count || 1} Arrays
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge
                      label={site.status}
                      variant={site.status === "active" ? "success" : site.status === "archived" ? "muted" : "warning"}
                      dot
                    />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard`}
                        className="rounded-lg bg-pale-mint/80 px-2.5 py-1.5 text-xs font-medium text-primary-teal hover:bg-pale-mint transition"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href={`/sites/${site.id}`}
                        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:text-app-text hover:bg-canvas transition"
                      >
                        Details →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create drawer */}
      <SiteForm open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
