"""
Anomaly detection engine — 6 explainable rule-based detectors.

Each rule:
  - Is a pure function that takes readings + system config
  - Returns a list of TriggeredAnomaly (empty if rule does not fire)
  - Provides human-readable evidence (not just a flag)
  - Is an investigation signal — NOT proof of equipment failure

Rule codes:
  OUTPUT_DROP         Actual output below irradiance-adjusted baseline
  DAYLIGHT_FLATLINE   Near-zero power while irradiance > threshold
  HIGH_MODULE_TEMP    Module temperature above review threshold
  DATA_GAP            Missing intervals exceed configured tolerance
  IRRADIANCE_MISMATCH High irradiance but low power output
  SENSOR_OUTLIER      Sensor value outside plausibility range
"""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.analytics.comparison import calculate_baseline_power

# ── Thresholds (configurable via workspace settings in future) ────────
OUTPUT_DROP_THRESHOLD_PCT = 0.30     # >30% below baseline for N intervals
OUTPUT_DROP_MIN_INTERVALS = 3        # Must persist for ≥ 3 consecutive intervals
FLATLINE_POWER_KW = 0.1              # Power below this is "near-zero"
FLATLINE_IRRADIANCE_W_M2 = 50.0      # Above this is "daylight"
FLATLINE_MIN_INTERVALS = 2
HIGH_TEMP_THRESHOLD_C = 75.0
HIGH_TEMP_MIN_INTERVALS = 1
DATA_GAP_TOLERANCE_PCT = 5.0         # Allow up to 5% missing
IRRADIANCE_MISMATCH_MIN_IRR = 400.0  # W/m²
IRRADIANCE_MISMATCH_POWER_PCT = 0.30 # Power must be < 30% of expected
SENSOR_OUTLIER_RANGES = {
    "power_kw":           (0, 10_000),
    "irradiance_w_m2":    (0, 1500),
    "ambient_temp_c":     (-50, 60),
    "module_temp_c":      (-50, 100),
    "voltage_v":          (0, 2000),
    "current_a":          (0, 10_000),
}


@dataclass
class TriggeredAnomaly:
    rule_code: str
    severity: str                   # "info" | "warning" | "critical"
    evidence: dict
    trigger_description: str
    affected_intervals: list[str] = field(default_factory=list)


def run_all_rules(
    readings: list[dict],
    dc_capacity_kwp: float | None,
    expected_count: int,
    system_id: str = "",
) -> list[TriggeredAnomaly]:
    """Run all 6 anomaly rules and return triggered anomalies."""
    triggered: list[TriggeredAnomaly] = []
    if not readings:
        return triggered

    triggered.extend(_rule_data_gap(readings, expected_count))
    triggered.extend(_rule_sensor_outlier(readings))

    if dc_capacity_kwp and dc_capacity_kwp > 0:
        triggered.extend(_rule_output_drop(readings, dc_capacity_kwp))
        triggered.extend(_rule_irradiance_mismatch(readings, dc_capacity_kwp))

    triggered.extend(_rule_daylight_flatline(readings))
    triggered.extend(_rule_high_module_temp(readings))

    return triggered


