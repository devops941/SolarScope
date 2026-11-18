"""
Period comparison and correlation analysis.

Comparison: run metrics for two time periods and return side-by-side + deltas.
Correlation: Pearson / Spearman between power generation and irradiance.
"""
from __future__ import annotations
import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


# ── Comparison ────────────────────────────────────────────────────────
@dataclass
class PeriodComparison:
    metric_key: str
    unit: str
    period_a: float | None
    period_b: float | None
    delta: float | None
    delta_pct: float | None


def compare_metrics(
    metrics_a: dict,
    metrics_b: dict,
    keys: list[str] | None = None,
) -> list[dict]:
    """
    Compare two sets of MetricResult dicts and return delta + delta_pct per metric.
    keys = None → compare all keys present in both.
    """
    if keys is None:
        keys = list(set(metrics_a.keys()) & set(metrics_b.keys()))

    result: list[dict] = []
    for key in keys:
        a = metrics_a.get(key, {})
        b = metrics_b.get(key, {})
        va: float | None = a.get("value") if isinstance(a, dict) else None
        vb: float | None = b.get("value") if isinstance(b, dict) else None
        unit = a.get("unit", "") if isinstance(a, dict) else ""

        delta: float | None = None
        delta_pct: float | None = None
        if va is not None and vb is not None:
            delta = round(vb - va, 4)
            if va != 0:
                delta_pct = round((vb - va) / abs(va) * 100, 2)
            else:
                delta_pct = None

        result.append({
            "metric": key,
            "unit": unit,
            "period_a": va,
            "period_b": vb,
            "delta": delta,
            "delta_pct": delta_pct,
        })
    return result


# ── Correlation ───────────────────────────────────────────────────────
@dataclass
class CorrelationResult:
    pearson_r: float | None
    spearman_r: float | None
    sample_count: int
    interpretation: str   # "strong" | "moderate" | "weak" | "insufficient_data"
    caveat: str = "Correlation is not causation. Investigate weak correlation further."
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "pearson_r": self.pearson_r,
            "spearman_r": self.spearman_r,
            "sample_count": self.sample_count,
            "interpretation": self.interpretation,
            "caveat": self.caveat,
            "warnings": self.warnings,
        }


def calculate_correlation(readings: list[dict]) -> CorrelationResult:
    """
    Pearson and Spearman correlation between power_kw and irradiance_w_m2.

    Requires scipy. Only uses rows where both values are present and non-negative.

    Interpretation thresholds:
      |r| > 0.95 → strong (normal solar behaviour)
      |r| > 0.80 → moderate
      |r| ≤ 0.80 → weak (investigate possible soiling, shading, or sensor issues)
    """
    # Align: only rows with both power and irradiance
    pairs = [
        (r["power_kw"], r["irradiance_w_m2"])
        for r in readings
        if r.get("power_kw") is not None
        and r.get("irradiance_w_m2") is not None
        and r["power_kw"] >= 0
        and r["irradiance_w_m2"] >= 0
    ]

    if len(pairs) < 5:
        return CorrelationResult(
            pearson_r=None, spearman_r=None,
            sample_count=len(pairs),
            interpretation="insufficient_data",
            warnings=["Fewer than 5 paired power+irradiance samples. Correlation not calculated."],
        )

    power = [p[0] for p in pairs]
    irr = [p[1] for p in pairs]

    warnings: list[str] = []

    try:
        from scipy.stats import pearsonr, spearmanr
        pr, pp = pearsonr(power, irr)
        sr, sp = spearmanr(power, irr)
        pearson_r = round(float(pr), 4)
        spearman_r = round(float(sr), 4)
    except ImportError:
        return CorrelationResult(
            pearson_r=None, spearman_r=None,
            sample_count=len(pairs),
            interpretation="insufficient_data",
            warnings=["scipy not available; correlation not calculated."],
        )
    except Exception as exc:
        logger.warning("Correlation calculation failed: %s", exc)
        return CorrelationResult(
            pearson_r=None, spearman_r=None,
            sample_count=len(pairs),
            interpretation="insufficient_data",
            warnings=[f"Calculation error: {exc}"],
        )

    abs_r = abs(pearson_r)
    if abs_r > 0.95:
        interpretation = "strong"
    elif abs_r > 0.80:
        interpretation = "moderate"
    else:
        interpretation = "weak"
        warnings.append(
            f"Weak correlation (r={pearson_r}). "
            "Possible causes: shading, soiling, inverter clipping, sensor misalignment."
        )

    return CorrelationResult(
        pearson_r=pearson_r,
        spearman_r=spearman_r,
        sample_count=len(pairs),
        interpretation=interpretation,
        warnings=warnings,
    )


# ── Baseline (expected power from irradiance) ─────────────────────────
def calculate_baseline_power(
    irradiance_w_m2: float,
    dc_capacity_kwp: float,
    baseline_efficiency: float = 0.80,
) -> float:
    """
    Expected AC power = DC_capacity × (G / 1000) × baseline_efficiency.
    baseline_efficiency = typical performance factor (default 80%).
    This is indicative only — not a certified PV simulation.
    """
    return dc_capacity_kwp * (irradiance_w_m2 / 1000.0) * baseline_efficiency
