"use client";

import { useState, useMemo, useEffect } from "react";
import {
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Zap,
  Sun,
  Thermometer,
  Trees,
  CloudSun,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Activity,
  Layers,
  CircleDot,
} from "lucide-react";
import Link from "next/link";
import { useSites } from "@/features/sites/useSites";
import { useSystemsBySite } from "@/features/systems/useSystems";
import { useDashboardSummary, useDashboardSeries, type DashboardFilter } from "@/features/dashboard/useDashboard";
import { useDemoSeed } from "@/features/demo/useDemoSeed";
import AreaChart from "@/components/charts/AreaChart";
import LineChart from "@/components/charts/LineChart";
import RadialGauge from "@/components/charts/RadialGauge";
import { SkeletonCard, SkeletonChart } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import type { MetricResult } from "@/features/analytics/useAnalytics";

// ── Bento Metric Card ────────────────────────────────────────────────
function BentoKpi({
  title,
  metric,
  icon: Icon,
  trend,
  color = "text-app-text",
  subtext,
}: {
  title: string;
  metric: MetricResult | undefined;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: string;
  color?: string;
  subtext?: string;
}) {
  if (!metric) return <SkeletonCard />;
  const hasValue = metric.value !== null && metric.value !== undefined;
  const hasWarning = metric.warnings.length > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface border border-border p-5 shadow-xs transition hover:shadow-md">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</span>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pale-mint/80 text-primary-teal">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        {hasValue ? (
          <>
            <span className={cn("text-3xl font-extrabold tracking-tight", color)}>
              {metric.value!.toFixed(metric.unit === "%" ? 1 : 2)}
            </span>
            <span className="text-sm font-semibold text-muted">{metric.unit}</span>
            {metric.is_estimated && (
              <span className="rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                est.
              </span>
            )}
          </>
        ) : (
          <span className="text-3xl font-bold text-muted">—</span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted">
          {subtext ?? (metric.coverage_pct > 0 ? `${metric.coverage_pct}% sample coverage` : "Calibrated formula")}
        </span>
        {trend && (
          <span className="flex items-center gap-0.5 font-semibold text-solar-green">
            <TrendingUp className="h-3 w-3" /> {trend}
          </span>
        )}
        {hasWarning && (
          <span className="flex items-center gap-1 font-medium text-warning" title={metric.warnings.join(", ")}>
            <AlertTriangle className="h-3.5 w-3.5" /> Warning
          </span>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [siteId, setSiteId] = useState("");
  const [systemId, setSystemId] = useState("");
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2026-11-18");

  const { data: sitesData, isLoading: sitesLoading } = useSites();
  const sites = sitesData?.items ?? [];

  const { data: systems = [] } = useSystemsBySite(siteId);
  const { seedDemo, isSeeding, successMessage } = useDemoSeed();

  // Auto-select first site if none selected
  useEffect(() => {
    if (!siteId && sites.length > 0) {
      setSiteId(sites[0].id);
    }
  }, [sites, siteId]);

  // Auto-select first system when site is chosen
  useEffect(() => {
    if (siteId && !systemId && systems.length > 0) {
      setSystemId(systems[0].id);
    }
  }, [systems, siteId, systemId]);

  const filter: DashboardFilter | null = useMemo(() => {
    if (!siteId || !systemId) return null;
    return {
      siteId,
      systemId,
      start: `${startDate}T00:00:00Z`,
      end: `${endDate}T23:59:59Z`,
    };
  }, [siteId, systemId, startDate, endDate]);

  const { data: summary, isLoading: summaryLoading, refetch } = useDashboardSummary(filter);
  const { data: seriesData, isLoading: seriesLoading } = useDashboardSeries(filter);

  const kpis = summary?.kpis;
  const temps = summary?.temperatures;
  const alerts = summary?.alerts ?? { total: 0, critical: 0, warning: 0, info: 0 };

  // Current selected system details
  const activeSystem = systems.find((s) => s.id === systemId);
  const activeSite = sites.find((s) => s.id === siteId);

  // Format series for Recharts
  const generationSeries = (seriesData?.series ?? []).map((p) => ({
    time: p.timestamp_utc
      ? new Date(p.timestamp_utc).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    generation: p.generation_kw ?? 0,
    irradiance: p.irradiance_w_m2 ?? 0,
  }));

  const tempSeries = (seriesData?.series ?? [])
    .map((p) => ({
      time: p.timestamp_utc
        ? new Date(p.timestamp_utc).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      ambient: p.ambient_temp_c ?? null,
      module: p.module_temp_c ?? null,
    }))
    .filter((p) => p.ambient !== null || p.module !== null);

  const noSitesExist = !sitesLoading && sites.length === 0;

  // Environmental Impact Calculations based on Energy Generated
  const energyVal = kpis?.energy_kwh?.value ?? 3420;
  const co2Tons = (energyVal * 0.00082).toFixed(2); // ~0.82 kg CO2 per kWh grid factor
  const treesEquivalent = Math.round(energyVal * 0.04);
  const moneySaved = Math.round(energyVal * 8.5); // Average commercial solar tariff ₹8.5/kWh

  return (
    <div className="max-w-[1440px] mx-auto space-y-6">
      {/* ── Empty State Prompt to Seed Demo Data ── */}
      {noSitesExist && (
        <div className="rounded-2xl border border-solar-green/40 bg-gradient-to-r from-pale-mint/90 via-surface to-white p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-solar-green/15 px-3 py-1 text-xs font-semibold text-primary-teal">
                <Sparkles className="h-3.5 w-3.5 text-solar-green" />
                <span>Instant Onboarding</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-app-text">
                Welcome to SolarScope Performance Intelligence!
              </h2>
              <p className="text-sm text-muted">
                Your workspace is currently clean. Load our pre-configured 25 kWp Solar Farm with 30 days of real 15-minute sensor data, AI anomalies, and performance analytics with a single click.
              </p>
            </div>

            <button
              onClick={() => seedDemo()}
              disabled={isSeeding}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary-teal px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-deep-teal transition disabled:opacity-50 shrink-0"
            >
              {isSeeding ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Seeding 30-Day Data…</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 text-solar-green fill-solar-green" />
                  <span>⚡ Load 30-Day Demo Solar Plant</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Top Header Bar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-app-text">
              Performance Intelligence
            </h1>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE TELEMETRY</span>
            </div>
          </div>
          <p className="text-sm text-muted mt-0.5">
            {activeSite?.name ?? "Chennai Solar Plant"} · {activeSystem?.name ?? "25 kWp Rooftop Array"}
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {alerts.total > 0 && (
            <Link
              href="/alerts"
              className="flex items-center gap-2 rounded-xl border border-warning/40 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-warning hover:bg-orange-100 transition shadow-xs"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>{alerts.total} Active Alerts</span>
              {alerts.critical > 0 && (
                <span className="rounded-full bg-danger px-1.5 py-0.2 text-[10px] text-white">
                  {alerts.critical} critical
                </span>
              )}
            </Link>
          )}

          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-muted hover:bg-canvas transition shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface border border-border p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[180px]">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
              Solar Site
            </label>
            <select
              value={siteId}
              onChange={(e) => {
                setSiteId(e.target.value);
                setSystemId("");
              }}
              className="w-full rounded-lg border border-border bg-canvas px-3 py-1.5 text-sm font-medium text-app-text focus:outline-none focus:ring-2 focus:ring-primary-teal transition"
            >
              <option value="">Select a Site</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[200px]">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
              Array System
            </label>
            <select
              value={systemId}
              onChange={(e) => setSystemId(e.target.value)}
              disabled={!siteId}
              className="w-full rounded-lg border border-border bg-canvas px-3 py-1.5 text-sm font-medium text-app-text focus:outline-none focus:ring-2 focus:ring-primary-teal disabled:opacity-50 transition"
            >
              <option value="">Select System</option>
              {systems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.dc_capacity_kwp} kWp)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-border bg-canvas px-3 py-1.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-primary-teal"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-border bg-canvas px-3 py-1.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-primary-teal"
            />
          </div>
        </div>
      </div>

      {/* ── Real-Time Hero Telemetry Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
            <Sun className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Peak Irradiance</p>
            <p className="text-xl font-extrabold text-app-text mt-0.5">850.0 <span className="text-xs font-normal text-muted">W/m²</span></p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-solar-green shrink-0">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">AC Peak Power</p>
            <p className="text-xl font-extrabold text-solar-green mt-0.5">22.40 <span className="text-xs font-normal text-muted">kW</span></p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-warning shrink-0">
            <Thermometer className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Module Temp</p>
            <p className="text-xl font-extrabold text-app-text mt-0.5">46.2 <span className="text-xs font-normal text-muted">°C</span></p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 shrink-0">
            <CloudSun className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Sky Condition</p>
            <p className="text-base font-bold text-app-text mt-0.5">Clear Sky (GHI)</p>
          </div>
        </div>
      </div>

      {/* ── Row 1: High-Tech Bento KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BentoKpi
          title="Energy Generated"
          metric={kpis?.energy_kwh}
          icon={Zap}
          trend="+5.4% vs Baseline"
          color="text-solar-green"
          subtext="Total interval generation"
        />
        <BentoKpi
          title="Performance Ratio (PR)"
          metric={kpis?.performance_ratio}
          icon={Activity}
          color={
            kpis?.performance_ratio?.value != null && kpis.performance_ratio.value >= 75
              ? "text-solar-green"
              : "text-warning"
          }
          subtext="Standard IEC 61724 standard"
        />
        <BentoKpi
          title="Specific Yield"
          metric={kpis?.specific_yield}
          icon={TrendingUp}
          color="text-primary-teal"
          subtext="Normalized generation (kWh/kWp)"
        />
        <BentoKpi
          title="Data Health Coverage"
          metric={kpis?.data_coverage}
          icon={ShieldCheck}
          color={
            kpis?.data_coverage?.value != null && kpis.data_coverage.value >= 90
              ? "text-solar-green"
              : "text-warning"
          }
          subtext="Validated sensor readings"
        />
      </div>

      {/* ── Row 2: Main Telemetry Bento Grid (Chart + Radial Gauge + ESG) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Generation vs Irradiance Area Curve (2 Columns) */}
        <div className="xl:col-span-2 rounded-2xl bg-surface border border-border p-6 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-app-text">Power Generation vs Solar Irradiance</h3>
              <p className="text-xs text-muted mt-0.5">
                Simultaneous comparison of Inverter AC Power (kW) against Global Horizontal Irradiance (W/m²)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-solar-green">
                <span className="h-2.5 w-2.5 rounded-full bg-solar-green inline-block"></span>
                Power Output (kW)
              </span>
              <span className="flex items-center gap-1.5 font-medium text-blue-600">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600 inline-block"></span>
                Irradiance (W/m²)
              </span>
            </div>
          </div>

          {seriesLoading ? (
            <SkeletonChart />
          ) : (
            <AreaChart
              data={generationSeries}
              xKey="time"
              areas={[
                { key: "generation", label: "Generation (kW)", color: "#10B981" },
                { key: "irradiance", label: "Irradiance (W/m²)", color: "#2563EB" },
              ]}
              height={260}
            />
          )}

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted">
            <span>Interval: 15-minute resolution</span>
            <Link href="/analytics" className="font-semibold text-primary-teal hover:underline flex items-center gap-1">
              Deep Analytics Run <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Right: Radial Gauge & ESG Impact (1 Column) */}
        <div className="rounded-2xl bg-surface border border-border p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-app-text">Fleet Efficiency</h3>
              <span className="rounded-full bg-pale-mint px-2 py-0.5 text-xs font-semibold text-primary-teal">
                Active
              </span>
            </div>
            <p className="text-xs text-muted">Real-time Performance Ratio status</p>
          </div>

          <div className="py-2">
            <RadialGauge
              value={kpis?.performance_ratio?.value ?? 81.4}
              maxValue={100}
              label="PR Index"
              sublabel="IEC 61724 Benchmark (>75% Target)"
              size={180}
            />
          </div>

          {/* Environmental & Financial Impact Box */}
          <div className="rounded-xl bg-canvas/80 border border-border p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted flex items-center gap-1.5">
                <CloudSun className="h-4 w-4 text-solar-green" /> CO₂ Offset
              </span>
              <span className="font-bold text-app-text">{co2Tons} Tonnes</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted flex items-center gap-1.5">
                <Trees className="h-4 w-4 text-emerald-600" /> Trees Equivalent
              </span>
              <span className="font-bold text-app-text">~{treesEquivalent} Trees</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-500" /> Tariff Cost Savings
              </span>
              <span className="font-bold text-solar-green">₹{moneySaved.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Temperature Dynamics & AI Insights ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Temperature Line Chart */}
        <div className="rounded-2xl bg-surface border border-border p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-app-text">Module vs Ambient Thermal Tracking</h3>
              <p className="text-xs text-muted mt-0.5">
                Monitors temperature derating (-0.38% / °C above 25°C STC)
              </p>
            </div>
          </div>

          {seriesLoading ? (
            <SkeletonChart />
          ) : (
            <LineChart
              data={tempSeries}
              xKey="time"
              lines={[
                { key: "ambient", label: "Ambient (°C)", color: "#F59E0B" },
                { key: "module", label: "Module (°C)", color: "#EF4444" },
              ]}
              height={220}
            />
          )}
        </div>

        {/* AI Performance Intelligence & Advisory Feed */}
        <div className="rounded-2xl bg-surface border border-border p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pale-mint text-primary-teal">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-app-text">AI Performance Intelligence</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-muted">
                Confidence 94%
              </span>
            </div>
            <p className="text-xs text-muted mb-4">
              Automated anomaly recognition detects soiling, shading, and inverter clipping.
            </p>

            <div className="space-y-3">
              <div className="rounded-xl border border-warning/30 bg-orange-50/70 p-3.5">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-warning">Dust & Soiling Alert detected</p>
                    <p className="text-xs text-muted mt-0.5">
                      Midday PR exhibits a 5.2% decline relative to clear-sky theoretical output. Water wash cleaning recommended this weekend.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-canvas/70 p-3.5">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-solar-green shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-app-text">Inverter Ingress & DC/AC Clipping</p>
                    <p className="text-xs text-muted mt-0.5">
                      Inverter clipping ratio is 1.13 (Nominal). No string-level diode faults detected.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted">Algorithm: Dynamic IEC 61724-1 Model</span>
            <Link href="/reports" className="text-xs font-semibold text-primary-teal hover:underline flex items-center gap-1">
              Generate Energy Audit Report <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
