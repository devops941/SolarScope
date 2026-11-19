"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  BarChart3,
  Table2,
  Zap,
  Sun,
  Thermometer,
  Activity,
  Layers,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonTable, SkeletonChart } from "@/components/ui/Skeleton";
import QualityBadge from "@/features/readings/QualityBadge";
import ReadingDetail from "@/features/readings/ReadingDetail";
import { useSites } from "@/features/sites/useSites";
import { useSystemsBySite } from "@/features/systems/useSystems";
import { useReadings, buildExportUrl, type Reading, type ReadingsFilter } from "@/features/readings/useReadings";
import { useDashboardSeries } from "@/features/dashboard/useDashboard";
import BarChart from "@/components/charts/BarChart";
import AreaChart from "@/components/charts/AreaChart";
import LineChart from "@/components/charts/LineChart";
import { cn } from "@/lib/utils";

function fmt(v: number | undefined | null, dec = 2): string {
  return v != null ? v.toFixed(dec) : "—";
}

function SortIcon({ field, current, order }: { field: string; current: string; order: string }) {
  if (field !== current) return null;
  return order === "asc" ? (
    <ChevronUp className="h-3 w-3 text-primary-teal" />
  ) : (
    <ChevronDown className="h-3 w-3 text-primary-teal" />
  );
}

