"use client";

import { useState, useMemo, useEffect } from "react";
import { Download, Filter, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import QualityBadge from "@/features/readings/QualityBadge";
import ReadingDetail from "@/features/readings/ReadingDetail";
import { useSites } from "@/features/sites/useSites";
import { useSystemsBySite } from "@/features/systems/useSystems";
import { useReadings, buildExportUrl, type Reading, type ReadingsFilter } from "@/features/readings/useReadings";
import { cn } from "@/lib/utils";

function fmt(v: number | undefined | null, dec = 2): string {
  return v != null ? v.toFixed(dec) : "—";
}

function SortIcon({ field, current, order }: { field: string; current: string; order: string }) {
  if (field !== current) return null;
  return order === "asc"
    ? <ChevronUp className="h-3 w-3 text-primary-teal" />
    : <ChevronDown className="h-3 w-3 text-primary-teal" />;
}

export default function ReadingsPage() {
  // ── Filter state ───────────────────────────────────────────────────
  const [siteId, setSiteId] = useState("");
  const [systemId, setSystemId] = useState("");
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2026-11-01");
  const [quality, setQuality] = useState("all");
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedReading, setSelectedReading] = useState<Reading | null>(null);

  // ── Site / system selectors ────────────────────────────────────────
  const { data: sitesData } = useSites();
  const { data: systems = [] } = useSystemsBySite(siteId);
  const sites = sitesData?.items ?? [];

  // Auto-select site & system
  useEffect(() => {
    if (!siteId && sites.length > 0) {
      setSiteId(sites[0].id);
    }
  }, [sites, siteId]);

  useEffect(() => {
    if (siteId && !systemId && systems.length > 0) {
      setSystemId(systems[0].id);
    }
  }, [systems, siteId, systemId]);

  // ── Build filter ───────────────────────────────────────────────────
  const filter: ReadingsFilter | null = useMemo(() => {
    if (!siteId || !systemId) return null;
    return {
      siteId,
      systemId,
      start: `${startDate}T00:00:00Z`,
      end: `${endDate}T23:59:59Z`,
      quality,
      page,
      pageSize: 50,
      sortOrder,
    };
  }, [siteId, systemId, startDate, endDate, quality, page, sortOrder]);

  const { data, isLoading, error } = useReadings(filter);
  const readings = data?.items ?? [];

  const exportUrl = filter ? buildExportUrl(filter) : null;

  function toggleSort() {
    setSortOrder(s => s === "asc" ? "desc" : "asc");
    setPage(1);
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-app-text">Readings Explorer</h1>
          <p className="text-sm text-muted mt-0.5">
            {data?.total != null ? (
              <>{data.total.toLocaleString()} readings · Coverage {data.coverage_pct}%
                {data.missing_intervals > 0 && ` · ${data.missing_intervals} missing intervals`}
              </>
            ) : "Select a site and system to explore readings"}
          </p>
        </div>
        {exportUrl && (
          <a
            href={exportUrl}
            download
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:bg-canvas"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </a>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-surface border border-border p-3">
        <Filter className="h-4 w-4 text-muted mt-5" />

        {/* Site */}
        <div>
          <label className="block text-xs text-muted mb-1">Site</label>
          <select
            value={siteId}
            onChange={(e) => { setSiteId(e.target.value); setSystemId(""); setPage(1); }}
            className="rounded-lg border border-border bg-canvas px-3 py-1.5 text-sm text-app-text focus:outline-none focus:ring-1 focus:ring-primary-teal"
          >
            <option value="">All sites</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* System */}
        <div>
          <label className="block text-xs text-muted mb-1">System</label>
          <select
            value={systemId}
            onChange={(e) => { setSystemId(e.target.value); setPage(1); }}
            disabled={!siteId}
            className="rounded-lg border border-border bg-canvas px-3 py-1.5 text-sm text-app-text focus:outline-none focus:ring-1 focus:ring-primary-teal disabled:opacity-50"
          >
            <option value="">Select system</option>
            {systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Date range */}
        <div>
          <label className="block text-xs text-muted mb-1">From</label>
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="rounded-lg border border-border bg-canvas px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-teal" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">To</label>
          <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="rounded-lg border border-border bg-canvas px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-teal" />
        </div>

        {/* Quality filter */}
        <div className="flex gap-1 ml-auto">
          {["all", "valid", "flagged"].map((q) => (
            <button key={q} onClick={() => { setQuality(q); setPage(1); }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                quality === q ? "bg-primary-teal text-white" : "border border-border text-muted hover:bg-canvas"
              )}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      {data && (
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-muted">
            Showing <strong className="text-app-text">{readings.length}</strong> of{" "}
            <strong className="text-app-text">{data.total.toLocaleString()}</strong> readings
          </span>
          <span className={cn("font-medium", data.coverage_pct >= 95 ? "text-solar-green" : "text-warning")}>
            {data.coverage_pct}% coverage
          </span>
          {data.missing_intervals > 0 && (
            <span className="text-muted">{data.missing_intervals} missing 15-min intervals</span>
          )}
          <span className="text-muted">Page {data.page} of {data.pages}</span>
        </div>
      )}

      {/* Table */}
      {!filter ? (
        <EmptyState
          title="Select a site and system"
          description="Choose a site and system above to explore normalized readings."
        />
      ) : isLoading ? (
        <SkeletonTable rows={8} />
      ) : error ? (
        <div className="rounded-xl border border-danger/30 bg-red-50 p-4 text-sm text-danger">
          Failed to load readings. {(error as Error).message}
        </div>
      ) : readings.length === 0 ? (
        <EmptyState
          title="No readings found"
          description="No readings match your current filters. Try adjusting the date range or import data first."
        />
      ) : (
        <div className="rounded-xl bg-surface border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-border bg-canvas">
                <th className="text-left px-3 py-3 font-medium text-muted">
                  <button onClick={toggleSort} className="flex items-center gap-1 hover:text-app-text">
                    Timestamp (UTC)
                    <SortIcon field="timestamp" current="timestamp" order={sortOrder} />
                  </button>
                </th>
                <th className="text-right px-3 py-3 font-medium text-muted">Power (kW)</th>
                <th className="text-right px-3 py-3 font-medium text-muted">Energy (kWh)</th>
                <th className="text-right px-3 py-3 font-medium text-muted hidden lg:table-cell">Irr. (W/m²)</th>
                <th className="text-right px-3 py-3 font-medium text-muted hidden xl:table-cell">Amb. (°C)</th>
                <th className="text-right px-3 py-3 font-medium text-muted hidden xl:table-cell">Mod. (°C)</th>
                <th className="px-3 py-3 font-medium text-muted">Quality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {readings.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-canvas/50 cursor-pointer"
                  onClick={() => setSelectedReading(r)}
                >
                  <td className="px-3 py-2.5 font-mono text-xs text-app-text">
                    {r.timestamp_utc ? new Date(r.timestamp_utc).toISOString().replace("T", " ").slice(0, 19) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmt(r.power_kw)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmt(r.interval_energy_kwh, 4)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums hidden lg:table-cell">{fmt(r.irradiance_w_m2, 1)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums hidden xl:table-cell">{fmt(r.ambient_temp_c, 1)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums hidden xl:table-cell">{fmt(r.module_temp_c, 1)}</td>
                  <td className="px-3 py-2.5">
                    <QualityBadge flags={r.quality} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:bg-canvas disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-sm text-muted">
            Page {data.page} of {data.pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(data.pages, p + 1))}
            disabled={page >= data.pages}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:bg-canvas disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Row detail drawer */}
      <ReadingDetail reading={selectedReading} onClose={() => setSelectedReading(null)} />
    </div>
  );
}
