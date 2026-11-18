"""
Time-series resampling — aggregate fine-grained readings into coarser intervals.

Aggregation rules (from SolarScope spec):
  - power_kw:        time-weighted mean  (= arithmetic mean for equal intervals)
  - interval_energy_kwh: sum            (never average energy)
  - irradiance_w_m2: mean
  - ambient_temp_c:  mean
  - module_temp_c:   mean
  - voltage_v:       mean
  - current_a:       mean

CRITICAL: Never average energy values. Summing gives total production;
          averaging gives a meaningless per-interval number.
"""
from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Any


RESAMPLE_MINUTES = {
    "5m":  5,
    "15m": 15,
    "30m": 30,
    "1h":  60,
    "1d":  1440,
}


def _bucket_key(ts_utc: datetime, interval_minutes: int) -> datetime:
    """Round timestamp down to the nearest interval boundary."""
    epoch = datetime(1970, 1, 1, tzinfo=timezone.utc)
    delta = int((ts_utc - epoch).total_seconds() // 60)
    bucket_min = (delta // interval_minutes) * interval_minutes
    return epoch + timedelta(minutes=bucket_min)


def resample(
    readings: list[dict],
    target_interval: str = "1h",
) -> list[dict]:
    """
    Aggregate readings to a coarser interval.
    Returns a list of dicts with aggregated values.
    target_interval must be coarser than the source data interval.
    """
    if not readings:
        return []

    interval_minutes = RESAMPLE_MINUTES.get(target_interval, 60)

    # Group readings by bucket
    buckets: dict[datetime, list[dict]] = {}
    for r in readings:
        ts = r.get("timestamp_utc")
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except ValueError:
                continue
        if ts is None:
            continue
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        key = _bucket_key(ts, interval_minutes)
        buckets.setdefault(key, []).append(r)

    result: list[dict] = []
    for bucket_ts in sorted(buckets.keys()):
        group = buckets[bucket_ts]
        result.append(_aggregate_bucket(bucket_ts, group))

    return result


def _mean(vals: list[float]) -> float | None:
    cleaned = [v for v in vals if v is not None]
    return round(sum(cleaned) / len(cleaned), 4) if cleaned else None


def _sum_or_none(vals: list[float]) -> float | None:
    cleaned = [v for v in vals if v is not None]
    return round(sum(cleaned), 4) if cleaned else None


def _aggregate_bucket(bucket_ts: datetime, readings: list[dict]) -> dict:
    return {
        "timestamp_utc": bucket_ts.isoformat(),
        "power_kw":           _mean([r.get("power_kw") for r in readings]),
        "interval_energy_kwh": _sum_or_none([r.get("interval_energy_kwh") for r in readings]),
        "irradiance_w_m2":    _mean([r.get("irradiance_w_m2") for r in readings]),
        "ambient_temp_c":     _mean([r.get("ambient_temp_c") for r in readings]),
        "module_temp_c":      _mean([r.get("module_temp_c") for r in readings]),
        "voltage_v":          _mean([r.get("voltage_v") for r in readings]),
        "current_a":          _mean([r.get("current_a") for r in readings]),
        "sample_count":       len(readings),
    }


def build_chart_series(
    readings: list[dict],
    interval: str = "15m",
) -> list[dict]:
    """
    Build chart-ready time series. If interval = source interval, return as-is.
    Otherwise resample to target interval.
    """
    if not readings:
        return []
    # For visualization: include all readings (flagged + valid)
    # Resampling is only needed if requesting coarser interval
    source_minutes = RESAMPLE_MINUTES.get(interval, 15)
    # Detect source interval from first two readings
    if len(readings) >= 2:
        t1 = readings[0].get("timestamp_utc")
        t2 = readings[1].get("timestamp_utc")
        if t1 and t2:
            try:
                dt1 = datetime.fromisoformat(str(t1).replace("Z", "+00:00"))
                dt2 = datetime.fromisoformat(str(t2).replace("Z", "+00:00"))
                detected_minutes = int(abs((dt2 - dt1).total_seconds()) // 60)
                if detected_minutes >= source_minutes:
                    return [_to_chart_point(r) for r in readings]
            except (ValueError, TypeError):
                pass

    resampled = resample(readings, interval)
    return [_to_chart_point(r) for r in resampled]


def _to_chart_point(r: dict) -> dict:
    return {
        "timestamp_utc": r.get("timestamp_utc", ""),
        "generation_kw": r.get("power_kw"),
        "energy_kwh": r.get("interval_energy_kwh"),
        "irradiance_w_m2": r.get("irradiance_w_m2"),
        "ambient_temp_c": r.get("ambient_temp_c"),
        "module_temp_c": r.get("module_temp_c"),
    }