export default function ReadingsPage() {
  // ── View Mode & Filter state ─────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"combined" | "charts" | "table">("combined");
  const [siteId, setSiteId] = useState("");
  const [systemId, setSystemId] = useState("");
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2026-11-18");
  const [quality, setQuality] = useState("all");
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedReading, setSelectedReading] = useState<Reading | null>(null);

  // ── Site / system selectors ──────────────────────────────────────────
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

  // ── Build filters ────────────────────────────────────────────────────
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

  const seriesFilter = useMemo(() => {
    if (!siteId || !systemId) return null;
    return {
      siteId,
      systemId,
      start: `${startDate}T00:00:00Z`,
      end: `${endDate}T23:59:59Z`,
      interval: "15m",
    };
  }, [siteId, systemId, startDate, endDate]);

  const { data, isLoading, error } = useReadings(filter);
  const { data: seriesData, isLoading: seriesLoading } = useDashboardSeries(seriesFilter);

  const readings = data?.items ?? [];
  const exportUrl = filter ? buildExportUrl(filter) : null;

  function toggleSort() {
    setSortOrder((s) => (s === "asc" ? "desc" : "asc"));
    setPage(1);
  }

  // ── Process visual analytics charts ──────────────────────────────────
  const isMultiDay = startDate !== endDate;

  // 1. Daily energy generation for BarChart
  const dailyEnergyBarData = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    for (const p of seriesData?.series ?? []) {
      if (!p.timestamp_utc) continue;
      const d = new Date(p.timestamp_utc);
      const dayKey = `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })}`;
      const energy = p.energy_kwh ?? (p.generation_kw ? p.generation_kw * 0.25 : 0);
      dailyMap[dayKey] = (dailyMap[dayKey] ?? 0) + energy;
    }
    return Object.entries(dailyMap).map(([day, energy]) => ({
      day,
      energy: Math.round(energy * 100) / 100,
    }));
  }, [seriesData]);

  // 2. Power vs Irradiance Area Series
  const powerIrrSeries = useMemo(() => {
    return (seriesData?.series ?? []).map((p) => {
      const d = p.timestamp_utc ? new Date(p.timestamp_utc) : null;
      let timeLabel = "";
      if (d) {
        if (isMultiDay) {
          timeLabel = `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })} ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
        } else {
          timeLabel = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        }
      }
      return {
        time: timeLabel,
        power: p.generation_kw ?? 0,
        irradiance: p.irradiance_w_m2 ?? 0,
      };
    });
  }, [seriesData, isMultiDay]);

  // 3. Temperature Line Series
  const thermalLineSeries = useMemo(() => {
    return (seriesData?.series ?? [])
      .map((p) => {
        const d = p.timestamp_utc ? new Date(p.timestamp_utc) : null;
        let timeLabel = "";
        if (d) {
          if (isMultiDay) {
            timeLabel = `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })} ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
          } else {
            timeLabel = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
          }
        }
        return {
          time: timeLabel,
          ambient: p.ambient_temp_c ?? null,
          module: p.module_temp_c ?? null,
        };
      })
      .filter((p) => p.ambient !== null || p.module !== null);
  }, [seriesData, isMultiDay]);

  // 4. Quick Highlights Metrics
  const quickStats = useMemo(() => {
    const series = seriesData?.series ?? [];
    let totalEnergy = 0;
    let maxPower = 0;
    let maxIrr = 0;
    let tempSum = 0;
    let tempCount = 0;

    for (const p of series) {
      const e = p.energy_kwh ?? (p.generation_kw ? p.generation_kw * 0.25 : 0);
      totalEnergy += e;
      if (p.generation_kw && p.generation_kw > maxPower) maxPower = p.generation_kw;
      if (p.irradiance_w_m2 && p.irradiance_w_m2 > maxIrr) maxIrr = p.irradiance_w_m2;
      if (p.module_temp_c) {
        tempSum += p.module_temp_c;
        tempCount++;
      }
    }

    return {
      totalEnergy: Math.round(totalEnergy * 10) / 10,
      maxPower: Math.round(maxPower * 100) / 100,
      maxIrr: Math.round(maxIrr * 10) / 10,
      avgModuleTemp: tempCount > 0 ? (tempSum / tempCount).toFixed(1) : "—",
    };
  }, [seriesData]);

  return (
    <div className="w-full space-y-5">
      {/* Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-app-text">Readings & Visual Analytics</h1>
            {data?.total != null && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-muted">
                {data.total.toLocaleString()} intervals
              </span>
            )}
          </div>
          <p className="text-sm text-muted mt-0.5">
            {data?.total != null ? (
              <>
                Coverage <strong className="text-solar-green font-semibold">{data.coverage_pct}%</strong>
                {data.missing_intervals > 0 && ` · ${data.missing_intervals} missing intervals`}
              </>
            ) : (
              "Select a solar site and array system to visualize telemetry analytics."
            )}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-border bg-surface p-1 shadow-xs">
            <button
              onClick={() => setViewMode("combined")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                viewMode === "combined"
                  ? "bg-primary-teal text-white shadow-xs"
                  : "text-muted hover:text-app-text"
              )}
            >
              <Layers className="h-3.5 w-3.5" /> Combined
            </button>
            <button
              onClick={() => setViewMode("charts")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                viewMode === "charts"
                  ? "bg-primary-teal text-white shadow-xs"
                  : "text-muted hover:text-app-text"
              )}
            >
              <BarChart3 className="h-3.5 w-3.5" /> Charts
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                viewMode === "table"
                  ? "bg-primary-teal text-white shadow-xs"
                  : "text-muted hover:text-app-text"
              )}
            >
              <Table2 className="h-3.5 w-3.5" /> Table
            </button>
          </div>

          {exportUrl && (
            <a
              href={exportUrl}
              download
              className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-muted hover:bg-canvas hover:text-app-text transition shadow-xs"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </a>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-surface border border-border p-4 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted pb-2">
          <Filter className="h-4 w-4" /> Filters:
        </div>

        {/* Site Selector */}
        <div className="min-w-[180px]">
          <label className="block text-xs font-semibold text-muted mb-1">Site</label>
          <select
            value={siteId}
            onChange={(e) => {
              setSiteId(e.target.value);
              setSystemId("");
              setPage(1);
            }}
            className="w-full rounded-lg border border-border bg-canvas px-3 py-1.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-primary-teal"
          >
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* System Selector */}
        <div className="min-w-[200px]">
          <label className="block text-xs font-semibold text-muted mb-1">Solar System Array</label>
          <select
            value={systemId}
            onChange={(e) => {
              setSystemId(e.target.value);
              setPage(1);
            }}
            disabled={!siteId}
            className="w-full rounded-lg border border-border bg-canvas px-3 py-1.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-primary-teal disabled:opacity-50"
          >
            <option value="">Select system</option>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.dc_capacity_kwp} kWp)
              </option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-border bg-canvas px-3 py-1.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-primary-teal"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-border bg-canvas px-3 py-1.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-primary-teal"
          />
        </div>

        {/* Quality filter */}
        <div className="flex items-center gap-1 ml-auto">
          {["all", "valid", "flagged"].map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuality(q);
                setPage(1);
              }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                quality === q
                  ? "bg-primary-teal text-white shadow-xs"
                  : "border border-border text-muted hover:bg-canvas"
              )}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ── Visual Analytics Section (Charts & KPIs) ── */}
      {viewMode !== "table" && (
        <div className="space-y-5">
          {/* Visual KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-surface p-4 shadow-xs flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pale-mint text-primary-teal shrink-0">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total Energy</p>
                <p className="text-xl font-bold text-app-text mt-0.5">
                  {quickStats.totalEnergy.toLocaleString()} <span className="text-xs font-normal text-muted">kWh</span>
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 shadow-xs flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-solar-green shrink-0">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Peak Inverter Power</p>
                <p className="text-xl font-bold text-solar-green mt-0.5">
                  {quickStats.maxPower} <span className="text-xs font-normal text-muted">kW</span>
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 shadow-xs flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
                <Sun className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Peak Irradiance</p>
                <p className="text-xl font-bold text-app-text mt-0.5">
                  {quickStats.maxIrr} <span className="text-xs font-normal text-muted">W/m²</span>
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 shadow-xs flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-warning shrink-0">
                <Thermometer className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Avg Module Temp</p>
                <p className="text-xl font-bold text-app-text mt-0.5">
                  {quickStats.avgModuleTemp} <span className="text-xs font-normal text-muted">°C</span>
                </p>
              </div>
            </div>
          </div>

          {/* Charts Row: Bar Chart + Power/Irradiance Area Curve */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 1. Daily Energy Production Bar Chart */}
            <div className="rounded-2xl bg-surface border border-border p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-app-text flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-solar-green" /> Daily Energy Yield (Bar Chart)
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Aggregated electricity production (kWh) per calendar day
                  </p>
                </div>
              </div>

              {seriesLoading ? (
                <SkeletonChart />
              ) : (
                <BarChart
                  data={dailyEnergyBarData}
                  xKey="day"
                  bars={[{ key: "energy", label: "Energy Produced (kWh)", color: "#10B981" }]}
                  height={240}
                  unit="kWh"
                />
              )}
            </div>

            {/* 2. Power Output vs Solar Irradiance Curve */}
            <div className="rounded-2xl bg-surface border border-border p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-app-text flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary-teal" /> Power Generation vs Irradiance
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Diurnal solar bell curve comparing AC power against sunlight
                  </p>
                </div>
              </div>

              {seriesLoading ? (
                <SkeletonChart />
              ) : (
                <AreaChart
                  data={powerIrrSeries}
                  xKey="time"
                  areas={[
                    { key: "power", label: "Inverter AC Power (kW)", color: "#10B981" },
                    { key: "irradiance", label: "Solar Irradiance (W/m²)", color: "#2563EB" },
                  ]}
                  height={240}
                />
              )}
            </div>
          </div>

          {/* 3. Module & Ambient Temperature Line Chart */}
          {thermalLineSeries.length > 0 && (
            <div className="rounded-2xl bg-surface border border-border p-5 shadow-xs">
              <div className="mb-2">
                <h3 className="text-base font-bold text-app-text flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-warning" /> Thermal Tracking (Module vs Ambient)
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Panel surface heating compared to ambient air temperature
                </p>
              </div>

              {seriesLoading ? (
                <SkeletonChart />
              ) : (
                <LineChart
                  data={thermalLineSeries}
                  xKey="time"
                  lines={[
                    { key: "module", label: "Module Temp (°C)", color: "#F97316" },
                    { key: "ambient", label: "Ambient Temp (°C)", color: "#3B82F6" },
                  ]}
                  height={200}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Table Section ── */}
      {viewMode !== "charts" && (
        <div className="space-y-3">
          {viewMode === "combined" && (
            <div className="flex items-center justify-between pt-2">
              <h3 className="text-base font-bold text-app-text flex items-center gap-2">
                <Table2 className="h-4 w-4 text-muted" /> Detailed Telemetry Interval Records
              </h3>
              {data && (
                <span className="text-xs text-muted">
                  Page {data.page} of {data.pages} ({readings.length} loaded)
                </span>
              )}
            </div>
          )}

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
            <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[850px]">
                  <thead>
                    <tr className="border-b border-border bg-canvas/80 text-xs uppercase tracking-wider text-muted">
                      <th
                        className="text-left px-4 py-3.5 font-semibold cursor-pointer hover:text-primary-teal select-none"
                        onClick={toggleSort}
                      >
                        <div className="flex items-center gap-1">
                          Timestamp (UTC)
                          <SortIcon field="timestamp_utc" current="timestamp_utc" order={sortOrder} />
                        </div>
                      </th>
                      <th className="text-right px-4 py-3.5 font-semibold">Power (kW)</th>
                      <th className="text-right px-4 py-3.5 font-semibold">Energy (kWh)</th>
                      <th className="text-right px-4 py-3.5 font-semibold">Irr. (W/m²)</th>
                      <th className="text-right px-4 py-3.5 font-semibold hidden md:table-cell">Amb. (°C)</th>
                      <th className="text-right px-4 py-3.5 font-semibold hidden md:table-cell">Mod. (°C)</th>
                      <th className="text-right px-4 py-3.5 font-semibold hidden lg:table-cell">Voltage (V)</th>
                      <th className="text-right px-4 py-3.5 font-semibold hidden lg:table-cell">Current (A)</th>
                      <th className="text-left px-4 py-3.5 font-semibold">Quality</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {readings.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedReading(r)}
                        className="hover:bg-canvas/50 cursor-pointer transition"
                      >
                        <td className="px-4 py-3 text-xs font-mono text-app-text whitespace-nowrap">
                          {r.timestamp_utc ? r.timestamp_utc.replace("T", " ").replace("Z", "") : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-app-text">
                          {fmt(r.power_kw, 2)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted">{fmt(r.interval_energy_kwh, 4)}</td>
                        <td className="px-4 py-3 text-right text-muted">{fmt(r.irradiance_w_m2, 1)}</td>
                        <td className="px-4 py-3 text-right text-muted hidden md:table-cell">
                          {fmt(r.ambient_temp_c, 1)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted hidden md:table-cell">
                          {fmt(r.module_temp_c, 1)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted hidden lg:table-cell">
                          {fmt(r.voltage_v, 1)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted hidden lg:table-cell">
                          {fmt(r.current_a, 2)}
                        </td>
                        <td className="px-4 py-3">
                          <QualityBadge flags={r.quality} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data && data.pages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted bg-canvas/40">
                  <span>
                    Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, data.total)} of{" "}
                    {data.total.toLocaleString()} readings
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="rounded-lg border border-border bg-surface px-2.5 py-1.5 hover:bg-canvas disabled:opacity-40"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="px-2 font-medium text-app-text">
                      {page} / {data.pages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                      disabled={page >= data.pages}
                      className="rounded-lg border border-border bg-surface px-2.5 py-1.5 hover:bg-canvas disabled:opacity-40"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reading detail drawer */}
      {selectedReading && (
        <ReadingDetail
          reading={selectedReading}
          onClose={() => setSelectedReading(null)}
        />
      )}
    </div>
  );
}
