"""
Normalizer — converts raw CSV values to canonical units and UTC timestamps.

Rules:
  - Timestamps → UTC (always). Display uses site timezone (never stored).
  - Power → kW (convert W→kW if source unit is W)
  - Energy → kWh per interval (handle cumulative meter with delta conversion)
  - Irradiance → W/m²
  - Temperatures → °C (convert °F→°C if source unit is °F)
"""
from __future__ import annotations
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import re
import logging

logger = logging.getLogger(__name__)

# ── Timestamp formats (tried in order) ───────────────────────────────
_TS_FORMATS = [
    "%Y-%m-%dT%H:%M:%S%z",          # ISO-8601 with TZ offset
    "%Y-%m-%dT%H:%M:%SZ",           # UTC explicit
    "%Y-%m-%dT%H:%M:%S",            # No TZ → requires source_timezone
    "%Y-%m-%d %H:%M:%S",            # Space-separated, no TZ
    "%Y-%m-%d %H:%M",
    "%d/%m/%Y %H:%M:%S",            # Indian dd/mm/yyyy
    "%d/%m/%Y %H:%M",
    "%d-%m-%Y %H:%M:%S",
    "%d-%m-%Y %H:%M",
    "%m/%d/%Y %H:%M:%S",            # US format
    "%m/%d/%Y %H:%M",
    "%Y%m%d%H%M%S",                 # Compact
]


def parse_timestamp(raw: str, source_timezone: str = "UTC") -> datetime | None:
    """
    Parse a timestamp string → UTC-aware datetime.
    If the string has no timezone, source_timezone is applied before converting to UTC.
    Returns None if unparseable.
    """
    if not raw or not raw.strip():
        return None
    raw = raw.strip()

    for fmt in _TS_FORMATS:
        try:
            dt = datetime.strptime(raw, fmt)
            if dt.tzinfo is None:
                # Assume source_timezone
                try:
                    tz = ZoneInfo(source_timezone)
                    dt = dt.replace(tzinfo=tz)
                except Exception:
                    dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except ValueError:
            continue

    logger.debug("Could not parse timestamp: %r", raw)
    return None


# ── Numeric parsing ───────────────────────────────────────────────────
def parse_float(raw: str | None) -> float | None:
    if not raw:
        return None
    cleaned = raw.strip().replace(",", "")  # handle "1,234.56"
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return None


# ── Unit normalization ────────────────────────────────────────────────
def normalize_power(raw: str | None, source_unit: str = "kW") -> float | None:
    value = parse_float(raw)
    if value is None:
        return None
    unit = source_unit.strip().lower()
    if unit in ("w", "watts"):
        return value / 1000.0
    if unit in ("mw",):
        return value * 1000.0
    return value  # already kW


def normalize_energy(raw: str | None, source_unit: str = "kWh") -> float | None:
    value = parse_float(raw)
    if value is None:
        return None
    unit = source_unit.strip().lower()
    if unit in ("wh", "watthour", "watt-hour"):
        return value / 1000.0
    if unit in ("mwh",):
        return value * 1000.0
    return value  # already kWh


def normalize_irradiance(raw: str | None, source_unit: str = "W/m2") -> float | None:
    value = parse_float(raw)
    if value is None:
        return None
    unit = source_unit.strip().lower().replace(" ", "").replace("²", "2")
    if unit in ("kw/m2", "kwm2"):
        return value * 1000.0
    return value  # already W/m²


def normalize_temperature(raw: str | None, source_unit: str = "C") -> float | None:
    value = parse_float(raw)
    if value is None:
        return None
    unit = source_unit.strip().upper().lstrip("°")
    if unit == "F":
        return (value - 32) * 5 / 9
    if unit == "K":
        return value - 273.15
    return value  # already °C


# ── Cumulative meter → interval energy ───────────────────────────────
def cumulative_to_interval(values: list[float | None]) -> list[float | None]:
    """
    Convert cumulative meter readings to per-interval energy.
    Handles meter resets (delta < 0 → treat as new meter start).
    First interval has no previous → returns None.
    """
    intervals: list[float | None] = []
    prev = None
    for v in values:
        if v is None:
            intervals.append(None)
            prev = None
        elif prev is None:
            intervals.append(None)   # first row: no prior value
            prev = v
        else:
            delta = v - prev
            if delta < 0:
                # Meter reset detected
                intervals.append(None)
                logger.debug("Meter reset detected at value=%.3f (prev=%.3f)", v, prev)
            else:
                intervals.append(delta)
            prev = v
    return intervals


# ── Type inference for preview ────────────────────────────────────────
def infer_column_type(samples: list[str]) -> str:
    """
    Given a list of sample cell values, infer the likely data type.
    Returns: 'timestamp' | 'number' | 'text' | 'empty'
    """
    non_empty = [s for s in samples if s and s.strip()]
    if not non_empty:
        return "empty"

    # Test for timestamp
    ts_hits = sum(1 for s in non_empty[:5] if parse_timestamp(s) is not None)
    if ts_hits / max(len(non_empty[:5]), 1) > 0.5:
        return "timestamp"

    # Test for numeric
    def is_num(s: str) -> bool:
        try:
            float(s.strip().replace(",", ""))
            return True
        except ValueError:
            return False

    num_hits = sum(1 for s in non_empty[:5] if is_num(s))
    if num_hits / max(len(non_empty[:5]), 1) > 0.7:
        return "number"

    return "text"
