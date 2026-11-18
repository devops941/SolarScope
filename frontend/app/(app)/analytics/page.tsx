"use client";

import { useState, useEffect } from "react";
import { Play, BarChart3, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useSites } from "@/features/sites/useSites";
import { useSystemsBySite } from "@/features/systems/useSystems";
import { useCreateAnalysisRun, type AnalysisRun, type MetricResult } from "@/features/analytics/useAnalytics";
import AreaChart from "@/components/charts/AreaChart";
import { cn } from "@/lib/utils";

const INTERVALS = [
  { value: "15m", label: "15 min" },
  { value: "30m", label: "30 min" },
  { value: "1h", label: "1 hour" },
  { value: "1d", label: "1 day" },
];

function MetricCard({ title, metric, highlight = false }: {
  title: string;
  metric: MetricResult | undefined;
  highlight?: boolean;
}) {
  if (!metric) return null;
  const hasValue = metric.value !== null && metric.value !== undefined;
  const isEstimated = metric.is_estimated;

  return (
    <div className={cn(
      "rounded-xl border p-4",
      highlight ? "border-solar-green/30 bg-pale-mint" : "border-border bg-surface"
    )}>
      <p className="text-xs text-muted mb-1">{title}</p>
      <div className="flex items-baseline gap-1.5 mt-1">
        {hasValue ? (
          <>
            <span className="text-xl font-bold text-app-text">{metric.value!.toFixed(2)}</span>
            <span className="text-sm text-muted">{metric.unit}</span>
            {isEstimated && <span className="text-xs text-warning ml-1">est.</span>}
          </>
        ) : (
          <span className="text-xl font-bold text-muted">—</span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-xs text-muted">{metric.method.replace(/_/g, " ")}</span>
        {metric.coverage_pct > 0 && (
          <span className="text-xs text-muted">· {metric.coverage_pct}% coverage</span>
        )}
      </div>
      {metric.warnings.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {metric.warnings.slice(0, 2).map((w, i) => (
            <p key={i} className="text-xs text-warning flex items-start gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" /> {w}
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
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2026-10-31");
  const [interval, setInterval] = useState("15m");
  const [quality, setQuality] = useState("valid");
  const [result, setResult] = useState<AnalysisRun | null>(null);

  const { data: sitesData } = useSites();
  const { data: systems = [] } = useSystemsBySite(siteId);
  const sites = sitesData?.items ?? [];
  const createRun = useCreateAnalysisRun();

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

  async function runAnalysis() {
    if (!systemId) return;
    try {
      const run = await createRun.mutateAsync({
        systemId,
        start: `${startDate}T00:00:00Z`,
        end: `${endDate}T23:59:59Z`,
        interval,
        quality,
      });
      setResult(run);
    } catch {}
  }

  const m = result?.metrics;

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-app-text">Analytics</h1>
        <p className="text-sm text-muted mt-0.5">
          Run performance analysis and calculate metrics with formula versioning
        </p>
      </div>

      {/* Controls */}
      <div className="rounded-xl bg-surface border border-border p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Site</label>
          <select
            value={siteId}
            onChange={(e) => { setSiteId(e.target.value); setSystemId(""); }}
            className="rounded-lg border border-border px-3 py-2 text-sm text-app-text focus:outline-none focus:ring-1 focus:ring-primary-teal"
          >
            <option value="">Select site…</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">System</label>
          <select
            value={systemId}
            onChange={(e) => setSystemId(e.target.value)}
            disabled={!siteId}
            className="rounded-lg border border-border px-3 py-2 text-sm text-app-text focus:outline-none focus:ring-1 focus:ring-primary-teal disabled:opacity-50"
          >
            <option value="">Select system…</option>
            {systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">From</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-teal" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">To</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-teal" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Interval</label>
          <select value={interval} onChange={(e) => setInterval(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm text-app-text focus:outline-none focus:ring-1 focus:ring-primary-teal">
            {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Data quality</label>
          <select value={quality} onChange={(e) => setQuality(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm text-app-text focus:outline-none focus:ring-1 focus:ring-primary-teal">
            <option value="valid">Valid only</option>
            <option value="all">All readings</option>
          </select>
        </div>
        <button
          onClick={runAnalysis}
          disabled={!systemId || createRun.isPending}
          className="flex items-center gap-2 rounded-lg bg-primary-teal px-4 py-2 text-sm font-medium text-white hover:bg-deep-teal disabled:opacity-60"
        >
          {createRun.isPending ? (
            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : <Play className="h-4 w-4" />}
          {createRun.isPending ? "Running…" : "Run Analysis"}
        </button>
      </div>

      {/* Error */}
      {createRun.error && (
        <div className="rounded-xl border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
          {createRun.error.message}
        </div>
      )}

      {/* Empty state */}
      {!result && !createRun.isPending && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas mb-4">
            <BarChart3 className="h-7 w-7 text-muted" />
          </div>
          <p className="text-base font-semibold text-app-text">Select filters and run analysis</p>
          <p className="text-sm text-muted mt-1 max-w-xs">
            Results are saved with formula version and filter snapshot — reproducible at any time.
          </p>
        </div>
      )}

      {/* Results */}
      {result && m && (
        <div className="space-y-5">
          {/* Run metadata */}
          <div className="flex items-center justify-between rounded-xl bg-pale-mint border border-solar-green/20 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-primary-teal">
              <CheckCircle className="h-4 w-4" />
              <span>Run ID: <strong className="font-mono">{result.id.slice(-8)}</strong></span>
              <span className="text-muted">·</span>
              <span>Formula: <strong>{result.formula_version}</strong></span>
              <span className="text-muted">·</span>
              <span>{result.sample_count.toLocaleString()} readings</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted">
              <Clock className="h-3 w-3" />
              {result.created_at ? new Date(result.created_at).toLocaleString("en-IN") : ""}
            </div>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="rounded-xl border border-warning/30 bg-orange-50 px-4 py-3">
              <p className="text-xs font-semibold text-warning mb-2">Warnings</p>
              {result.warnings.map((w, i) => (
                <p key={i} className="text-xs text-warning flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" /> {w}
                </p>
              ))}
            </div>
          )}

          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <MetricCard title="Total Energy" metric={m.energy_kwh} highlight />
            <MetricCard title="Specific Yield" metric={m.specific_yield} highlight />
            <MetricCard title="Performance Ratio" metric={m.performance_ratio} />
            <MetricCard title="Peak Power" metric={m.peak_power_kw} />
            <MetricCard title="Irradiation" metric={m.irradiation} />
            <MetricCard title="Data Coverage" metric={m.data_coverage} />
            <MetricCard title="Avg Ambient Temp" metric={m.avg_ambient_temp_c} />
            <MetricCard title="Avg Module Temp" metric={m.avg_module_temp_c} />
          </div>

          {/* Methodology note */}
          <div className="rounded-xl bg-canvas border border-border px-4 py-3 text-xs text-muted">
            <strong className="text-app-text">Methodology:</strong> All metrics calculated using
            SolarScope formula version <strong>{result.formula_version}</strong>.
            {m.performance_ratio?.method === "performance_ratio_indicative" && (
              " Performance Ratio is labelled indicative — irradiance sensor plane not confirmed as POA."
            )}
            {" "}Export this run via Reports to get a PDF with full formula disclosure.
          </div>
        </div>
      )}
    </div>
  );
}