# ── Rule 1: OUTPUT_DROP ───────────────────────────────────────────────
def _rule_output_drop(
    readings: list[dict],
    dc_capacity_kwp: float,
    efficiency: float = 0.80,
    threshold: float = OUTPUT_DROP_THRESHOLD_PCT,
    min_intervals: int = OUTPUT_DROP_MIN_INTERVALS,
) -> list[TriggeredAnomaly]:
    """Output below irradiance-adjusted baseline for ≥ N consecutive intervals."""
    consecutive = 0
    drop_start: str | None = None
    deviations: list[float] = []
    intervals: list[str] = []

    for r in readings:
        irr = r.get("irradiance_w_m2")
        pwr = r.get("power_kw")
        ts = _ts(r)
        if irr is None or pwr is None or irr <= 0:
            consecutive = 0
            continue

        expected = calculate_baseline_power(irr, dc_capacity_kwp, efficiency)
        if expected <= 0:
            continue

        deviation = (expected - pwr) / expected
        if deviation > threshold:
            consecutive += 1
            deviations.append(deviation)
            intervals.append(ts)
            if consecutive == 1:
                drop_start = ts
        else:
            if consecutive >= min_intervals and deviations:
                return [TriggeredAnomaly(
                    rule_code="OUTPUT_DROP",
                    severity="warning",
                    evidence={
                        "baseline_efficiency_pct": int(efficiency * 100),
                        "avg_deviation_pct": round(sum(deviations) / len(deviations) * 100, 1),
                        "max_deviation_pct": round(max(deviations) * 100, 1),
                        "duration_intervals": consecutive,
                        "drop_started_at": drop_start,
                    },
                    trigger_description=(
                        f"Output {round(sum(deviations)/len(deviations)*100,0):.0f}% below "
                        f"irradiance-adjusted baseline for {consecutive} consecutive intervals."
                    ),
                    affected_intervals=intervals,
                )]
            consecutive = 0
            deviations = []
            intervals = []

    # Check if still dropping at end of period
    if consecutive >= min_intervals and deviations:
        return [TriggeredAnomaly(
            rule_code="OUTPUT_DROP",
            severity="warning",
            evidence={
                "baseline_efficiency_pct": int(efficiency * 100),
                "avg_deviation_pct": round(sum(deviations) / len(deviations) * 100, 1),
                "max_deviation_pct": round(max(deviations) * 100, 1),
                "duration_intervals": consecutive,
                "drop_started_at": drop_start,
            },
            trigger_description=(
                f"Output {round(sum(deviations)/len(deviations)*100,0):.0f}% below baseline "
                f"for {consecutive} intervals at end of period."
            ),
            affected_intervals=intervals,
        )]
    return []


# ── Rule 2: DAYLIGHT_FLATLINE ─────────────────────────────────────────
def _rule_daylight_flatline(
    readings: list[dict],
    power_threshold: float = FLATLINE_POWER_KW,
    irr_threshold: float = FLATLINE_IRRADIANCE_W_M2,
    min_intervals: int = FLATLINE_MIN_INTERVALS,
) -> list[TriggeredAnomaly]:
    """Near-zero power while irradiance > threshold."""
    flatline_intervals = []
    for r in readings:
        irr = r.get("irradiance_w_m2")
        pwr = r.get("power_kw")
        if irr is not None and pwr is not None:
            if irr > irr_threshold and (pwr is None or pwr < power_threshold):
                flatline_intervals.append({
                    "ts": _ts(r), "power_kw": pwr, "irradiance_w_m2": irr,
                })

    if len(flatline_intervals) >= min_intervals:
        return [TriggeredAnomaly(
            rule_code="DAYLIGHT_FLATLINE",
            severity="critical",
            evidence={
                "flatline_interval_count": len(flatline_intervals),
                "irradiance_threshold_w_m2": irr_threshold,
                "power_threshold_kw": power_threshold,
                "first_occurrence": flatline_intervals[0]["ts"] if flatline_intervals else None,
            },
            trigger_description=(
                f"Near-zero power (< {power_threshold} kW) while irradiance > "
                f"{irr_threshold} W/m² in {len(flatline_intervals)} intervals."
            ),
            affected_intervals=[i["ts"] for i in flatline_intervals],
        )]
    return []


# ── Rule 3: HIGH_MODULE_TEMP ──────────────────────────────────────────
def _rule_high_module_temp(
    readings: list[dict],
    threshold_c: float = HIGH_TEMP_THRESHOLD_C,
    min_intervals: int = HIGH_TEMP_MIN_INTERVALS,
) -> list[TriggeredAnomaly]:
    """Module temperature above review threshold."""
    hot = [r for r in readings
           if r.get("module_temp_c") is not None and r["module_temp_c"] > threshold_c]
    if len(hot) >= min_intervals:
        temps = [r["module_temp_c"] for r in hot]
        return [TriggeredAnomaly(
            rule_code="HIGH_MODULE_TEMP",
            severity="warning",
            evidence={
                "peak_temp_c": round(max(temps), 1),
                "avg_high_temp_c": round(sum(temps) / len(temps), 1),
                "threshold_c": threshold_c,
                "duration_intervals": len(hot),
            },
            trigger_description=(
                f"Module temperature exceeded {threshold_c}°C in {len(hot)} intervals "
                f"(peak: {round(max(temps),1)}°C)."
            ),
            affected_intervals=[_ts(r) for r in hot],
        )]
    return []


