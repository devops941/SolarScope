"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import StatusBadge, { importStatusVariant } from "@/components/ui/StatusBadge";
import { CheckCircle, XCircle, Loader2, AlertTriangle, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const TERMINAL_STATUSES = new Set([
  "completed", "completed_with_warnings", "failed", "rolled_back",
]);

interface ImportProgressProps {
  importId: string;
  onDone?: (status: string) => void;
}

export default function ImportProgress({ importId, onDone }: ImportProgressProps) {
  const [imp, setImp] = useState<any>(null);
  const [polling, setPolling] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    if (!importId) return;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const { data } = await apiClient.get(`/imports/${importId}`);
        setImp(data);
        if (TERMINAL_STATUSES.has(data.status)) {
          setPolling(false);
          qc.invalidateQueries({ queryKey: ["imports"] });
          onDone?.(data.status);
        } else {
          timer = setTimeout(poll, 1500);
        }
      } catch {
        timer = setTimeout(poll, 3000);
      }
    }

    poll();
    return () => clearTimeout(timer);
  }, [importId]);

  if (!imp) {
    return (
      <div className="flex items-center gap-3 py-4">
        <Loader2 className="h-5 w-5 text-primary-teal animate-spin" />
        <span className="text-sm text-muted">Loading import status…</span>
      </div>
    );
  }

  const counts = imp.counts ?? {};
  const total = counts.total ?? 0;
  const accepted = counts.accepted ?? 0;
  const rejected = counts.rejected ?? 0;
  const skipped = counts.skipped ?? 0;
  const flagged = counts.flagged ?? 0;
  const processed = accepted + rejected + skipped + flagged;
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

  const isProcessing = ["queued", "processing"].includes(imp.status);
  const isDone = TERMINAL_STATUSES.has(imp.status);

  return (
    <div className="rounded-xl bg-surface border border-border p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-app-text">{imp.filename}</p>
          <p className="text-xs text-muted mt-0.5 font-mono">{imp.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {isProcessing && <Loader2 className="h-4 w-4 text-primary-teal animate-spin" />}
          {imp.status === "completed" && <CheckCircle className="h-5 w-5 text-solar-green" />}
          {imp.status === "completed_with_warnings" && <AlertTriangle className="h-5 w-5 text-warning" />}
          {imp.status === "failed" && <XCircle className="h-5 w-5 text-danger" />}
          <StatusBadge
            label={imp.status.replace(/_/g, " ")}
            variant={importStatusVariant(imp.status)}
            dot
          />
        </div>
      </div>

      {/* Progress bar */}
      {(isProcessing || isDone) && total > 0 && (
        <div>
          <div className="flex justify-between text-xs text-muted mb-1.5">
            <span>{isProcessing ? "Processing…" : "Complete"}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-canvas overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                imp.status === "failed" ? "bg-danger" :
                imp.status === "completed_with_warnings" ? "bg-warning" :
                "bg-solar-green"
              )}
              style={{ width: `${isDone ? 100 : pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Count grid */}
      {total > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Accepted", value: accepted, color: "text-solar-green" },
            { label: "Rejected", value: rejected, color: "text-danger" },
            { label: "Skipped", value: skipped, color: "text-muted" },
            { label: "Flagged", value: flagged, color: "text-warning" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg bg-canvas px-3 py-2 text-center">
              <p className={cn("text-lg font-bold", color)}>{value.toLocaleString()}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Error CSV download */}
      {rejected > 0 && isDone && (
        <a
          href={`/api/v1/imports/${importId}/errors.csv`}
          download
          className="flex items-center gap-2 rounded-lg border border-danger/30 bg-red-50 px-4 py-2.5 text-sm text-danger hover:bg-red-100 transition-colors"
        >
          <Download className="h-4 w-4" />
          Download rejected rows CSV ({rejected.toLocaleString()} rows)
        </a>
      )}
    </div>
  );
}
