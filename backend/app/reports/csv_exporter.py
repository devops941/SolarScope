"""
CSV export engine — generates consistent, traceable CSV exports.

Rule: Every export must reference the same filter snapshot or analysis_run_id
      that the user saw on screen. Never recalculate with different defaults.
"""
import csv
import io
from datetime import datetime, timezone


# ── Metrics CSV (from persisted analysis run) ─────────────────────────
def export_metrics_csv(analysis_run: dict) -> bytes:
    """
    Export all metrics from a saved analysis_run as CSV.
    Values come from the PERSISTED run — never recalculated.

    Headers: metric, value, unit, method, formula_version, sample_count,
             coverage_pct, is_estimated, warnings
    """
    metrics: dict = analysis_run.get("metrics", {})
    buf = io.StringIO()
    fieldnames = [
        "metric", "value", "unit", "method", "formula_version",
        "sample_count", "coverage_pct", "is_estimated", "warnings",
    ]
    writer = csv.DictWriter(buf, fieldnames=fieldnames)
    writer.writeheader()

    for key, m in metrics.items():
        if not isinstance(m, dict):
            continue
        writer.writerow({
            "metric": key,
            "value": m.get("value") if m.get("value") is not None else "",
            "unit": m.get("unit", ""),
            "method": m.get("method", ""),
            "formula_version": m.get("formula_version", ""),
            "sample_count": m.get("sample_count", ""),
            "coverage_pct": m.get("coverage_pct", ""),
            "is_estimated": m.get("is_estimated", False),
            "warnings": " | ".join(m.get("warnings", [])),
        })

    return buf.getvalue().encode("utf-8")


# ── Time-series CSV (from readings list) ─────────────────────────────
def export_time_series_csv(readings: list[dict], filter_snapshot: dict | None = None) -> bytes:
    """
    Export readings as a time-series CSV.
    Uses the EXACT same readings returned by the readings API for the same filter.

    Includes metadata header rows documenting the filter used.
    """
    buf = io.StringIO()

    # Metadata comment rows
    if filter_snapshot:
        for k, v in filter_snapshot.items():
            buf.write(f"# {k}: {v}\n")
        buf.write(f"# generated_at: {datetime.now(timezone.utc).isoformat()}\n")
        buf.write("#\n")

    fieldnames = [
        "timestamp_utc", "power_kw", "interval_energy_kwh",
        "irradiance_w_m2", "ambient_temp_c", "module_temp_c",
        "voltage_v", "current_a", "inverter_status",
        "quality", "source_import_id",
    ]
    writer = csv.DictWriter(buf, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()

    for r in readings:
        ts = r.get("timestamp_utc", "")
        writer.writerow({
            "timestamp_utc": ts,
            "power_kw": r.get("power_kw", ""),
            "interval_energy_kwh": r.get("interval_energy_kwh", ""),
            "irradiance_w_m2": r.get("irradiance_w_m2", ""),
            "ambient_temp_c": r.get("ambient_temp_c", ""),
            "module_temp_c": r.get("module_temp_c", ""),
            "voltage_v": r.get("voltage_v", ""),
            "current_a": r.get("current_a", ""),
            "inverter_status": r.get("inverter_status", ""),
            "quality": ",".join(r.get("quality") or ["valid"]),
            "source_import_id": r.get("source_import_id", ""),
        })

    return buf.getvalue().encode("utf-8")
