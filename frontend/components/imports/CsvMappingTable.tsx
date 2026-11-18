"use client";

import { cn } from "@/lib/utils";

const CANONICAL_OPTIONS = [
  { value: "", label: "— skip —" },
  { value: "timestamp", label: "timestamp" },
  { value: "power_kw", label: "power_kw (kW)" },
  { value: "energy_kwh", label: "energy_kwh (kWh/interval)" },
  { value: "irradiance_w_m2", label: "irradiance_w_m2 (W/m²)" },
  { value: "ambient_temp_c", label: "ambient_temp_c (°C)" },
  { value: "module_temp_c", label: "module_temp_c (°C)" },
  { value: "voltage_v", label: "voltage_v (V)" },
  { value: "current_a", label: "current_a (A)" },
  { value: "inverter_status", label: "inverter_status" },
];

interface MappingEntry {
  source_column: string;
  canonical_column: string;
}

interface CsvMappingTableProps {
  mapping: MappingEntry[];
  columnTypes: Record<string, string>;
  onChange: (mapping: MappingEntry[]) => void;
}

const TYPE_BADGE: Record<string, string> = {
  timestamp: "bg-sky-50 text-sky-700",
  number: "bg-pale-mint text-primary-teal",
  text: "bg-canvas text-muted",
  empty: "bg-orange-50 text-warning",
};

export default function CsvMappingTable({ mapping, columnTypes, onChange }: CsvMappingTableProps) {
  function updateMapping(index: number, canonical: string) {
    const updated = mapping.map((m, i) =>
      i === index ? { ...m, canonical_column: canonical } : m
    );
    onChange(updated);
  }

  const hasTimestamp = mapping.some((m) => m.canonical_column === "timestamp");
  const hasMeasurement = mapping.some(
    (m) => m.canonical_column === "power_kw" || m.canonical_column === "energy_kwh"
  );

  return (
    <div className="space-y-3">
      {(!hasTimestamp || !hasMeasurement) && (
        <div className="rounded-lg border border-warning/30 bg-orange-50 px-4 py-3 text-sm text-warning">
          {!hasTimestamp && <div>⚠ Map the <strong>timestamp</strong> column to continue.</div>}
          {!hasMeasurement && <div>⚠ Map at least one of <strong>power_kw</strong> or <strong>energy_kwh</strong>.</div>}
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-canvas">
              <th className="text-left px-4 py-2.5 font-medium text-muted">Your column</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted">Detected type</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted">Maps to</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mapping.map((entry, i) => {
              const colType = columnTypes[entry.source_column] ?? "text";
              const isRequired =
                entry.canonical_column === "timestamp" ||
                entry.canonical_column === "power_kw" ||
                entry.canonical_column === "energy_kwh";
              return (
                <tr key={entry.source_column} className="hover:bg-canvas/50">
                  <td className="px-4 py-2.5">
                    <span className={cn("font-mono text-xs font-medium", isRequired ? "text-app-text" : "text-muted")}>
                      {entry.source_column}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", TYPE_BADGE[colType])}>
                      {colType}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={entry.canonical_column}
                      onChange={(e) => updateMapping(i, e.target.value)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 text-xs text-app-text focus:outline-none focus:ring-1 focus:ring-primary-teal",
                        entry.canonical_column ? "border-solar-green/40 bg-pale-mint" : "border-border bg-surface"
                      )}
                    >
                      {CANONICAL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
