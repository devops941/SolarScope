"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Play,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  Sun,
  Thermometer,
  ShieldCheck,
  TrendingUp,
  Calendar,
  Layers,
  History,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import { useSites } from "@/features/sites/useSites";
import { useSystemsBySite } from "@/features/systems/useSystems";
import {
  useCreateAnalysisRun,
  useAnalysisRuns,
  type AnalysisRun,
  type MetricResult,
} from "@/features/analytics/useAnalytics";
import { useDashboardSeries, type DashboardFilter } from "@/features/dashboard/useDashboard";
import AreaChart from "@/components/charts/AreaChart";
import BarChart from "@/components/charts/BarChart";
import LineChart from "@/components/charts/LineChart";
import RadialGauge from "@/components/charts/RadialGauge";
import { cn } from "@/lib/utils";

const INTERVALS = [
  { value: "15m", label: "15 min" },
  { value: "30m", label: "30 min" },
  { value: "1h", label: "1 hour" },
  { value: "1d", label: "1 day" },
];

function formatDateSafe(iso?: string) {
  if (!iso) return "";
  try {
    return iso.replace("T", " ").slice(0, 19);
  } catch {
    return iso;
  }
}

function MetricCard({
  title,
  metric,
  highlight = false,
  icon,
}: {
  title: string;
  metric: MetricResult | undefined;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  if (!metric) return null;
  const hasValue = metric.value !== null && metric.value !== undefined;
  const isEstimated = metric.is_estimated;

  return (
    <div
      className={cn(
        "rounded-xl border p-4.5 transition-all shadow-xs",
        highlight
          ? "border-solar-green/40 bg-gradient-to-br from-pale-mint/80 to-surface"
          : "border-border bg-surface hover:border-border/80"
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-medium text-muted">{title}</p>
        {icon && <div className="text-muted/70">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-1.5 mt-1">
        {hasValue ? (
          <>
            <span className="text-2xl font-bold tracking-tight text-app-text">
              {metric.value!.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-semibold text-muted">{metric.unit}</span>
            {isEstimated && (
              <span className="rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-semibold px-1.5 py-0.5 ml-1">
                est.
              </span>
            )}
          </>
        ) : (
          <span className="text-2xl font-bold text-muted">—</span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted mt-2 pt-2 border-t border-border/50">
        <span className="capitalize text-[11px] truncate max-w-[140px]" title={metric.method}>
          {metric.method.replace(/_/g, " ")}
        </span>
        {metric.coverage_pct > 0 && (
          <span className="text-[11px] font-medium text-solar-green">
            {metric.coverage_pct}% cov.
          </span>
        )}
      </div>

      {metric.warnings && metric.warnings.length > 0 && (
        <div className="mt-2 space-y-1">
          {metric.warnings.slice(0, 1).map((w, i) => (
            <p key={i} className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" />
              <span className="truncate" title={w}>{w}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [siteId, setSiteId] = useState("");
  const [systemId, setSystemId] = useState("");
  // Default date range covers October and November 2026 where uploaded telemetry resides
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2026-11-30");
  const [interval, setInterval] = useState("15m");
  const [quality, setQuality] = useState("valid");
  const [result, setResult] = useState<AnalysisRun | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"visuals" | "charts" | "history">("visuals");

  const { data: sitesData, isLoading: sitesLoading } = useSites();
  const { data: systems = [] } = useSystemsBySite(siteId);
  const sites = sitesData?.items ?? [];
  const createRun = useCreateAnalysisRun();

  // Past runs for the selected system
  const { data: pastRuns = [] } = useAnalysisRuns(systemId);

  // Auto-select site & system when available
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

  // Load series data for visual chart representation
  const seriesFilter: DashboardFilter | null = useMemo(() => {
    if (!siteId || !systemId) return null;
    return {
      siteId,
      systemId,
      start: `${startDate}T00:00:00Z`,
      end: `${endDate}T23:59:59Z`,
      interval,
    };
  }, [siteId, systemId, startDate, endDate, interval]);

  const { data: seriesData, isLoading: seriesLoading } = useDashboardSeries(seriesFilter);

  // Recharts series formatting
  const isMultiDay = startDate !== endDate;

  const generationSeries = useMemo(() => {
    return (seriesData?.series ?? []).map((p) => {
      const d = p.timestamp_utc ? new Date(p.timestamp_utc) : null;
      let timeLabel = "";
      if (d && !isNaN(d.getTime())) {
        timeLabel = isMultiDay
          ? `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })} ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
          : d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      }
      return {
        time: timeLabel,
        generation: p.generation_kw ?? 0,
        irradiance: p.irradiance_w_m2 ?? 0,
      };
    });
  }, [seriesData, isMultiDay]);

  const dailyEnergyBarSeries = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    for (const p of seriesData?.series ?? []) {
      if (!p.timestamp_utc) continue;
      const d = new Date(p.timestamp_utc);
      if (isNaN(d.getTime())) continue;
      const dayKey = `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })}`;
      dailyMap[dayKey] =
        (dailyMap[dayKey] ?? 0) +
        (p.energy_kwh ?? (p.generation_kw ? p.generation_kw * 0.25 : 0));
    }
    return Object.entries(dailyMap).map(([day, energy]) => ({
      day,
      energy: Math.round(energy * 100) / 100,
    }));
  }, [seriesData]);

  const tempSeries = useMemo(() => {
    return (seriesData?.series ?? [])
      .map((p) => {
        const d = p.timestamp_utc ? new Date(p.timestamp_utc) : null;
        let timeLabel = "";
        if (d && !isNaN(d.getTime())) {
          timeLabel = isMultiDay
            ? `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })} ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
            : d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        }
        return {
          time: timeLabel,
          ambient: p.ambient_temp_c ?? null,
          module: p.module_temp_c ?? null,
        };
      })
      .filter((p) => p.ambient !== null || p.module !== null);
  }, [seriesData, isMultiDay]);

  async function runAnalysis() {
    if (!systemId) return;
    setErrorMsg(null);
    try {
      const run = await createRun.mutateAsync({
        systemId,
        start: `${startDate}T00:00:00Z`,
        end: `${endDate}T23:59:59Z`,
        interval,
        quality,
      });
      setResult(run);
      setActiveTab("visuals");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setErrorMsg(e?.response?.data?.detail || e?.message || "Failed to execute performance analysis");
    }
  }

  function selectPastRun(run: AnalysisRun) {
    setResult(run);
    if (run.filter_snapshot?.start) {
      setStartDate(run.filter_snapshot.start.slice(0, 10));
    }
    if (run.filter_snapshot?.end) {
      setEndDate(run.filter_snapshot.end.slice(0, 10));
    }
    if (run.filter_snapshot?.interval) {
      setInterval(run.filter_snapshot.interval);
    }
    setActiveTab("visuals");
  }

  const m = result?.metrics;
  const prValue = m?.performance_ratio?.value ?? 0;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-text flex items-center gap-2.5">
            <Activity className="h-6 w-6 text-primary-teal" />
            Performance Intelligence & Analytics
          </h1>
          <p className="text-sm text-muted mt-1">
            Certified IEC 61724 analysis engine with formula versioning, multi-day resampling, and audit trail
          </p>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted mr-1">Quick Range:</span>
          <button
            onClick={() => { setStartDate("2026-11-01"); setEndDate("2026-11-07"); }}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-app-text hover:bg-canvas transition-colors"
          >
            Nov 1 – Nov 7
          </button>
          <button
            onClick={() => { setStartDate("2026-11-01"); setEndDate("2026-11-30"); }}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-app-text hover:bg-canvas transition-colors"
          >
            Nov 2026
          </button>
          <button
            onClick={() => { setStartDate("2026-10-01"); setEndDate("2026-11-30"); }}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-app-text hover:bg-canvas transition-colors"
          >
            Oct – Nov 2026
          </button>
        </div>
      </div>

      {/* Filter and Execution Controls */}
      <div className="rounded-2xl bg-surface border border-border p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Solar Site</label>
            <select
              value={siteId}
              onChange={(e) => {
                setSiteId(e.target.value);
                setSystemId("");
              }}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-app-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary-teal/20 focus:border-primary-teal"
            >
              <option value="">Select site…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Array System</label>
            <select
              value={systemId}
              onChange={(e) => setSystemId(e.target.value)}
              disabled={!siteId}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-app-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary-teal/20 focus:border-primary-teal disabled:opacity-50"
            >
              <option value="">Select system…</option>
              {systems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.dc_capacity_kwp} kWp)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted" /> From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-app-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary-teal/20 focus:border-primary-teal"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted" /> To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-app-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary-teal/20 focus:border-primary-teal"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Interval</label>
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-app-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary-teal/20 focus:border-primary-teal"
            >
              {INTERVALS.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Data Quality</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-app-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary-teal/20 focus:border-primary-teal"
            >
              <option value="valid">Valid only</option>
              <option value="all">All readings</option>
            </select>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted">
            Analysis evaluates IEC 61724 metrics (PR, Specific Yield, POA Irradiation, and Thermal Derating).
          </p>
          <button
            onClick={runAnalysis}
            disabled={!systemId || createRun.isPending}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-primary-teal px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-deep-teal transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {createRun.isPending ? (
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <Play className="h-4 w-4 fill-white" />
            )}
            {createRun.isPending ? "Calculating Metrics…" : "Run Analysis"}
          </button>
        </div>
      </div>

      {/* Error Banners */}
      {(errorMsg || createRun.error) && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to run analysis</p>
            <p className="mt-0.5 text-xs text-red-700 dark:text-red-400">
              {errorMsg || createRun.error?.message}
            </p>
            <p className="mt-1 text-xs text-muted">
              Ensure telemetry readings exist for the selected date range and system.
            </p>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      {result && (
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            onClick={() => setActiveTab("visuals")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
              activeTab === "visuals"
                ? "bg-primary-teal text-white shadow-xs"
                : "text-muted hover:text-app-text hover:bg-canvas"
            )}
          >
            <Activity className="h-4 w-4" />
            Visual Intelligence & KPIs
          </button>
          <button
            onClick={() => setActiveTab("charts")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
              activeTab === "charts"
                ? "bg-primary-teal text-white shadow-xs"
                : "text-muted hover:text-app-text hover:bg-canvas"
            )}
          >
            <BarChart3 className="h-4 w-4" />
            Detailed Charts
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
              activeTab === "history"
                ? "bg-primary-teal text-white shadow-xs"
                : "text-muted hover:text-app-text hover:bg-canvas"
            )}
          >
            <History className="h-4 w-4" />
            Runs History ({pastRuns.length})
          </button>
        </div>
      )}

      {/* Empty State */}
      {!result && !createRun.isPending && (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pale-mint/80 text-primary-teal mb-4">
            <BarChart3 className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-app-text">Ready for Performance Intelligence</h3>
          <p className="text-sm text-muted mt-1.5 max-w-md mx-auto">
            Choose your solar site, array system, and date range above, then click{" "}
            <strong className="text-primary-teal font-semibold">Run Analysis</strong> to compute
            benchmarks and render visual charts.
          </p>

          {pastRuns.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border/60 max-w-xl mx-auto text-left">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                Or Load a Previous Analysis Run ({pastRuns.length})
              </p>
              <div className="space-y-2">
                {pastRuns.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    onClick={() => selectPastRun(r)}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface hover:border-solar-green/60 hover:bg-pale-mint/30 cursor-pointer transition-all"
                  >
                    <div>
                      <span className="font-mono text-xs font-semibold text-primary-teal">
                        Run #{r.id.slice(-6)}
                      </span>
                      <span className="text-xs text-muted ml-2">
                        {r.sample_count.toLocaleString()} samples · {r.filter_snapshot?.start?.slice(0, 10)} to {r.filter_snapshot?.end?.slice(0, 10)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-app-text">
                        {r.metrics?.performance_ratio?.value ? `${r.metrics.performance_ratio.value.toFixed(1)}% PR` : ""}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analysis Results */}
      {result && m && (
        <div className="space-y-6">
          {/* Metadata Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-pale-mint/90 border border-solar-green/30 px-5 py-3.5 shadow-xs">
            <div className="flex flex-wrap items-center gap-3 text-sm text-primary-teal">
              <div className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="h-4.5 w-4.5 text-solar-green" />
                <span>Run ID:</span>
                <span className="font-mono bg-white/80 dark:bg-black/20 px-2 py-0.5 rounded-md text-xs border border-solar-green/30">
                  {result.id.slice(-8)}
                </span>
              </div>
              <span className="text-muted/60">·</span>
              <span>Formula: <strong>{result.formula_version}</strong></span>
              <span className="text-muted/60">·</span>
              <span>Samples: <strong>{result.sample_count.toLocaleString()} readings</strong></span>
              {result.sample_count === 0 && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                  0 readings found in selected dates
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDateSafe(result.created_at)}</span>
            </div>
          </div>

          {/* Warnings Banner if any */}
          {result.warnings.length > 0 && (
            <div className="rounded-xl border border-warning/30 bg-amber-50/90 dark:bg-amber-950/20 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Audit Warnings & Quality Disclosures ({result.warnings.length})</span>
              </div>
              <div className="space-y-1 pl-6">
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-700 dark:text-amber-400">
                    • {w}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* TAB 1: VISUALS (KPIs + Gauge + Generation Bar Chart) */}
          {(activeTab === "visuals" || activeTab === "charts") && (
            <>
              {/* Primary Visual Hero: Performance Ratio Gauge & Daily Generation */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Gauge Card */}
                <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col items-center justify-between shadow-xs">
                  <div className="w-full flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-app-text">Performance Ratio</h3>
                      <p className="text-xs text-muted">IEC 61724 Fleet Benchmark</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        prValue >= 75
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : prValue >= 50
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      )}
                    >
                      {prValue >= 75 ? "Optimal (>75%)" : prValue >= 50 ? "Moderate" : "Underperforming"}
                    </span>
                  </div>

                  <div className="my-3 flex flex-col items-center">
                    <RadialGauge
                      value={prValue}
                      maxValue={100}
                      label="PR INDEX"
                      sublabel={m.performance_ratio?.method?.replace(/_/g, " ") ?? "IEC 61724"}
                      size={190}
                    />
                  </div>

                  <div className="w-full text-xs text-muted border-t border-border/60 pt-3 flex items-center justify-between">
                    <span>Target: &gt; 75%</span>
                    <span>H_POA: {m.irradiation?.value ? `${m.irradiation.value} kWh/m²` : "—"}</span>
                  </div>
                </div>

                {/* Daily Energy Bar Chart */}
                <div className="lg:col-span-2 rounded-2xl border border-border bg-surface p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-bold text-app-text flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-solar-green" />
                          Daily Energy Generation Yield (kWh)
                        </h3>
                        <p className="text-xs text-muted">Aggregated energy yield per day across selected period</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-app-text">
                          {m.energy_kwh?.value ? m.energy_kwh.value.toFixed(1) : "0"}
                        </span>
                        <span className="text-xs text-muted ml-1">kWh Total</span>
                      </div>
                    </div>
                  </div>

                  {dailyEnergyBarSeries.length > 0 ? (
                    <BarChart
                      data={dailyEnergyBarSeries}
                      bars={[{ key: "energy", label: "Energy (kWh)", color: "#10B981" }]}
                      xKey="day"
                      height={210}
                      loading={seriesLoading}
                      unit=" kWh"
                    />
                  ) : (
                    <div className="h-[210px] flex items-center justify-center text-xs text-muted">
                      No daily intervals recorded for this period
                    </div>
                  )}
                </div>
              </div>

              {/* KPI Metrics 8-Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Total Energy Generated"
                  metric={m.energy_kwh}
                  highlight
                  icon={<Zap className="h-4 w-4 text-solar-green" />}
                />
                <MetricCard
                  title="Specific Yield"
                  metric={m.specific_yield}
                  highlight
                  icon={<TrendingUp className="h-4 w-4 text-primary-teal" />}
                />
                <MetricCard
                  title="Performance Ratio (PR)"
                  metric={m.performance_ratio}
                  icon={<ShieldCheck className="h-4 w-4 text-emerald-500" />}
                />
                <MetricCard
                  title="Peak Power Recorded"
                  metric={m.peak_power_kw}
                  icon={<Zap className="h-4 w-4 text-amber-500" />}
                />
                <MetricCard
                  title="Solar Irradiation (H_POA)"
                  metric={m.irradiation}
                  icon={<Sun className="h-4 w-4 text-amber-500" />}
                />
                <MetricCard
                  title="Telemetry Data Coverage"
                  metric={m.data_coverage}
                  icon={<Layers className="h-4 w-4 text-primary-teal" />}
                />
                <MetricCard
                  title="Average Ambient Temp"
                  metric={m.avg_ambient_temp_c}
                  icon={<Thermometer className="h-4 w-4 text-blue-500" />}
                />
                <MetricCard
                  title="Average Module Temp"
                  metric={m.avg_module_temp_c}
                  icon={<Thermometer className="h-4 w-4 text-red-500" />}
                />
              </div>

              {/* Power Generation vs Irradiance Area Chart */}
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-app-text flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary-teal" />
                      Power Generation Tracking vs Solar Irradiance
                    </h3>
                    <p className="text-xs text-muted">
                      Multi-series comparison of Inverter AC Power (kW) vs Incident Solar Irradiance (W/m²)
                    </p>
                  </div>
                </div>

                {generationSeries.length > 0 ? (
                  <AreaChart
                    data={generationSeries}
                    areas={[
                      { key: "generation", label: "Power Output (kW)", color: "#00C49F", fillOpacity: 0.25 },
                      { key: "irradiance", label: "Solar Irradiance (W/m²)", color: "#FFBB28", fillOpacity: 0.15 },
                    ]}
                    xKey="time"
                    height={260}
                    loading={seriesLoading}
                  />
                ) : (
                  <div className="h-[240px] flex items-center justify-center text-xs text-muted">
                    No time-series curves available for this interval
                  </div>
                )}
              </div>

              {/* Thermal Derating Line Chart */}
              {tempSeries.length > 0 && (
                <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-app-text flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-red-500" />
                        Thermal Characteristics: Module vs Ambient Temperature
                      </h3>
                      <p className="text-xs text-muted">
                        High cell temperature reduces panel efficiency. Monitor delta T for thermal derating.
                      </p>
                    </div>
                  </div>

                  <LineChart
                    data={tempSeries}
                    lines={[
                      { key: "module", label: "Module Temp (°C)", color: "#EF4444", unit: "°C" },
                      { key: "ambient", label: "Ambient Temp (°C)", color: "#3B82F6", unit: "°C" },
                    ]}
                    xKey="time"
                    height={240}
                    loading={seriesLoading}
                  />
                </div>
              )}
            </>
          )}

          {/* TAB 3: RUNS HISTORY */}
          {activeTab === "history" && (
            <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
              <div className="p-4 border-b border-border bg-canvas/40 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-app-text">Previous Analysis Runs for this System</h3>
                  <p className="text-xs text-muted">Saved runs with exact formula snapshot and reproducible metrics</p>
                </div>
                <span className="text-xs font-semibold text-muted">{pastRuns.length} total runs</span>
              </div>

              <div className="divide-y divide-border/60">
                {pastRuns.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted">No previous runs saved yet.</div>
                ) : (
                  pastRuns.map((r) => {
                    const isSelected = r.id === result.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => selectPastRun(r)}
                        className={cn(
                          "p-4 flex items-center justify-between transition-colors cursor-pointer",
                          isSelected ? "bg-pale-mint/50" : "hover:bg-canvas"
                        )}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary-teal">
                              #{r.id.slice(-8)}
                            </span>
                            <span className="text-xs text-muted">·</span>
                            <span className="text-xs font-medium text-app-text">
                              {r.filter_snapshot?.start?.slice(0, 10)} to {r.filter_snapshot?.end?.slice(0, 10)}
                            </span>
                            <span className="text-xs text-muted">({r.filter_snapshot?.interval ?? "15m"})</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted">
                            <span>{r.sample_count.toLocaleString()} samples</span>
                            <span>·</span>
                            <span>Formula: {r.formula_version}</span>
                            <span>·</span>
                            <span>{formatDateSafe(r.created_at)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-bold text-app-text">
                              {r.metrics?.performance_ratio?.value ? `${r.metrics.performance_ratio.value.toFixed(1)}% PR` : "—"}
                            </p>
                            <p className="text-xs text-muted">
                              {r.metrics?.energy_kwh?.value ? `${r.metrics.energy_kwh.value.toFixed(1)} kWh` : "—"}
                            </p>
                          </div>
                          <button
                            className={cn(
                              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                              isSelected
                                ? "bg-solar-green text-white"
                                : "border border-border text-app-text hover:bg-surface"
                            )}
                          >
                            {isSelected ? "Active" : "Load"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Methodology & Disclosure */}
          <div className="rounded-2xl bg-canvas border border-border px-5 py-4 text-xs text-muted">
            <p className="font-semibold text-app-text mb-1">Audit Methodology & Calculation Standards</p>
            <p>
              Calculated using SolarScope standard formula version <strong>{result.formula_version}</strong> conforming to
              IEC 61724-1:2021 photovoltaic system performance monitoring.
              {m.performance_ratio?.method === "performance_ratio_indicative" && (
                " Performance Ratio is flagged indicative because irradiance sensor plane is not explicitly confirmed as POA."
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
