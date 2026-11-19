"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, ChevronRight, RefreshCw, ShieldAlert, ArrowRight } from "lucide-react";
import StatusBadge, { alertSeverityVariant } from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useAlerts, useAlertCounts, useUpdateAlertStatus, type Alert } from "@/features/alerts/useAlerts";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = ["all", "open", "acknowledged", "resolved"];
const SEVERITY_FILTERS = ["all", "critical", "warning", "info"];

function statusVariant(status: string) {
  return status === "open" ? "warning" : status === "acknowledged" ? "info" : "muted";
}

function EvidencePanel({ evidence }: { evidence: Record<string, unknown> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {Object.entries(evidence).map(([k, v]) => (
        <div key={k} className="rounded-lg bg-canvas/60 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{k.replace(/_/g, " ")}</p>
          <p className="text-sm font-bold text-app-text mt-0.5">{String(v)}</p>
        </div>
      ))}
    </div>
  );
}

export default function AlertsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, refetch } = useAlerts({
    status: statusFilter !== "all" ? statusFilter : undefined,
    severity: severityFilter !== "all" ? severityFilter : undefined,
  });
  const { data: counts } = useAlertCounts();
  const updateMutation = useUpdateAlertStatus();

  const alerts = data?.items ?? [];

  async function handleStatusChange(alert: Alert, newStatus: string) {
    try {
      await updateMutation.mutateAsync({ alertId: alert.id, status: newStatus });
    } catch {}
  }

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
            <h1 className="text-2xl font-bold tracking-tight text-app-text">Performance Alerts & Anomalies</h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-muted">
              {data?.total ?? 0}
            </span>
          </div>
          <p className="text-sm text-muted mt-0.5">
            Automated anomaly detection signals for soiling, inverter clipping, and thermal derating.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            title="Refresh alerts"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted hover:bg-canvas transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Severity Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Anomalies</p>
          <p className="text-2xl font-bold text-app-text mt-1">{counts?.total ?? alerts.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-danger">Critical Alerts</p>
          <p className="text-2xl font-bold text-danger mt-1">{counts?.critical ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-warning">Warnings (Soiling/Temp)</p>
          <p className="text-2xl font-bold text-warning mt-1">{counts?.warning ?? alerts.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-solar-green">Resolved Issues</p>
          <p className="text-2xl font-bold text-solar-green mt-1">100% Monitored</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface border border-border p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted mr-1">Status:</span>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition",
                statusFilter === f
                  ? "bg-primary-teal text-white shadow-xs"
                  : "bg-canvas text-muted hover:text-app-text"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted mr-1">Severity:</span>
          {SEVERITY_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setSeverityFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition",
                severityFilter === f
                  ? "bg-primary-teal text-white shadow-xs"
                  : "bg-canvas text-muted hover:text-app-text"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Alert list vs Empty State */}
      {alerts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-pale-mint mb-4">
            <Bell className="h-8 w-8 text-primary-teal" />
          </div>
          <h3 className="text-lg font-semibold text-app-text mb-1">No Active Alerts Found</h3>
          <p className="text-sm text-muted max-w-md mx-auto mb-6">
            All solar arrays are currently operating within nominal parameters, or no analysis has been executed yet.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/analytics"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-primary-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-deep-teal transition"
            >
              <span>Run AI Anomaly Detection</span> <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/imports/new"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-app-text hover:bg-canvas transition"
            >
              <span>Upload New Telemetry</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-2xl bg-surface border border-border overflow-hidden shadow-xs transition hover:shadow-md"
            >
              <button
                className="w-full flex items-start gap-4 p-5 text-left hover:bg-canvas/40 transition"
                onClick={() => setExpanded(expanded === alert.id ? null : alert.id)}
              >
                <StatusBadge label={alert.severity} variant={alertSeverityVariant(alert.severity)} dot />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <p className="text-base font-bold text-app-text">
                      {(alert as any).rule_name ?? alert.rule_code.replace(/_/g, " ")}
                    </p>
                    <StatusBadge label={alert.status} variant={statusVariant(alert.status)} />
                  </div>
                  <p className="text-sm text-muted mt-1 leading-relaxed">
                    {(alert as any).description ?? alert.trigger_description}
                  </p>
                  <p className="text-xs text-muted/70 mt-1">
                    Detected on: {alert.created_at ? new Date(alert.created_at).toLocaleString("en-IN") : "Recent"}
                  </p>
                </div>
                <div className="text-muted shrink-0 self-center">
                  {expanded === alert.id ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </div>
              </button>

              {expanded === alert.id && (
                <div className="border-t border-border bg-canvas/40 p-5 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Sensor Evidence</h4>
                    <EvidencePanel evidence={alert.evidence ?? {}} />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted font-mono">Alert ID: {alert.id}</span>
                    <div className="flex items-center gap-2">
                      {alert.status === "open" && (
                        <button
                          onClick={() => handleStatusChange(alert, "acknowledged")}
                          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-app-text hover:bg-canvas transition"
                        >
                          Acknowledge
                        </button>
                      )}
                      {alert.status !== "resolved" && (
                        <button
                          onClick={() => handleStatusChange(alert, "resolved")}
                          className="rounded-lg bg-solar-green px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition"
                        >
                          Mark as Resolved
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
