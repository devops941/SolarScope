"""
Core analytics metric functions — all pure, testable, versioned.

Every function returns a MetricResult with:
  value, unit, method, formula_version, sample_count, coverage_pct, warnings

Design rules:
  - Never return bare numbers.
  - If prerequisites are missing, return MetricResult(value=None) with explanation in warnings.
  - Zero is a valid value; None means "cannot calculate".
  - Warnings are informational; they do not change the value.
  - 'is_estimated' marks power-integration energy (less reliable than meter energy).
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any

from app.analytics.formula_registry import FORMULA_VERSION, interval_to_hours

VALID_FLAG = "valid"


@dataclass
class MetricResult:
    value: float | None
    unit: str
    method: str
    formula_version: str = FORMULA_VERSION
    sample_count: int = 0
    coverage_pct: float = 0.0
    warnings: list[str] = field(default_factory=list)
    is_estimated: bool = False

    def to_dict(self) -> dict:
        return {
            "value": self.value,
            "unit": self.unit,
            "method": self.method,
            "formula_version": self.formula_version,
            "sample_count": self.sample_count,
            "coverage_pct": self.coverage_pct,
            "warnings": self.warnings,
            "is_estimated": self.is_estimated,
        }


def _is_valid(r: dict) -> bool:
    q = r.get("quality", [VALID_FLAG])
    return not any(f.startswith("flagged_") for f in q) or VALID_FLAG in q


def _coverage(actual: int, expected: int) -> float:
    if expected <= 0:
        return 100.0
    return round(min(100.0, actual / expected * 100), 2)


# ══════════════════════════════════════════════════════════════════════
# Energy
# ══════════════════════════════════════════════════════════════════════

def calculate_energy(
    readings: list[dict],
    interval: str = "15m",
    expected_count: int | None = None,
) -> MetricResult:
    """
    Total energy for the period.
    Uses interval_energy_kwh if available, otherwise integrates power_kw × interval_hours.
    """
    if not readings:
        return MetricResult(value=None, unit="kWh", method="interval_energy_sum",
                            warnings=["No readings in the selected period."])

    # Try interval energy first (preferred — meter-based)
    energy_vals = [r.get("interval_energy_kwh") for r in readings
                   if r.get("interval_energy_kwh") is not None]

    if energy_vals:
        total = round(sum(energy_vals), 4)
        expected = expected_count or len(readings)
        return MetricResult(
            value=total,
            unit="kWh",
            method="interval_energy_sum",
            sample_count=len(energy_vals),
            coverage_pct=_coverage(len(energy_vals), expected),
            warnings=[] if len(energy_vals) == len(readings) else
                     [f"Only {len(energy_vals)} of {len(readings)} rows had energy values."],
        )

    # Fallback: power integration
    ih = interval_to_hours(interval)
    power_vals = [r.get("power_kw") for r in readings if r.get("power_kw") is not None]
    if not power_vals:
        return MetricResult(value=None, unit="kWh", method="power_integration",
                            warnings=["Neither energy nor power values available."])

    total = round(sum(p * ih for p in power_vals), 4)
    expected = expected_count or len(readings)
    return MetricResult(
        value=total,
        unit="kWh",
        method="power_integration",
        sample_count=len(power_vals),
        coverage_pct=_coverage(len(power_vals), expected),
        warnings=["Energy estimated from power integration — interval meter preferred."],
        is_estimated=True,
    )


# ══════════════════════════════════════════════════════════════════════
# Power
# ══════════════════════════════════════════════════════════════════════

def calculate_average_power(
    readings: list[dict],
    expected_count: int | None = None,
) -> MetricResult:
    """Time-weighted mean of power_kw (equal intervals → arithmetic mean)."""
    vals = [r["power_kw"] for r in readings
            if r.get("power_kw") is not None and r["power_kw"] >= 0]
    if not vals:
        return MetricResult(value=None, unit="kW", method="average_power_time_weighted",
                            warnings=["No valid power values."])
    expected = expected_count or len(readings)
    return MetricResult(
        value=round(sum(vals) / len(vals), 4),
        unit="kW",
        method="average_power_time_weighted",
        sample_count=len(vals),
        coverage_pct=_coverage(len(vals), expected),
    )


def calculate_peak_power(readings: list[dict]) -> MetricResult:
    """Maximum valid power_kw in the period."""
    vals = [r["power_kw"] for r in readings
            if r.get("power_kw") is not None and r["power_kw"] >= 0]
    if not vals:
        return MetricResult(value=None, unit="kW", method="peak_power",
                            warnings=["No valid power values."])
    return MetricResult(
        value=round(max(vals), 4),
        unit="kW",
        method="peak_power",
        sample_count=len(vals),
        coverage_pct=100.0,
    )


# ══════════════════════════════════════════════════════════════════════
# Specific Yield
# ══════════════════════════════════════════════════════════════════════

def calculate_specific_yield(
    energy_kwh: float | None,
    dc_capacity_kwp: float | None,
    energy_result: MetricResult | None = None,
) -> MetricResult:
    """specific_yield = total_energy_kWh / dc_capacity_kWp"""
    warnings: list[str] = []

    if dc_capacity_kwp is None or dc_capacity_kwp <= 0:
        return MetricResult(value=None, unit="kWh/kWp", method="specific_yield",
                            warnings=["DC capacity not configured for this system."])
    if energy_kwh is None:
        return MetricResult(value=None, unit="kWh/kWp", method="specific_yield",
                            warnings=["Energy value not available."])
    if energy_result and energy_result.is_estimated:
        warnings.append("Energy was estimated from power integration, not meter data.")

    return MetricResult(
        value=round(energy_kwh / dc_capacity_kwp, 4),
        unit="kWh/kWp",
        method="specific_yield",
        sample_count=energy_result.sample_count if energy_result else 0,
        coverage_pct=energy_result.coverage_pct if energy_result else 0.0,
        warnings=warnings,
    )


# ══════════════════════════════════════════════════════════════════════
# Irradiation
# ══════════════════════════════════════════════════════════════════════

def calculate_irradiation(
    readings: list[dict],
    interval: str = "15m",
    expected_count: int | None = None,
) -> MetricResult:
    """
    H_POA = Σ (G_i × Δt_hours) / 1000   [kWh/m²]
    G_i in W/m², Δt_hours = interval in hours.
    """
    ih = interval_to_hours(interval)
    irr_vals = [r["irradiance_w_m2"] for r in readings
                if r.get("irradiance_w_m2") is not None and r["irradiance_w_m2"] >= 0]
    if not irr_vals:
        return MetricResult(value=None, unit="kWh/m²", method="irradiation_time_integration",
                            warnings=["No irradiance data available."])
    h_poa = round(sum(g * ih for g in irr_vals) / 1000.0, 4)
    expected = expected_count or len(readings)
    warnings: list[str] = []
    if len(irr_vals) < len(readings):
        warnings.append(f"Irradiance missing for {len(readings) - len(irr_vals)} intervals.")
    return MetricResult(
        value=h_poa,
        unit="kWh/m²",
        method="irradiation_time_integration",
        sample_count=len(irr_vals),
        coverage_pct=_coverage(len(irr_vals), expected),
        warnings=warnings,
    )


# ══════════════════════════════════════════════════════════════════════
# Temperature
# ══════════════════════════════════════════════════════════════════════

def calculate_temperature_stats(
    readings: list[dict],
    field: str = "ambient_temp_c",
) -> MetricResult:
    """Mean/min/max for the given temperature field."""
    vals = [r[field] for r in readings
            if r.get(field) is not None]
    if not vals:
        return MetricResult(value=None, unit="°C", method="temperature_statistics",
                            warnings=[f"No {field} data available."])
    mean_v = round(sum(vals) / len(vals), 2)
    return MetricResult(
        value=mean_v,
        unit="°C",
        method="temperature_statistics",
        sample_count=len(vals),
        coverage_pct=_coverage(len(vals), len(readings)),
        warnings=[],
    )


def calculate_all_temperatures(readings: list[dict]) -> dict[str, MetricResult]:
    return {
        "avg_ambient_temp_c": calculate_temperature_stats(readings, "ambient_temp_c"),
        "avg_module_temp_c": calculate_temperature_stats(readings, "module_temp_c"),
    }


# ══════════════════════════════════════════════════════════════════════
# Data Coverage
# ══════════════════════════════════════════════════════════════════════

def calculate_data_coverage(
    actual_count: int,
    expected_count: int,
    interval: str = "15m",
) -> MetricResult:
    """Coverage = (actual valid intervals / expected intervals) × 100%"""
    if expected_count <= 0:
        return MetricResult(value=None, unit="%", method="data_coverage",
                            warnings=["Cannot determine expected interval count."])
    pct = _coverage(actual_count, expected_count)
    warnings: list[str] = []
    if pct < 90:
        warnings.append(f"Low data coverage: {pct}%. Analysis may be incomplete.")
    return MetricResult(
        value=pct,
        unit="%",
        method="data_coverage",
        sample_count=actual_count,
        coverage_pct=pct,
        warnings=warnings,
    )


# ══════════════════════════════════════════════════════════════════════
# Temperature-corrected power (indicative)
# ══════════════════════════════════════════════════════════════════════

def estimate_temp_corrected_power(
    p_stc_kwp: float,
    irradiance_w_m2: float,
    module_temp_c: float,
    temp_coefficient_per_c: float = -0.004,
) -> float:
    """
    P_estimated = P_STC × (G/1000) × [1 + γ × (T_module - 25)]

    INDICATIVE ONLY — not a certified PV simulation.
    γ is typically -0.003 to -0.005 per °C for silicon panels.
    """
    return max(0.0, p_stc_kwp * (irradiance_w_m2 / 1000.0) *
               (1 + temp_coefficient_per_c * (module_temp_c - 25.0)))
