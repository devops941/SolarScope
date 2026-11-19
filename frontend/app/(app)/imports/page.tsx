"use client";

import { useState } from "react";
import Link from "next/link";
import { Upload, Download, FileText, RefreshCw, RotateCcw } from "lucide-react";
import StatusBadge, { importStatusVariant } from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import ImportProgress from "@/features/imports/ImportProgress";
import RollbackDialog from "@/features/imports/RollbackDialog";
import { useImportsList } from "@/features/imports/useImports";

function CountBadge({ n, variant }: { n: number; variant: "success" | "danger" | "muted" }) {
  if (n === 0) return <span className="text-muted">—</span>;
  const colors = { success: "text-solar-green font-semibold", danger: "text-danger font-semibold", muted: "text-muted" };
  return <span className={colors[variant]}>{n.toLocaleString()}</span>;
}

export default function ImportsPage() {
  const { data, isLoading, refetch } = useImportsList();
  const imports = data?.items ?? [];
  const [rollbackTarget, setRollbackTarget] = useState<any | null>(null);
  const [progressImportId, setProgressImportId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <div className="h-8 w-32 bg-canvas rounded animate-pulse mb-5" />
        <SkeletonTable rows={4} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-app-text">Telemetry Ingestion & Imports</h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-muted">
              {data?.total ?? 0} batch{data?.total !== 1 ? "es" : ""}
            </span>
          </div>
          <p className="text-sm text-muted mt-0.5">
            Upload CSV telemetry logs, normalize timezones, and validate solar sensor health.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => refetch()}
            title="Refresh history"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted hover:bg-canvas transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <a
            href="/api/v1/imports/template"
            download
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-muted hover:bg-canvas transition"
          >
            <Download className="h-3.5 w-3.5" /> Blank Template
          </a>

          <Link
            href="/imports/new"
            className="flex items-center gap-1.5 rounded-lg bg-primary-teal px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-deep-teal transition"
          >
            <Upload className="h-4 w-4" /> Upload CSV
          </Link>
        </div>
      </div>

      {/* Empty State vs Table */}
      {imports.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-pale-mint mb-4">
            <Upload className="h-8 w-8 text-primary-teal" />
          </div>
          <h3 className="text-lg font-semibold text-app-text mb-1">No Telemetry Ingested Yet</h3>
          <p className="text-sm text-muted max-w-md mx-auto mb-6">
            Upload inverter CSV telemetry logs to analyze solar performance and sensor metrics.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/imports/new"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-primary-teal px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-deep-teal transition"
            >
              <Upload className="h-4 w-4" /> Upload Custom CSV
            </Link>

            <a
              href="/api/v1/imports/template"
              download
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-app-text hover:bg-canvas transition"
            >
              <Download className="h-4 w-4 text-muted" /> Download Blank Template
            </a>
          </div>

          {/* Quick Specification Box */}
          <div className="mt-8 pt-6 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-4 text-left max-w-2xl mx-auto text-xs">
            <div>
              <p className="font-semibold text-app-text">Timestamp</p>
              <p className="text-muted">ISO 8601 or local format</p>
            </div>
            <div>
              <p className="font-semibold text-app-text">Power (kW)</p>
              <p className="text-muted">Instantaneous AC Power</p>
            </div>
            <div>
              <p className="font-semibold text-app-text">Irradiance (W/m²)</p>
              <p className="text-muted">Global Horizontal / POA</p>
            </div>
            <div>
              <p className="font-semibold text-app-text">Module Temp (°C)</p>
              <p className="text-muted">Surface thermocouple</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-surface border border-border overflow-hidden shadow-xs">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-canvas/70">
                <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">File Name</th>
                <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider hidden md:table-cell">Accepted</th>
                <th className="text-right px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider hidden md:table-cell">Rejected</th>
                <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider hidden lg:table-cell">Uploaded by</th>
                <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs uppercase tracking-wider hidden lg:table-cell">Date</th>
                <th className="px-5 py-3.5 text-right font-semibold text-muted text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {imports.map((imp: any) => (
                <tr key={imp.id} className="hover:bg-canvas/40 transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pale-mint text-primary-teal shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <span className="font-semibold text-app-text truncate max-w-[220px]">{imp.filename}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge
                      label={imp.status.replace(/_/g, " ")}
                      variant={importStatusVariant(imp.status)}
                      dot
                    />
                  </td>
                  <td className="px-5 py-4 text-right hidden md:table-cell">
                    <CountBadge n={imp.counts?.accepted ?? 0} variant="success" />
                  </td>
                  <td className="px-5 py-4 text-right hidden md:table-cell">
                    <CountBadge n={imp.counts?.rejected ?? 0} variant="danger" />
                  </td>
                  <td className="px-5 py-4 text-muted hidden lg:table-cell">{imp.actor}</td>
                  <td className="px-5 py-4 text-muted text-xs hidden lg:table-cell">
                    {imp.created_at ? new Date(imp.created_at).toLocaleString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                    }) : "—"}
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    {(imp.counts?.rejected ?? 0) > 0 && (
                      <a
                        href={`/api/v1/imports/${imp.id}/errors.csv`}
                        download
                        className="text-xs font-semibold text-danger mr-3 hover:underline"
                      >
                        Errors CSV
                      </a>
                    )}
                    {["queued", "processing"].includes(imp.status) && (
                      <button
                        onClick={() => setProgressImportId(imp.id)}
                        className="text-xs font-semibold text-primary-teal mr-3 hover:underline"
                      >
                        Track Progress
                      </button>
                    )}
                    <button
                      onClick={() => setRollbackTarget(imp)}
                      className="text-xs text-muted hover:text-danger hover:underline inline-flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" /> Rollback
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialogs */}
      {progressImportId && (
        <ImportProgress
          importId={progressImportId}
          onDone={() => { setProgressImportId(null); refetch(); }}
        />
      )}
      {rollbackTarget && (
        <RollbackDialog
          importId={rollbackTarget.id}
          filename={rollbackTarget.filename}
          acceptedCount={rollbackTarget.counts?.accepted ?? 0}
          onClose={() => setRollbackTarget(null)}
          onRolledBack={() => { setRollbackTarget(null); refetch(); }}
        />
      )}
    </div>
  );
}
