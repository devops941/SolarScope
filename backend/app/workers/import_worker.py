"""
Import worker — processes a confirmed import in the background.

Pipeline:
  queued → processing → completed | completed_with_warnings | failed

Steps per import:
  1. Load file bytes from disk
  2. Parse CSV → headers + rows (all rows, not just preview)
  3. Apply column mapping stored in import record
  4. Validate each row (10 rules)
  5. Normalize accepted rows (timestamp→UTC, units)
  6. Bulk-upsert to readings in batches of 500 (idempotent)
  7. Apply duplicate policy (skip | replace | reject)
  8. Save rejected-row CSV to disk
  9. Update import counts and status
"""
from __future__ import annotations
import csv
import io
import logging
from datetime import datetime, timezone
from pathlib import Path
from itertools import islice

from app.core.database import get_db
from app.repositories.imports import ImportsRepository
from app.repositories.readings import ReadingsRepository
from app.ingestion.parser import parse_csv_bytes
from app.ingestion.mapper import apply_mapping
from app.ingestion.validators import validate_row
from app.ingestion.deduplicator import InMemoryDupeTracker, apply_duplicate_policy
from app.domain.enums import ImportStatus

logger = logging.getLogger(__name__)

_imports = ImportsRepository()
_readings = ReadingsRepository()

BATCH_SIZE = 500

ERROR_CSV_HEADERS = [
    "source_row_number", "timestamp", "power_kw", "energy_kwh",
    "irradiance_w_m2", "ambient_temp_c", "module_temp_c",
    "voltage_v", "current_a", "inverter_status",
    "import_status", "error_code", "error_message",
]


async def process_import(import_id: str, workspace_id: str) -> None:
    """
    Entry point for the background import worker.
    Safe to call multiple times — idempotent via upsert on (system_id, timestamp_utc).
    """
    logger.info("Import worker started: import_id=%s", import_id)

    # Fetch import record
    imp = await _imports.get(workspace_id, import_id)
    if not imp:
        logger.error("Import not found: %s", import_id)
        return

    # Guard: only process queued imports
    if imp.get("status") != ImportStatus.QUEUED.value:
        logger.warning("Import %s is not queued (status=%s), skipping", import_id, imp.get("status"))
        return

    # Mark as processing
    await _imports.update_status(import_id, ImportStatus.PROCESSING)

    try:
        await _run_import(imp, import_id, workspace_id)
    except Exception:
        logger.exception("Import worker failed for import_id=%s", import_id)
        await _imports.update_status(import_id, ImportStatus.FAILED)


