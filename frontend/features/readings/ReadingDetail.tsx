"use client";

import { X, ExternalLink } from "lucide-react";
import Link from "next/link";
import QualityBadge from "./QualityBadge";
import type { Reading } from "./useReadings";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted shrink-0">{label}</span>
      <span className="text-xs font-medium text-app-text text-right">{value ?? "—"}</span>
    </div>
  );
}

function fmt(v: number | undefined | null, unit: string): string {
  if (v === null || v === undefined) return "—";
  return `${v.toFixed(3)} ${unit}`;
}

interface ReadingDetailProps {
  reading: Reading | null;
  onClose: () => void;
}

export default function ReadingDetail({ reading, onClose }: ReadingDetailProps) {
  if (!reading) return null;

  const tsDisplay = reading.timestamp_utc
    ? new Date(reading.timestamp_utc).toLocaleString("en-IN", {
        timeZone: "UTC", day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      }) + " UTC"
    : "—";

  const isFlagged = reading.quality.some(q => q.startsWith("flagged_"));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-80 bg-surface border-l border-border shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-app-text">Reading Detail</h2>
          <button onClick={onClose} className="text-muted hover:text-app-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Timestamp */}
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">Timestamp</p>
            <p className="font-mono text-xs text-app-text break-all">{tsDisplay}</p>
          </div>

          {/* Quality */}
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">Quality</p>
            <QualityBadge flags={reading.quality} />
            {isFlagged && (
              <p className="text-xs text-warning mt-1.5">
                This reading passed validation but has quality flags.
                It is included in calculations unless you filter to "valid only".
              </p>
            )}
          </div>

          {/* Measurements */}
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">Measurements</p>
            <div className="rounded-xl bg-canvas px-4">
              <Row label="Power" value={fmt(reading.power_kw, "kW")} />
              <Row label="Energy" value={fmt(reading.interval_energy_kwh, "kWh")} />
              <Row label="Irradiance" value={reading.irradiance_w_m2 != null ? `${reading.irradiance_w_m2} W/m²` : "—"} />
              <Row label="Ambient Temp" value={reading.ambient_temp_c != null ? `${reading.ambient_temp_c}°C` : "—"} />
              <Row label="Module Temp" value={reading.module_temp_c != null ? `${reading.module_temp_c}°C` : "—"} />
              <Row label="Voltage" value={reading.voltage_v != null ? `${reading.voltage_v} V` : "—"} />
              <Row label="Current" value={reading.current_a != null ? `${reading.current_a} A` : "—"} />
              <Row label="Inverter Status" value={reading.inverter_status ?? "—"} />
            </div>
          </div>

          {/* Source import */}
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">Source Import</p>
            <div className="rounded-xl bg-canvas px-4">
              <Row label="Import ID" value={
                <span className="font-mono text-xs">{reading.source_import_id.slice(0, 16)}…</span>
              } />
              {reading.source_filename && (
                <Row label="Filename" value={reading.source_filename} />
              )}
            </div>
            <Link
              href="/imports"
              className="mt-2 flex items-center gap-1 text-xs text-primary-teal hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> View in Imports
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
