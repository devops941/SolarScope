import StatusBadge from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";

interface PreviewRow {
  row_number: number;
  timestamp?: string;
  power_kw?: string;
  energy_kwh?: string;
  irradiance_w_m2?: string;
  ambient_temp_c?: string;
  module_temp_c?: string;
  status: "accepted" | "rejected" | "flagged";
  error_message?: string;
}

interface ImportPreviewCounts {
  total_sampled: number;
  accepted: number;
  rejected: number;
  flagged: number;
}

interface ImportPreviewTableProps {
  rows: PreviewRow[];
  counts: ImportPreviewCounts;
}

function cell(v?: string) {
  return v ? (
    <span className="font-mono text-xs">{v}</span>
  ) : (
    <span className="text-muted text-xs">—</span>
  );
}

export default function ImportPreviewTable({ rows, counts }: ImportPreviewTableProps) {
  return (
    <div className="space-y-3">
      {/* Count summary */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-solar-green" />
          <span className="text-muted">Accepted:</span>
          <span className="font-semibold text-solar-green">{counts.accepted}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-danger" />
          <span className="text-muted">Rejected:</span>
          <span className="font-semibold text-danger">{counts.rejected}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-warning" />
          <span className="text-muted">Flagged:</span>
          <span className="font-semibold text-warning">{counts.flagged}</span>
        </div>
        <span className="text-muted ml-auto text-xs">
          Showing {rows.length} of {counts.total_sampled} sampled rows
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-canvas">
              {["Row", "Timestamp", "Power (kW)", "Energy (kWh)", "Irradiance", "Amb Temp", "Mod Temp", "Status"].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 font-medium text-muted whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr
                key={row.row_number}
                className={cn(
                  "hover:bg-canvas/50",
                  row.status === "rejected" && "bg-red-50/50",
                  row.status === "flagged" && "bg-orange-50/30"
                )}
                title={row.error_message ?? undefined}
              >
                <td className="px-3 py-2 text-muted">{row.row_number}</td>
                <td className="px-3 py-2">{cell(row.timestamp)}</td>
                <td className="px-3 py-2">{cell(row.power_kw)}</td>
                <td className="px-3 py-2">{cell(row.energy_kwh)}</td>
                <td className="px-3 py-2">{cell(row.irradiance_w_m2)}</td>
                <td className="px-3 py-2">{cell(row.ambient_temp_c)}</td>
                <td className="px-3 py-2">{cell(row.module_temp_c)}</td>
                <td className="px-3 py-2">
                  <StatusBadge
                    label={row.status}
                    variant={
                      row.status === "accepted" ? "success" :
                      row.status === "rejected" ? "danger" : "warning"
                    }
                    dot
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {counts.rejected > 0 && (
        <p className="text-xs text-muted">
          Hover over rejected rows to see the error reason. After confirming, a rejected-rows CSV will be available to download.
        </p>
      )}
    </div>
  );
}