async def _run_import(imp: dict, import_id: str, workspace_id: str) -> None:
    file_path = imp.get("file_path", "")
    system_id = imp.get("system_id", "")
    site_id = imp.get("site_id", "")
    source_timezone = imp.get("source_timezone", "UTC")
    duplicate_policy = imp.get("duplicate_policy", "skip")
    energy_mode = imp.get("energy_mode", "interval")
    mapping_list: list[dict] = imp.get("mapping", [])

    # Read file
    try:
        file_bytes = Path(file_path).read_bytes()
    except Exception as e:
        logger.error("Cannot read file %s: %s", file_path, e)
        await _imports.update_status(import_id, ImportStatus.FAILED)
        return

    # Parse ALL rows (no limit)
    headers, raw_rows = parse_csv_bytes(file_bytes, max_rows=1_000_000)

    # Build mapping dict: source_col → canonical_col
    # Fallback to auto-detection if no explicit mapping was provided
    if mapping_list:
        mapping = {m["source_column"]: m["canonical_column"] for m in mapping_list if m.get("canonical_column")}
    else:
        from app.ingestion.mapper import suggest_mapping
        auto = suggest_mapping(headers)
        mapping = {k: v for k, v in auto.items() if v}
        logger.info("Auto-detected mapping for import %s: %s", import_id, mapping)

    counts = {"total": len(raw_rows), "accepted": 0, "rejected": 0, "skipped": 0, "flagged": 0}
    error_rows: list[dict] = []
    dupe_tracker = InMemoryDupeTracker()

    # Cumulative energy tracking (if energy_mode == "cumulative")
    prev_cumulative: float | None = None

    # Process in batches
    batch_accepted: list[dict] = []

    for i, raw_row in enumerate(raw_rows):
        row_number = i + 2  # header = row 1

        # Apply mapping
        mapped = apply_mapping(raw_row, mapping)

        # Handle cumulative energy conversion
        if energy_mode == "cumulative" and mapped.get("energy_kwh"):
            curr = _safe_float(mapped["energy_kwh"])
            if curr is not None and prev_cumulative is not None:
                delta = curr - prev_cumulative
                mapped["energy_kwh"] = str(max(0, delta)) if delta >= 0 else None
            prev_cumulative = _safe_float(mapped.get("energy_kwh"))

        # Validate
        result = validate_row(
            row_number=row_number,
            mapped_row=mapped,
            source_timezone=source_timezone,
            original_values=raw_row,
            system_id=system_id,
        )

        if result.status == "rejected":
            counts["rejected"] += 1
            error_rows.append({
                **result.original_values,
                "source_row_number": row_number,
                "import_status": "rejected",
                "error_code": result.error_code,
                "error_message": result.error_message,
            })
            continue

        ts_utc: datetime = result.normalized["timestamp_utc"]

        # Check intra-file duplicate
        intra_dup = dupe_tracker.is_duplicate(system_id, ts_utc)
        # (DB-level dup check is handled implicitly by upsert)
        action = apply_duplicate_policy(
            policy=duplicate_policy,
            is_intra_file_dup=intra_dup,
            is_db_dup=False,  # resolved at upsert time
        )

        if action == "skip":
            counts["skipped"] += 1
            continue
        elif action == "reject":
            counts["rejected"] += 1
            error_rows.append({
                **result.original_values,
                "source_row_number": row_number,
                "import_status": "skipped_duplicate",
                "error_code": "DUPLICATE_TIMESTAMP",
                "error_message": f"Timestamp {ts_utc.isoformat()} already exists in this import",
            })
            continue

        dupe_tracker.mark_seen(system_id, ts_utc)

        # Build reading document
        reading = {
            "workspace_id": workspace_id,
            "site_id": site_id,
            "system_id": system_id,
            "timestamp_utc": ts_utc,
            "power_kw": result.normalized.get("power_kw"),
            "interval_energy_kwh": result.normalized.get("interval_energy_kwh"),
            "irradiance_w_m2": result.normalized.get("irradiance_w_m2"),
            "ambient_temp_c": result.normalized.get("ambient_temp_c"),
            "module_temp_c": result.normalized.get("module_temp_c"),
            "voltage_v": result.normalized.get("voltage_v"),
            "current_a": result.normalized.get("current_a"),
            "inverter_status": result.normalized.get("inverter_status"),
            "quality": result.normalized.get("quality", ["valid"]),
            "source_import_id": import_id,
        }
        batch_accepted.append(reading)

        if result.status == "flagged":
            counts["flagged"] += 1
        else:
            counts["accepted"] += 1

        # Flush batch
        if len(batch_accepted) >= BATCH_SIZE:
            await _flush_batch(batch_accepted, import_id, duplicate_policy)
            batch_accepted = []
            # Update progress
            await _imports.update_counts(import_id, counts)

    # Flush remaining
    if batch_accepted:
        await _flush_batch(batch_accepted, import_id, duplicate_policy)

    counts["total"] = len(raw_rows)
    await _imports.update_counts(import_id, counts)

    # Save error CSV
    error_file_path = ""
    if error_rows:
        error_file_path = _save_error_csv(error_rows, imp.get("file_path", ""), import_id)
        await _imports.update_error_file(import_id, error_file_path)

    # Final status
    has_issues = counts["rejected"] > 0 or counts["flagged"] > 0
    final_status = ImportStatus.COMPLETED_WITH_WARNINGS if has_issues else ImportStatus.COMPLETED
    await _imports.update_status(import_id, final_status)

    logger.info(
        "Import %s complete: accepted=%d rejected=%d skipped=%d flagged=%d",
        import_id, counts["accepted"], counts["rejected"], counts["skipped"], counts["flagged"],
    )


async def _flush_batch(readings: list[dict], import_id: str, policy: str = "replace") -> None:
    if not readings:
        return
    result = await _readings.bulk_upsert(readings, import_id, policy)
    logger.debug("Flushed batch: inserted=%d updated=%d", result["inserted"], result["updated"])


def _save_error_csv(error_rows: list[dict], original_file_path: str, import_id: str) -> str:
    """Save rejected rows to a CSV file next to the original upload."""
    base_dir = Path(original_file_path).parent if original_file_path else Path("/tmp")
    error_path = base_dir / f"{import_id}_errors.csv"

    # Collect all column names (original + meta)
    all_keys: set[str] = set()
    for row in error_rows:
        all_keys.update(row.keys())
    # Ensure error meta columns come last
    meta_cols = ["source_row_number", "import_status", "error_code", "error_message"]
    fieldnames = [k for k in all_keys if k not in meta_cols] + meta_cols

    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for row in error_rows:
        writer.writerow(row)

    error_path.write_text(buf.getvalue(), encoding="utf-8")
    return str(error_path)


def _safe_float(v: str | None) -> float | None:
    if not v:
        return None
    try:
        return float(v.strip())
    except (ValueError, AttributeError):
        return None


# ── Rollback helper ───────────────────────────────────────────────────
async def rollback_import_readings(import_id: str) -> int:
    """Delete all readings created by this import. Returns count deleted."""
    deleted = await _readings.delete_by_import(import_id)
    logger.info("Rolled back import %s: deleted %d readings", import_id, deleted)
    return deleted
