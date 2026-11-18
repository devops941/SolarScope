"use client";

import { useState } from "react";
import { FileText, Download, RefreshCw, Plus, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useSites } from "@/features/sites/useSites";
import { useSystemsBySite } from "@/features/systems/useSystems";
import { useAnalysisRuns, useCreateAnalysisRun } from "@/features/analytics/useAnalytics";
import { useReports, useCreateReport, getDownloadUrl, type Report } from "@/features/reports/useReports";
import { cn } from "@/lib/utils";

const FORMAT_OPTIONS = [
  { value: "pdf",          label: "PDF Performance Report",   ext: "PDF",  desc: "Full report with KPIs, methodology, and system profile" },
  { value: "metrics_csv",  label: "Analysis Metrics CSV",     ext: "CSV",  desc: "All metric values with units, methods, and coverage" },
  { value: "readings_csv", label: "Filtered Readings CSV",    ext: "CSV",  desc: "Raw readings for the analysis period with quality flags" },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "ready") return <CheckCircle className="h-4 w-4 text-solar-green" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-danger" />;
  if (status === "generating" || status === "queued")
    return <Loader2 className="h-4 w-4 text-primary-teal animate-spin" />;
  return <Clock className="h-4 w-4 text-muted" />;
}

function reportStatusVariant(status: string) {
  return status === "ready" ? "success" : status === "failed" ? "danger" :
    status === "generating" ? "processing" : "info";
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ReportsPage() {
  const [building, setBuilding] = useState(false);
  const [siteId, setSiteId] = useState("");
  const [systemId, setSystemId] = useState("");
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2026-11-18");
  const [format, setFormat] = useState("pdf");
  const [runError, setRunError] = useState("");

  const { data: sitesData } = useSites();
  const { data: systems = [] } = useSystemsBySite(siteId);
  const sites = sitesData?.items ?? [];

  const createRun = useCreateAnalysisRun();
  const createReport = useCreateReport();
  const { data: reportsData, isLoading, refetch } = useReports();
  const reports = reportsData?.items ?? [];

  async function handleGenerate() {
    setRunError("");
    if (!systemId) { setRunError("Select a system first."); return; }
    try {
      const run = await createRun.mutateAsync({
        systemId,
        start: `${startDate}T00:00:00Z`,
        end: `${endDate}T23:59:59Z`,
      });
      await createReport.mutateAsync({
        analysisRunId: run.id,
        format,
        title: `${FORMAT_OPTIONS.find(f => f.value === format)?.label} — ${startDate} to ${endDate}`,
      });
      setBuilding(false);
      refetch();
    } catch (err: any) {
      setRunError(err.message ?? "Failed to generate report.");
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-[1000px] mx-auto">
        <div className="h-8 w-32 bg-canvas rounded animate-pulse mb-5" />
        <SkeletonTable rows={3} />
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-app-text">Reports</h1>
          <p className="text-sm text-muted mt-0.5">
            PDF performance reports and CSV exports — values always match the saved analysis run
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:bg-canvas">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setBuilding(!building)}
            className="flex items-center gap-1.5 rounded-lg bg-primary-teal px-3.5 py-2 text-sm font-medium text-white hover:bg-deep-teal">
            <Plus className="h-4 w-4" /> New Report
          </button>
        </div>
      </div>

      {/* Report builder */}
      {building && (
        <div className="rounded-xl bg-surface border border-border p-5 space-y-5">
          <h2 className="text-sm font-semibold text-app-text">Configure Report</h2>

          {runError && (
            <div className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
              {runError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Site</label>
              <select value={siteId} onChange={(e) => { setSiteId(e.target.value); setSystemId(""); }}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-app-text focus:outline-none focus:ring-1 focus:ring-primary-teal">
                <option value="">Select site…</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">System</label>
              <select value={systemId} onChange={(e) => setSystemId(e.target.value)} disabled={!siteId}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-app-text focus:outline-none focus:ring-1 focus:ring-primary-teal disabled:opacity-50">
                <option value="">Select system…</option>
                {systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">From</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-teal" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">To</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-teal" />
            </div>
          </div>

          {/* Format selector */}
          <div>
            <label className="block text-xs font-medium text-muted mb-2">Report Format</label>
            <div className="space-y-2">
              {FORMAT_OPTIONS.map(opt => (
                <label key={opt.value} className={cn(
                  "flex items-start gap-3 cursor-pointer rounded-xl border p-3",
                  format === opt.value ? "border-primary-teal bg-pale-mint" : "border-border hover:bg-canvas"
                )}>
                  <input type="radio" name="format" value={opt.value}
                    checked={format === opt.value}
                    onChange={() => setFormat(opt.value)} className="mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-app-text">{opt.label}</span>
                      <span className={cn(
                        "rounded px-1.5 py-0.5 text-xs font-bold",
                        opt.ext === "PDF" ? "bg-red-100 text-danger" : "bg-pale-mint text-primary-teal"
                      )}>{opt.ext}</span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={!systemId || createRun.isPending || createReport.isPending}
              className="flex items-center gap-2 rounded-lg bg-primary-teal px-4 py-2 text-sm font-medium text-white hover:bg-deep-teal disabled:opacity-60"
            >
              {(createRun.isPending || createReport.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {createRun.isPending ? "Running analysis…" : createReport.isPending ? "Creating report…" : "Generate Report"}
            </button>
            <button onClick={() => { setBuilding(false); setRunError(""); }}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-canvas">
              Cancel
            </button>
          </div>

          <p className="text-xs text-muted">
            A new analysis run will be created for the selected period. The report values will
            always match the saved run — they are never recalculated during export.
          </p>
        </div>
      )}

      {/* Report history */}
      {reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description="Generate a PDF or CSV report from an analysis run."
          action={
            <button onClick={() => setBuilding(true)}
              className="rounded-lg bg-primary-teal px-4 py-2 text-sm font-medium text-white hover:bg-deep-teal">
              New Report
            </button>
          }
        />
      ) : (
        <div className="rounded-xl bg-surface border border-border overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold text-app-text">Report History ({reportsData?.total ?? 0})</h2>
          </div>
          <div className="divide-y divide-border">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center gap-4 px-5 py-4">
                <FileText className={cn(
                  "h-8 w-8 shrink-0",
                  report.format === "pdf" ? "text-danger" : "text-solar-green"
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-app-text truncate">{report.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted uppercase">{report.format.replace("_", " ")}</span>
                    {report.file_size_bytes && (
                      <><span className="text-muted">·</span>
                      <span className="text-xs text-muted">{formatFileSize(report.file_size_bytes)}</span></>
                    )}
                    {report.created_at && (
                      <><span className="text-muted">·</span>
                      <span className="text-xs text-muted">
                        {new Date(report.created_at).toLocaleString("en-IN", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span></>
                    )}
                  </div>
                </div>
                <StatusIcon status={report.status} />
                <StatusBadge label={report.status} variant={reportStatusVariant(report.status)} />
                {report.status === "ready" && (
                  <a
                    href={getDownloadUrl(report.id)}
                    download
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-canvas"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                )}
                {report.status === "failed" && (
                  <span className="text-xs text-danger" title={report.error_message}>Failed</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted">
        All report values come from saved analysis runs and are never recalculated.
        Regenerate a report from the same run to get identical values.
      </p>
    </div>
  );
}
