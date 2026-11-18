"""
Dashboard service — real-time KPIs and chart series.

CRITICAL DESIGN RULE:
  This service calls the SAME metric functions as services/analytics.py.
  Dashboard KPIs must ALWAYS reconcile with analytics runs for the same filter.
  Never calculate KPIs separately here — always reuse analytics/metrics.py.

Flow:
  1. Fetch readings from DB (same repository + filter as readings explorer)
  2. Run metric calculations (same functions as analytics service)
  3. Fetch open alert counts (non-blocking)
  4. Return summary + chart series
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone, timedelta

from app.repositories.readings import ReadingsRepository
from app.repositories.systems import SystemsRepository
from app.analytics.metrics import (
    calculate_energy, calculate_specific_yield, calculate_irradiation,
    calculate_data_coverage, calculate_average_power, calculate_peak_power,
    calculate_temperature_stats,
)
from app.analytics.performance_ratio import calculate_performance_ratio
from app.analytics.resampling import build_chart_series
from app.analytics.formula_registry import FORMULA_VERSION, interval_to_hours
from app.services.alerts import get_alert_counts
from app.core.errors import NotFoundError
from pymongo import ASCENDING

logger = logging.getLogger(__name__)

_readings = ReadingsRepository()
_systems = SystemsRepository()

INTERVAL_MINUTES = {"5m": 5, "15m": 15, "30m": 30, "1h": 60, "1d": 1440}


async def get_summary(
    workspace_id: str,
    system_id: str,
    start: datetime,
    end: datetime,
    interval: str = "15m",
    quality: str = "valid",
) -> dict:
    """
    Returns dashboard KPIs for the given period.
    Uses identical calculation logic to services/analytics.py.
    """
    system = await _systems.get(workspace_id, system_id)
    if not system:
        raise NotFoundError("Solar system")

    dc_capacity_kwp: float | None = system.get("dc_capacity_kwp")
    site_id = system.get("site_id", "")

    # Fetch readings — same query as readings explorer
    readings = await _readings.fetch_for_analytics(
        workspace_id, system_id, start, end, quality
    )

    interval_min = INTERVAL_MINUTES.get(interval, 15)
    expected_count = max(1, int((end - start).total_seconds() / 60 / interval_min))

    # ── KPI calculations (SAME functions as analytics service) ────────
    energy_result      = calculate_energy(readings, interval, expected_count)
    irr_result         = calculate_irradiation(readings, interval, expected_count)
    coverage_result    = calculate_data_coverage(len(readings), expected_count, interval)
    specific_yield     = calculate_specific_yield(energy_result.value, dc_capacity_kwp, energy_result)
    pr_result          = calculate_performance_ratio(
        ac_energy_kwh=energy_result.value,
        dc_capacity_kwp=dc_capacity_kwp,
        h_poa_kwh_m2=irr_result.value,
        energy_is_estimated=energy_result.is_estimated,
    )
    peak_power         = calculate_peak_power(readings)
    avg_ambient        = calculate_temperature_stats(readings, "ambient_temp_c")
    avg_module         = calculate_temperature_stats(readings, "module_temp_c")

    # Alert summary (best-effort — never fail dashboard if alerts fail)
    try:
        alert_counts = await get_alert_counts(workspace_id)
    except Exception:
        alert_counts = {"total": 0, "critical": 0, "warning": 0, "info": 0}

    return {
        "period": {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "interval": interval,
            "quality": quality,
            "system_id": system_id,
            "site_id": site_id,
        },
        "kpis": {
            "energy_kwh": energy_result.to_dict(),
            "specific_yield": specific_yield.to_dict(),
            "performance_ratio": pr_result.to_dict(),
            "data_coverage": coverage_result.to_dict(),
            "peak_power_kw": peak_power.to_dict(),
        },
        "temperatures": {
            "avg_ambient_temp_c": avg_ambient.to_dict(),
            "avg_module_temp_c": avg_module.to_dict(),
        },
        "alerts": alert_counts,
        "formula_version": FORMULA_VERSION,
        "sample_count": len(readings),
    }


async def get_series(
    workspace_id: str,
    system_id: str,
    start: datetime,
    end: datetime,
    interval: str = "15m",
) -> dict:
    """
    Returns time-series data for dashboard charts.
    Fetches ALL readings (valid + flagged) for visualization.
    Uses the same underlying readings repository as the readings explorer.
    """
    # For charts we include flagged readings (visualization, not official totals)
    readings = await _readings.fetch_for_analytics(
        workspace_id, system_id, start, end, quality="all"
    )

    series = build_chart_series(readings, interval)

    return {
        "series": series,
        "interval": interval,
        "total_points": len(series),
        "system_id": system_id,
        "period": {
            "start": start.isoformat(),
            "end": end.isoformat(),
        },
    }
