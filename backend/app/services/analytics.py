"""
Analytics service — orchestrates a full analysis run.

Flow:
  1. Validate system belongs to workspace
  2. Fetch readings for the period
  3. Run all metric calculations
  4. Persist analysis_run with filter_snapshot + metrics + formula_version
  5. Return serializable result
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone, timedelta

from app.core.errors import NotFoundError, ValidationError
from app.repositories.readings import ReadingsRepository
from app.repositories.systems import SystemsRepository
from app.repositories.analysis_runs import AnalysisRunsRepository
from app.analytics.metrics import (
    calculate_energy, calculate_average_power, calculate_peak_power,
    calculate_specific_yield, calculate_irradiation,
    calculate_temperature_stats, calculate_data_coverage,
    MetricResult,
)
from app.analytics.performance_ratio import calculate_performance_ratio
from app.analytics.resampling import build_chart_series
from app.analytics.formula_registry import FORMULA_VERSION
from app.analytics.anomalies import run_all_rules
from app.analytics.comparison import compare_metrics, calculate_correlation
from app.services.readings import parse_datetime_param

logger = logging.getLogger(__name__)

_readings = ReadingsRepository()
_systems = SystemsRepository()
_runs = AnalysisRunsRepository()

INTERVAL_MINUTES = {"5m": 5, "15m": 15, "30m": 30, "1h": 60, "1d": 1440}


async def create_analysis_run(
    workspace_id: str,
    system_id: str,
    start: datetime,
    end: datetime,
    interval: str = "15m",
    quality: str = "valid",
    actor: dict | None = None,
) -> dict:
    """
    Run all analytics for the given system + period and persist the result.
    """
    # Verify system belongs to workspace
    system = await _systems.get(workspace_id, system_id)
    if not system:
        raise NotFoundError("Solar system")

    dc_capacity_kwp: float | None = system.get("dc_capacity_kwp")
    site_id = system.get("site_id", "")

    # Fetch readings (unlimited for analytics)
    readings = await _readings.fetch_for_analytics(
        workspace_id, system_id, start, end, quality
    )

    # Expected interval count
    interval_min = INTERVAL_MINUTES.get(interval, 15)
    expected_count = max(1, int((end - start).total_seconds() / 60 / interval_min))

    # ── Run all metrics ──────────────────────────────────────────────
    energy_result = calculate_energy(readings, interval, expected_count)
    avg_power_result = calculate_average_power(readings, expected_count)
    peak_power_result = calculate_peak_power(readings)
    irradiation_result = calculate_irradiation(readings, interval, expected_count)
    coverage_result = calculate_data_coverage(len(readings), expected_count, interval)

    specific_yield_result = calculate_specific_yield(
        energy_kwh=energy_result.value,
        dc_capacity_kwp=dc_capacity_kwp,
        energy_result=energy_result,
    )

    pr_result = calculate_performance_ratio(
        ac_energy_kwh=energy_result.value,
        dc_capacity_kwp=dc_capacity_kwp,
        h_poa_kwh_m2=irradiation_result.value,
        energy_is_estimated=energy_result.is_estimated,
        sensor_plane_known=True,
    )

    ambient_temp_result = calculate_temperature_stats(readings, "ambient_temp_c")
    module_temp_result = calculate_temperature_stats(readings, "module_temp_c")

    # Collect all warnings
    all_warnings: list[str] = []
    for r in [energy_result, irradiation_result, pr_result, coverage_result]:
        all_warnings.extend(r.warnings)

    metrics = {
        "energy_kwh": energy_result.to_dict(),
        "specific_yield": specific_yield_result.to_dict(),
        "performance_ratio": pr_result.to_dict(),
        "irradiation": irradiation_result.to_dict(),
        "peak_power_kw": peak_power_result.to_dict(),
        "avg_power_kw": avg_power_result.to_dict(),
        "data_coverage": coverage_result.to_dict(),
        "avg_ambient_temp_c": ambient_temp_result.to_dict(),
        "avg_module_temp_c": module_temp_result.to_dict(),
    }

    filter_snapshot = {
        "site_id": site_id,
        "system_id": system_id,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "interval": interval,
        "quality": quality,
    }

    # Persist
    run_id = await _runs.create(workspace_id, {
        "system_id": system_id,
        "site_id": site_id,
        "filter_snapshot": filter_snapshot,
        "metrics": metrics,
        "formula_version": FORMULA_VERSION,
        "warnings": list(set(all_warnings)),
        "sample_count": len(readings),
        "actor_id": (actor or {}).get("sub", ""),
    })

    logger.info(
        "Analysis run created: id=%s system=%s period=%s→%s readings=%d",
        run_id, system_id,
        start.date(), end.date(), len(readings),
    )

    run = await _runs.get(workspace_id, run_id)
    result = _serialize_run(run)

    # Run anomaly detection (non-blocking — failures don't fail the analysis)
    try:
        from app.services.alerts import process_anomalies
        anomalies = run_all_rules(readings, dc_capacity_kwp, expected_count, system_id)
        if anomalies:
            alert_ids = await process_anomalies(
                workspace_id, system_id, site_id, run_id, anomalies
            )
            result["alert_ids"] = alert_ids
            logger.info("Anomaly detection: %d rules triggered, %d alerts", len(anomalies), len(alert_ids))
    except Exception:
        logger.exception("Anomaly detection failed for run %s — continuing", run_id)

    # Correlation
    try:
        corr = calculate_correlation(readings)
        result["correlation"] = corr.to_dict()
    except Exception:
        result["correlation"] = None

    return result


async def get_analysis_run(workspace_id: str, run_id: str) -> dict:
    run = await _runs.get(workspace_id, run_id)
    if not run:
        raise NotFoundError("Analysis run")
    return _serialize_run(run)


async def list_analysis_runs(workspace_id: str, system_id: str) -> list[dict]:
    runs = await _runs.list_for_system(workspace_id, system_id)
    return [_serialize_run(r) for r in runs]


def _serialize_run(run: dict) -> dict:
    created_at = run.get("created_at")
    if isinstance(created_at, datetime):
        created_at = created_at.isoformat()
    return {
        "id": str(run.get("id", run.get("_id", ""))),
        "workspace_id": run.get("workspace_id", ""),
        "system_id": run.get("system_id", ""),
        "site_id": run.get("site_id", ""),
        "filter_snapshot": run.get("filter_snapshot", {}),
        "metrics": run.get("metrics", {}),
        "formula_version": run.get("formula_version", FORMULA_VERSION),
        "warnings": run.get("warnings", []),
        "sample_count": run.get("sample_count", 0),
        "created_at": created_at,
    }
