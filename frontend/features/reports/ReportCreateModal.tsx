"use client";

import { useState, useEffect } from "react";
import {
  X,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useSites } from "@/features/sites/useSites";
import { useSystemsBySite } from "@/features/systems/useSystems";
import { useCreateAnalysisRun } from "@/features/analytics/useAnalytics";
import { useCreateReport } from "@/features/reports/useReports";
import { cn } from "@/lib/utils";

interface ReportCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialFormat?: "pdf" | "metrics_csv" | "readings_csv";
}

const TEMPLATES = [
  {
    format: "pdf",
    label: "Executive Performance Audit",
    ext: "PDF",
    badgeColor: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800",
    icon: FileText,
    iconColor: "text-red-500",
    desc: "Publication-ready IEC 61724 audit report with PR index, specific yield, thermal derating, and carbon offset summary.",
  },
  {
    format: "metrics_csv",
    label: "Analysis Metrics Summary",
    ext: "CSV",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    icon: FileSpreadsheet,
    iconColor: "text-emerald-500",
    desc: "Tabular summary of all calculated KPIs, formula version numbers, methods, sample counts, and coverage %.",
  },
  {
    format: "readings_csv",
    label: "High-Resolution Readings Stream",
    ext: "CSV",
    badgeColor: "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    icon: Layers,
    iconColor: "text-teal-500",
    desc: "Complete 15-minute sensor intervals (AC power, irradiance, module & ambient temps, voltage, and quality flags).",
  },
];

export default function ReportCreateModal({
  open,
  onClose,
  onSuccess,
  initialFormat = "pdf",
}: ReportCreateModalProps) {
  const [siteId, setSiteId] = useState("");
  const [systemId, setSystemId] = useState("");
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-07");
  const [format, setFormat] = useState<string>(initialFormat);
  const [customTitle, setCustomTitle] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: sitesData } = useSites();
  const sites = sitesData?.items ?? [];
  const { data: systems = [] } = useSystemsBySite(siteId);

  const createRun = useCreateAnalysisRun();
  const createReport = useCreateReport();

  // Auto-select site
  useEffect(() => {
    if (!siteId && sites.length > 0) {
      setSiteId(sites[0].id);
    }
  }, [sites, siteId]);

  // Auto-select system
  useEffect(() => {
    if (siteId && !systemId && systems.length > 0) {
      setSystemId(systems[0].id);
    }
  }, [systems, siteId, systemId]);

  useEffect(() => {
    if (initialFormat) {
      setFormat(initialFormat);
    }
  }, [initialFormat]);

  if (!open) return null;

  const isPending = createRun.isPending || createReport.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!systemId) {
      setErrorMsg("Please select a solar system array to generate the report.");
      return;
    }

    try {
      // Step 1: Run and persist analysis run snapshot
      const run = await createRun.mutateAsync({
        systemId,
        start: `${startDate}T00:00:00Z`,
        end: `${endDate}T23:59:59Z`,
      });

      // Default title if not typed
      const activeTemplate = TEMPLATES.find((t) => t.format === format);
      const generatedTitle =
        customTitle.trim() ||
        `${activeTemplate?.label || "Report"} — ${startDate} to ${endDate}`;

      // Step 2: Queue report generation
      await createReport.mutateAsync({
        analysisRunId: run.id,
        format,
        title: generatedTitle,
      });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setErrorMsg(e?.response?.data?.detail || e?.message || "Failed to generate report.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4.5 bg-canvas/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-solar-green/15 text-primary-teal">
              <Sparkles className="h-5 w-5 text-solar-green" />
            </div>
            <div>
              <h2 className="text-base font-bold text-app-text">Generate Compliance Report</h2>
              <p className="text-xs text-muted">
                Audit-proof IEC 61724 performance export with verified calculations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-app-text transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Report Format Selection Cards */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2.5">
              Select Report Format
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {TEMPLATES.map((tmpl) => {
                const isSelected = format === tmpl.format;
                const Icon = tmpl.icon;
                return (
                  <div
                    key={tmpl.format}
                    onClick={() => setFormat(tmpl.format)}
                    className={cn(
                      "flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer",
                      isSelected
                        ? "border-primary-teal bg-pale-mint/50 shadow-xs"
                        : "border-border bg-surface hover:bg-canvas"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        isSelected ? "bg-white shadow-xs" : "bg-canvas"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", tmpl.iconColor)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-app-text">{tmpl.label}</span>
                        <span className={cn("rounded-md px-1.5 py-0.2 text-[10px] font-bold border", tmpl.badgeColor)}>
                          {tmpl.ext}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">{tmpl.desc}</p>
                    </div>

                    <div className="shrink-0 mt-1">
                      <div
                        className={cn(
                          "h-4 w-4 rounded-full border flex items-center justify-center",
                          isSelected
                            ? "border-primary-teal bg-primary-teal text-white"
                            : "border-muted/40"
                        )}
                      >
                        {isSelected && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Plant & Array System Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Solar Site</label>
              <select
                value={siteId}
                onChange={(e) => {
                  setSiteId(e.target.value);
                  setSystemId("");
                }}
                className="w-full rounded-xl border border-border px-3.5 py-2 text-sm text-app-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary-teal/20 focus:border-primary-teal"
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
              <label className="block text-xs font-semibold text-muted mb-1.5">Inverter System Array</label>
              <select
                value={systemId}
                onChange={(e) => setSystemId(e.target.value)}
                disabled={!siteId}
                className="w-full rounded-xl border border-border px-3.5 py-2 text-sm text-app-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary-teal/20 focus:border-primary-teal disabled:opacity-50"
              >
                <option value="">Select system…</option>
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.dc_capacity_kwp} kWp)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range Selection & Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-muted flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted" /> Audit Period
              </label>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setStartDate("2026-11-01");
                    setEndDate("2026-11-07");
                  }}
                  className="rounded-md border border-border bg-surface px-2 py-0.5 font-medium text-muted hover:text-app-text hover:bg-canvas"
                >
                  Nov 1 – Nov 7 (Demo CSV)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStartDate("2026-11-01");
                    setEndDate("2026-11-30");
                  }}
                  className="rounded-md border border-border bg-surface px-2 py-0.5 font-medium text-muted hover:text-app-text hover:bg-canvas"
                >
                  Nov 2026
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStartDate("2026-10-01");
                    setEndDate("2026-11-30");
                  }}
                  className="rounded-md border border-border bg-surface px-2 py-0.5 font-medium text-muted hover:text-app-text hover:bg-canvas"
                >
                  All Data
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[11px] text-muted mb-1">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-border px-3.5 py-2 text-sm text-app-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary-teal/20 focus:border-primary-teal"
                />
              </div>
              <div>
                <span className="block text-[11px] text-muted mb-1">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-border px-3.5 py-2 text-sm text-app-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary-teal/20 focus:border-primary-teal"
                />
              </div>
            </div>
          </div>

          {/* Optional Title */}
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Custom Report Title <span className="text-muted/60 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Monthly Performance Certification — November 2026"
              className="w-full rounded-xl border border-border px-3.5 py-2 text-sm text-app-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary-teal/20 focus:border-primary-teal"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted hover:bg-canvas transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!systemId || isPending}
              className="flex items-center gap-2 rounded-xl bg-primary-teal px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-deep-teal transition disabled:opacity-50 cursor-pointer"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isPending ? "Generating Export…" : "Generate Report"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
