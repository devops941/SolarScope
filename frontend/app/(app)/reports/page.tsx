"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  RefreshCw,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { SkeletonTable } from "@/components/ui/Skeleton";
import {
  useReports,
  downloadReportFile,
  type Report,
} from "@/features/reports/useReports";
import ReportCreateModal from "@/features/reports/ReportCreateModal";
import { cn } from "@/lib/utils";

function StatusIcon({ status }: { status: string }) {
  if (status === "ready") return <CheckCircle2 className="h-4.5 w-4.5 text-solar-green" />;
  if (status === "failed") return <XCircle className="h-4.5 w-4.5 text-danger" />;
  if (status === "generating" || status === "queued")
    return <Loader2 className="h-4.5 w-4.5 text-primary-teal animate-spin" />;
  return <Clock className="h-4.5 w-4.5 text-muted" />;
}

function reportStatusVariant(status: string) {
  return status === "ready"
    ? "success"
    : status === "failed"
    ? "danger"
    : status === "generating"
    ? "processing"
    : "info";
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ReportsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "metrics_csv" | "readings_csv">("pdf");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: reportsData, isLoading, refetch, isFetching } = useReports();
  const reports = reportsData?.items ?? [];

  async function handleDownload(report: Report) {
    const ext = report.format === "pdf" ? "pdf" : "csv";
    const filename = `${report.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_${report.id.slice(-6)}.${ext}`;
    setDownloadingId(report.id);
    try {
      await downloadReportFile(report.id, filename);
    } catch (err) {
      console.error("Failed to download report", err);
      alert("Failed to download report. Please check your network and try again.");
    } finally {
      setDownloadingId(null);
    }
  }

  function openModalWithFormat(fmt: "pdf" | "metrics_csv" | "readings_csv") {
    setSelectedFormat(fmt);
    setModalOpen(true);
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <div className="h-8 w-44 bg-canvas rounded animate-pulse" />
        <SkeletonTable rows={4} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-app-text">
              Reports &amp; Compliance Exports
            </h1>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-muted">
              {reportsData?.total ?? 0} report{reportsData?.total !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-sm text-muted mt-0.5">
            Publication-ready IEC 61724 performance audit PDFs and high-resolution CSV datasets
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            title="Refresh reports list"
            disabled={isFetching}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted hover:bg-canvas transition disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          </button>

          <button
            onClick={() => openModalWithFormat("pdf")}
            className="flex items-center gap-2 rounded-xl bg-primary-teal px-4.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-deep-teal transition cursor-pointer"
          >
            <Plus className="h-4 w-4" /> New Report
          </button>
        </div>
      </div>

      {/* Quick 1-Click Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Template 1: PDF */}
        <div
          onClick={() => openModalWithFormat("pdf")}
          className="group rounded-2xl border border-border bg-surface p-5 hover:border-red-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600">
                <FileText className="h-5 w-5" />
              </div>
              <span className="rounded-md bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 px-2 py-0.5 text-[11px] font-bold border border-red-200">
                PDF
              </span>
            </div>
            <h3 className="text-sm font-bold text-app-text group-hover:text-red-600 transition-colors">
              Executive Performance Audit
            </h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Complete IEC 61724 analysis certificate with PR index, specific yield, and thermal derating summary.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-red-600">
            <span>Configure &amp; Generate</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Template 2: Metrics CSV */}
        <div
          onClick={() => openModalWithFormat("metrics_csv")}
          className="group rounded-2xl border border-border bg-surface p-5 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-bold border border-emerald-200">
                CSV
              </span>
            </div>
            <h3 className="text-sm font-bold text-app-text group-hover:text-emerald-600 transition-colors">
              Analysis Metrics Summary
            </h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Machine-readable audit file with exact formula version numbers, calculated KPIs, and data coverage %.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-emerald-600">
            <span>Configure &amp; Generate</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Template 3: Readings CSV */}
        <div
          onClick={() => openModalWithFormat("readings_csv")}
          className="group rounded-2xl border border-border bg-surface p-5 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/30 text-primary-teal">
                <Layers className="h-5 w-5" />
              </div>
              <span className="rounded-md bg-teal-100 dark:bg-teal-950/50 text-primary-teal px-2 py-0.5 text-[11px] font-bold border border-teal-200">
                CSV
              </span>
            </div>
            <h3 className="text-sm font-bold text-app-text group-hover:text-primary-teal transition-colors">
              High-Resolution Telemetry Stream
            </h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Filtered raw 15-minute inverter intervals with AC power, solar irradiance, temperatures, and quality flags.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-primary-teal">
            <span>Configure &amp; Generate</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Reports History Table */}
      {reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pale-mint text-primary-teal mb-4">
            <FileText className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-app-text">No Reports Generated Yet</h3>
          <p className="text-sm text-muted max-w-md mx-auto mt-1 mb-6">
            Generate your first IEC 61724 audit PDF or high-resolution telemetry CSV export using the templates above.
          </p>
          <button
            onClick={() => openModalWithFormat("pdf")}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-deep-teal transition"
          >
            <Plus className="h-4 w-4" /> Create First Report
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-xs">
          <div className="border-b border-border/80 px-6 py-4 flex items-center justify-between bg-canvas/30">
            <div>
              <h2 className="text-sm font-bold text-app-text">Report Archive &amp; Audit Logs</h2>
              <p className="text-xs text-muted">
                Values are linked to immutable formula snapshots and reproducible at any time
              </p>
            </div>
            <span className="text-xs font-semibold text-muted">
              {reports.length} total entries
            </span>
          </div>

          <div className="divide-y divide-border/60">
            {reports.map((report) => {
              const isPdf = report.format === "pdf";
              const isDownloading = downloadingId === report.id;
              const isReady = report.status === "ready";
              const isGenerating = report.status === "generating" || report.status === "queued";

              return (
                <div
                  key={report.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4.5 hover:bg-canvas/50 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        isPdf
                          ? "bg-red-50 text-red-600 dark:bg-red-950/30"
                          : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"
                      )}
                    >
                      {isPdf ? <FileText className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-app-text truncate">{report.title}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted mt-1">
                        <span className="uppercase font-semibold tracking-wider text-[10px]">
                          {report.format.replace("_", " ")}
                        </span>
                        {report.file_size_bytes && (
                          <>
                            <span>·</span>
                            <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                              {formatFileSize(report.file_size_bytes)}
                            </span>
                          </>
                        )}
                        {report.created_at && (
                          <>
                            <span>·</span>
                            <span>{new Date(report.created_at).toLocaleString("en-IN")}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <StatusIcon status={report.status} />
                    <StatusBadge label={report.status} variant={reportStatusVariant(report.status)} />

                    {isReady && (
                      <button
                        onClick={() => handleDownload(report)}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 rounded-xl border border-border bg-surface hover:bg-pale-mint/60 hover:border-solar-green px-3.5 py-1.5 text-xs font-semibold text-app-text transition shadow-xs cursor-pointer active:scale-[0.98]"
                      >
                        {isDownloading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-teal" />
                        ) : (
                          <Download className="h-3.5 w-3.5 text-primary-teal" />
                        )}
                        <span>{isDownloading ? "Downloading…" : "Download"}</span>
                      </button>
                    )}

                    {isGenerating && (
                      <span className="text-xs text-primary-teal font-medium flex items-center gap-1 animate-pulse">
                        Generating file…
                      </span>
                    )}

                    {report.status === "failed" && (
                      <span
                        className="text-xs text-danger font-medium flex items-center gap-1"
                        title={report.error_message || "Generation error"}
                      >
                        <AlertCircle className="h-3.5 w-3.5" /> Error
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Compliance Note */}
      <div className="rounded-2xl bg-canvas border border-border px-5 py-3.5 text-xs text-muted flex items-center gap-2.5">
        <ShieldCheck className="h-4 w-4 text-solar-green shrink-0" />
        <span>
          All report values are generated from immutable saved analysis runs and are never dynamically altered.
          Regenerating from the same run preserves exact IEC 61724 reproducibility.
        </span>
      </div>

      {/* Report Create Modal */}
      <ReportCreateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialFormat={selectedFormat}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
}
