"""
Readings service — query, gap detection, coverage, and manual reading creation.

Data flow:
  Phase 6 worker writes normalized readings → this service exposes them for the UI.
  Every query is scoped to workspace_id from the auth token.
"""
from __future__ import annotations
import csv
import io
import logging
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.errors import NotFoundError, ValidationError
from app.repositories.readings import ReadingsRepository
from app.repositories.imports import ImportsRepository
from app.repositories.systems import SystemsRepository
from app.ingestion.normalizer import parse_timestamp
from app.domain.enums import ImportStatus
from pymongo import ASCENDING, DESCENDING

logger = logging.getLogger(__name__)

_readings = ReadingsRepository()
_imports = ImportsRepository()
_systems = SystemsRepository()

INTERVAL_TO_MINUTES = {"5m": 5, "15m": 15, "30m": 30, "1h": 60, "1d": 1440}


# ── List readings ─────────────────────────────────────────────────────
async def list_readings(
    workspace_id: str,
    system_id: str,
    start: datetime,
    end: datetime,
    quality: str = "all",
    import_id: str | None = None,
    page: int = 1,
    page_size: int = 50,
    sort_order: str = "asc",
    interval: str = "15m",
) -> dict:
    sort = ASCENDING if sort_order == "asc" else DESCENDING
    skip = (page - 1) * page_size

    items, total = await _readings.query(
        workspace_id=workspace_id,
        system_id=system_id,
        start_utc=start,
        end_utc=end,
        quality_filter=quality,
        import_id=import_id,
        skip=skip,
        limit=page_size,
        sort_order=sort,
    )

    # Coverage stats
    interval_minutes = INTERVAL_TO_MINUTES.get(interval, 15)
    expected = max(1, int((end - start).total_seconds() / 60 / interval_minutes))
    actual_total = await _readings.count_in_range(workspace_id, system_id, start, end)
    coverage_pct = round(min(100.0, actual_total / expected * 100), 1)
    missing_intervals = max(0, expected - actual_total)

    # Enrich with import filenames
    enriched = []
    import_cache: dict[str, str] = {}
    for doc in items:
        import_id_ref = doc.get("source_import_id", "")
        if import_id_ref and import_id_ref not in import_cache:
            imp = await _imports.col.find_one({"_id": __import_oid(import_id_ref)})
            import_cache[import_id_ref] = imp.get("filename", "unknown") if imp else "unknown"
        enriched.append({
            **_serialize_reading(doc),
            "source_filename": import_cache.get(import_id_ref, ""),
        })

    return {
        "items": enriched,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, -(-total // page_size)),
        "coverage_pct": coverage_pct,
        "missing_intervals": missing_intervals,
    }


# ── Export CSV ────────────────────────────────────────────────────────
async def export_readings_csv(
    workspace_id: str,
    system_id: str,
    start: datetime,
    end: datetime,
    quality: str = "all",
    import_id: str | None = None,
) -> bytes:
    """Export all matching readings as CSV bytes (no pagination limit)."""
    items, _ = await _readings.query(
        workspace_id=workspace_id,
        system_id=system_id,
        start_utc=start,
        end_utc=end,
        quality_filter=quality,
        import_id=import_id,
        limit=100_000,
        sort_order=ASCENDING,
    )

    fieldnames = [
        "timestamp_utc", "power_kw", "interval_energy_kwh",
        "irradiance_w_m2", "ambient_temp_c", "module_temp_c",
        "voltage_v", "current_a", "inverter_status",
        "quality", "source_import_id",
    ]
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for doc in items:
        row = _serialize_reading(doc)
        row["timestamp_utc"] = row["timestamp_utc"]
        row["quality"] = ",".join(row.get("quality") or ["valid"])
        writer.writerow(row)
    return buf.getvalue().encode("utf-8")


# ── Gap detection ─────────────────────────────────────────────────────
async def detect_gaps(
    workspace_id: str,
    system_id: str,
    start: datetime,
    end: datetime,
    interval_minutes: int = 15,
) -> dict:
    """
    Compare actual timestamps against the expected regular grid.
    Returns missing count and coverage percentage.
    """
    # Fetch all timestamps in range (project only timestamp_utc)
    from app.core.database import get_db
    db = get_db()
    cursor = db["readings"].find(
        {
            "workspace_id": workspace_id,
            "system_id": system_id,
            "timestamp_utc": {"$gte": start, "$lte": end},
        },
        {"timestamp_utc": 1, "_id": 0},
    )
    docs = await cursor.to_list(length=100_000)
    actual_times: set[datetime] = {d["timestamp_utc"].replace(tzinfo=timezone.utc)
                                   if d["timestamp_utc"].tzinfo is None
                                   else d["timestamp_utc"]
                                   for d in docs}

    # Build expected grid
    step = timedelta(minutes=interval_minutes)
    expected_times: list[datetime] = []
    t = start
    while t <= end:
        expected_times.append(t)
        t += step

    if not expected_times:
        return {"missing_count": 0, "coverage_pct": 100.0, "expected_count": 0, "actual_count": 0}

    missing = [t for t in expected_times if t not in actual_times]
    coverage = round(len(actual_times) / len(expected_times) * 100, 1)

    return {
        "missing_count": len(missing),
        "coverage_pct": min(100.0, coverage),
        "expected_count": len(expected_times),
        "actual_count": len(actual_times),
    }


# ── Manual reading ────────────────────────────────────────────────────
async def create_manual_reading(
    workspace_id: str,
    system_id: str,
    site_id: str,
    actor: dict,
    data: dict,
) -> dict:
    """Create a single manually-entered observation."""
    ts_raw = data.get("timestamp_local", "")
    source_tz = data.get("source_timezone", "UTC")
    dt_utc = parse_timestamp(ts_raw, source_tz)
    if not dt_utc:
        raise ValidationError(f"Cannot parse timestamp: {ts_raw!r}")

    power_kw = data.get("power_kw")
    energy_kwh = data.get("energy_kwh")
    if power_kw is None and energy_kwh is None:
        raise ValidationError("At least one of power_kw or energy_kwh is required.")
    if power_kw is not None and power_kw < 0:
        raise ValidationError("power_kw cannot be negative.")

    doc = {
        "workspace_id": workspace_id,
        "site_id": site_id,
        "system_id": system_id,
        "timestamp_utc": dt_utc,
        "power_kw": power_kw,
        "interval_energy_kwh": energy_kwh,
        "irradiance_w_m2": data.get("irradiance_w_m2"),
        "ambient_temp_c": data.get("ambient_temp_c"),
        "module_temp_c": data.get("module_temp_c"),
        "voltage_v": None,
        "current_a": None,
        "inverter_status": "MANUAL",
        "quality": ["manual"],
        "source_import_id": f"manual:{actor.get('sub', 'unknown')}",
        "notes": data.get("notes"),
    }

    from app.core.database import get_db
    result = await get_db()["readings"].update_one(
        {"system_id": system_id, "timestamp_utc": dt_utc},
        {"$set": doc},
        upsert=True,
    )
    reading_id = str(result.upserted_id) if result.upserted_id else ""
    return _serialize_reading({**doc, "_id": result.upserted_id or "manual"})


# ── Helpers ───────────────────────────────────────────────────────────
def _serialize_reading(doc: dict) -> dict:
    ts = doc.get("timestamp_utc")
    if isinstance(ts, datetime):
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        ts_str = ts.isoformat()
    else:
        ts_str = str(ts) if ts else ""

    return {
        "id": str(doc.get("id") or doc.get("_id") or ""),
        "system_id": doc.get("system_id", ""),
        "site_id": doc.get("site_id", ""),
        "workspace_id": doc.get("workspace_id", ""),
        "timestamp_utc": ts_str,
        "power_kw": doc.get("power_kw"),
        "interval_energy_kwh": doc.get("interval_energy_kwh"),
        "irradiance_w_m2": doc.get("irradiance_w_m2"),
        "ambient_temp_c": doc.get("ambient_temp_c"),
        "module_temp_c": doc.get("module_temp_c"),
        "voltage_v": doc.get("voltage_v"),
        "current_a": doc.get("current_a"),
        "inverter_status": doc.get("inverter_status"),
        "quality": doc.get("quality", ["valid"]),
        "source_import_id": doc.get("source_import_id", ""),
    }


def __import_oid(id_str: str):
    from bson import ObjectId
    try:
        return ObjectId(id_str)
    except Exception:
        return None


def parse_datetime_param(value: str) -> datetime:
    """Parse ISO 8601 datetime string from query param → UTC datetime."""
    if not value:
        raise ValidationError("datetime parameter is required")
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except (ValueError, TypeError):
        raise ValidationError(f"Cannot parse datetime: {value!r}. Use ISO 8601 format.")
