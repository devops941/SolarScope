"""
Row-level validator — applies all 10 SolarScope validation rules.

Rules are applied in order; the first failure marks the row as rejected.
Warnings (flagged) do not stop subsequent rule checks.

Rule severity:
  - REJECT: row is excluded from readings
  - FLAG: row is written but marked with a quality flag
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from app.ingestion.normalizer import parse_timestamp, parse_float

# ── Thresholds (configurable via workspace settings in future) ────────
MAX_IRRADIANCE_W_M2 = 1500.0     # Physical upper bound for solar irradiance
MAX_MODULE_TEMP_C = 100.0        # Above this → sensor malfunction likely
MIN_MODULE_TEMP_C = -40.0        # Below this → physically implausible
MAX_AMBIENT_TEMP_C = 60.0
MIN_AMBIENT_TEMP_C = -50.0
FUTURE_TOLERANCE_HOURS = 1       # Allow up to 1 hour in the future


# ── Result types ──────────────────────────────────────────────────────
@dataclass
class RowResult:
    row_number: int
    status: str         # accepted | rejected | flagged | skipped
    error_code: str | None = None
    error_message: str | None = None
    quality_flags: list[str] = field(default_factory=list)
    original_values: dict = field(default_factory=dict)
    normalized: dict = field(default_factory=dict)


# ── Main validation entry point ───────────────────────────────────────
def validate_row(
    row_number: int,
    mapped_row: dict[str, str | None],
    source_timezone: str,
    original_values: dict,
    system_id: str | None = None,
) -> RowResult:
    """
    Validate a single mapped CSV row.
    Returns a RowResult with status, error codes, and normalized values.
    """
    result = RowResult(row_number=row_number, status="accepted", original_values=original_values)
    flags: list[str] = []

    # ── RULE 1: Missing timestamp ─────────────────────────────────────
    ts_raw = mapped_row.get("timestamp")
    if not ts_raw or not ts_raw.strip():
        return _reject(result, "MISSING_TIMESTAMP", "timestamp column is empty")

    # ── RULE 2: Invalid timestamp ─────────────────────────────────────
    dt_utc = parse_timestamp(ts_raw, source_timezone)
    if dt_utc is None:
        return _reject(result, "INVALID_TIMESTAMP", f"Cannot parse timestamp: {ts_raw!r}")

    # ── RULE 3: Future timestamp ──────────────────────────────────────
    cutoff = datetime.now(timezone.utc) + timedelta(hours=FUTURE_TOLERANCE_HOURS)
    if dt_utc > cutoff:
        return _reject(result, "FUTURE_TIMESTAMP",
                       f"Timestamp {ts_raw!r} is more than {FUTURE_TOLERANCE_HOURS}h in the future")

    # ── RULE 4: No measurement ────────────────────────────────────────
    power_raw = mapped_row.get("power_kw")
    energy_raw = mapped_row.get("energy_kwh")
    if (not power_raw or not power_raw.strip()) and (not energy_raw or not energy_raw.strip()):
        return _reject(result, "NO_MEASUREMENT",
                       "Both power_kw and energy_kwh are absent; at least one is required")

    # ── RULE 5: Non-numeric power ─────────────────────────────────────
    power_val: float | None = None
    if power_raw and power_raw.strip():
        power_val = parse_float(power_raw)
        if power_val is None:
            return _reject(result, "NON_NUMERIC",
                           f"power_kw contains a non-numeric value: {power_raw!r}")

    # ── RULE 6: Non-numeric energy ────────────────────────────────────
    energy_val: float | None = None
    if energy_raw and energy_raw.strip():
        energy_val = parse_float(energy_raw)
        if energy_val is None:
            return _reject(result, "NON_NUMERIC",
                           f"energy_kwh contains a non-numeric value: {energy_raw!r}")

    # ── RULE 7: Negative power ────────────────────────────────────────
    if power_val is not None and power_val < 0:
        return _reject(result, "NEGATIVE_POWER",
                       f"power_kw value {power_val} is negative. Use meter config for reverse flow.")

    # ── RULE 8: Irradiance outlier ────────────────────────────────────
    irr_raw = mapped_row.get("irradiance_w_m2")
    irr_val: float | None = None
    if irr_raw and irr_raw.strip():
        irr_val = parse_float(irr_raw)
        if irr_val is None:
            return _reject(result, "NON_NUMERIC",
                           f"irradiance_w_m2 contains a non-numeric value: {irr_raw!r}")
        if irr_val > MAX_IRRADIANCE_W_M2:
            return _reject(result, "IRRADIANCE_OUTLIER",
                           f"irradiance_w_m2 value {irr_val} exceeds physical limit of {MAX_IRRADIANCE_W_M2} W/m²")
        if irr_val < 0:
            flags.append("flagged_irradiance")

    # ── RULE 9: Temperature outlier ───────────────────────────────────
    mod_temp_raw = mapped_row.get("module_temp_c")
    mod_temp_val: float | None = None
    if mod_temp_raw and mod_temp_raw.strip():
        mod_temp_val = parse_float(mod_temp_raw)
        if mod_temp_val is not None:
            if mod_temp_val > MAX_MODULE_TEMP_C or mod_temp_val < MIN_MODULE_TEMP_C:
                flags.append("flagged_temp")

    amb_temp_raw = mapped_row.get("ambient_temp_c")
    amb_temp_val: float | None = None
    if amb_temp_raw and amb_temp_raw.strip():
        amb_temp_val = parse_float(amb_temp_raw)
        if amb_temp_val is not None:
            if amb_temp_val > MAX_AMBIENT_TEMP_C or amb_temp_val < MIN_AMBIENT_TEMP_C:
                flags.append("flagged_temp")

    # ── RULE 10: Power suspicious during daylight ─────────────────────
    if power_val is not None and power_val == 0 and irr_val is not None and irr_val > 50:
        flags.append("flagged_power")

    # ── Build normalized reading ──────────────────────────────────────
    result.normalized = {
        "timestamp_utc": dt_utc,
        "power_kw": power_val,
        "interval_energy_kwh": energy_val,
        "irradiance_w_m2": irr_val,
        "ambient_temp_c": amb_temp_val,
        "module_temp_c": mod_temp_val,
        "voltage_v": _safe_float(mapped_row.get("voltage_v")),
        "current_a": _safe_float(mapped_row.get("current_a")),
        "inverter_status": mapped_row.get("inverter_status"),
        "quality": flags if flags else ["valid"],
    }
    result.quality_flags = flags
    result.status = "flagged" if flags else "accepted"
    return result


def _reject(result: RowResult, code: str, message: str) -> RowResult:
    result.status = "rejected"
    result.error_code = code
    result.error_message = message
    return result


def _safe_float(raw: str | None) -> float | None:
    if not raw or not raw.strip():
        return None
    return parse_float(raw)