# ── Rule 4: DATA_GAP ──────────────────────────────────────────────────
def _rule_data_gap(
    readings: list[dict],
    expected_count: int,
    tolerance_pct: float = DATA_GAP_TOLERANCE_PCT,
) -> list[TriggeredAnomaly]:
    """Missing intervals exceed configured tolerance."""
    if expected_count <= 0:
        return []
    actual = len(readings)
    missing = max(0, expected_count - actual)
    missing_pct = missing / expected_count * 100

    if missing_pct > tolerance_pct:
        coverage = round(100.0 - missing_pct, 1)
        return [TriggeredAnomaly(
            rule_code="DATA_GAP",
            severity="info",
            evidence={
                "missing_count": missing,
                "expected_count": expected_count,
                "actual_count": actual,
                "coverage_pct": coverage,
                "tolerance_pct": tolerance_pct,
            },
            trigger_description=(
                f"{missing} intervals missing ({round(missing_pct,1)}% of expected). "
                f"Coverage: {coverage}% (tolerance: {tolerance_pct}%)."
            ),
        )]
    return []


# ── Rule 5: IRRADIANCE_MISMATCH ───────────────────────────────────────
def _rule_irradiance_mismatch(
    readings: list[dict],
    dc_capacity_kwp: float,
    min_irr: float = IRRADIANCE_MISMATCH_MIN_IRR,
    power_ratio_threshold: float = IRRADIANCE_MISMATCH_POWER_PCT,
    efficiency: float = 0.80,
) -> list[TriggeredAnomaly]:
    """High irradiance but power output < threshold % of expected."""
    mismatches = []
    for r in readings:
        irr = r.get("irradiance_w_m2")
        pwr = r.get("power_kw")
        if irr is None or pwr is None or irr < min_irr:
            continue
        expected = calculate_baseline_power(irr, dc_capacity_kwp, efficiency)
        if expected > 0 and pwr / expected < power_ratio_threshold:
            mismatches.append({
                "ts": _ts(r),
                "irradiance_w_m2": irr,
                "actual_power_kw": pwr,
                "expected_power_kw": round(expected, 3),
                "ratio_pct": round(pwr / expected * 100, 1),
            })

    if mismatches:
        return [TriggeredAnomaly(
            rule_code="IRRADIANCE_MISMATCH",
            severity="warning",
            evidence={
                "mismatch_count": len(mismatches),
                "min_irradiance_threshold": min_irr,
                "power_ratio_threshold_pct": int(power_ratio_threshold * 100),
                "sample": mismatches[0] if mismatches else {},
            },
            trigger_description=(
                f"Power below {int(power_ratio_threshold*100)}% of irradiance-adjusted expected "
                f"in {len(mismatches)} intervals with irradiance > {min_irr} W/m²."
            ),
            affected_intervals=[m["ts"] for m in mismatches[:20]],
        )]
    return []


# ── Rule 6: SENSOR_OUTLIER ────────────────────────────────────────────
def _rule_sensor_outlier(readings: list[dict]) -> list[TriggeredAnomaly]:
    """Sensor value outside configured plausibility range."""
    triggered: list[TriggeredAnomaly] = []

    for field_name, (lo, hi) in SENSOR_OUTLIER_RANGES.items():
        outliers = []
        for r in readings:
            v = r.get(field_name)
            if v is None:
                continue
            if v < lo or v > hi:
                outliers.append({"ts": _ts(r), "value": v, "field": field_name})

        if outliers:
            triggered.append(TriggeredAnomaly(
                rule_code="SENSOR_OUTLIER",
                severity="info",
                evidence={
                    "field": field_name,
                    "outlier_count": len(outliers),
                    "expected_range": [lo, hi],
                    "sample_values": [o["value"] for o in outliers[:3]],
                    "first_occurrence": outliers[0]["ts"],
                },
                trigger_description=(
                    f"{field_name} had {len(outliers)} values outside "
                    f"plausible range [{lo}, {hi}]."
                ),
                affected_intervals=[o["ts"] for o in outliers[:20]],
            ))

    return triggered


def _ts(r: dict) -> str:
    ts = r.get("timestamp_utc", "")
    return str(ts) if ts else ""
