"""
CSV parser — reads raw file bytes into headers + rows.

Handles:
  - Auto-detects delimiter (comma, semicolon, tab, pipe)
  - Handles BOM (UTF-8 with BOM from Excel)
  - Strips whitespace from values
  - Returns up to max_rows for preview
"""
from __future__ import annotations
import csv
import io
import chardet
import logging
from app.ingestion.mapper import suggest_mapping, CANONICAL_COLUMNS
from app.ingestion.normalizer import infer_column_type

logger = logging.getLogger(__name__)

SUPPORTED_DELIMITERS = [",", ";", "\t", "|"]


def detect_encoding(raw_bytes: bytes) -> str:
    result = chardet.detect(raw_bytes[:8192])
    return result.get("encoding") or "utf-8"


def detect_delimiter(text: str) -> str:
    """Sniff the most common delimiter from the first few lines."""
    sample = "\n".join(text.splitlines()[:5])
    sniffer = csv.Sniffer()
    try:
        dialect = sniffer.sniff(sample, delimiters=",;\t|")
        return dialect.delimiter
    except csv.Error:
        # Fallback: count occurrences
        counts = {d: sample.count(d) for d in SUPPORTED_DELIMITERS}
        return max(counts, key=lambda k: counts[k])


def parse_csv_bytes(
    raw_bytes: bytes,
    max_rows: int = 50,
) -> tuple[list[str], list[dict[str, str]]]:
    """
    Parse raw CSV bytes into (headers, rows[:max_rows]).
    Handles encoding detection and BOM stripping.
    """
    encoding = detect_encoding(raw_bytes)
    try:
        text = raw_bytes.decode(encoding, errors="replace")
    except Exception:
        text = raw_bytes.decode("utf-8", errors="replace")

    # Strip BOM if present
    text = text.lstrip("﻿")

    delimiter = detect_delimiter(text)
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)

    headers: list[str] = reader.fieldnames or []  # type: ignore[assignment]
    rows: list[dict[str, str]] = []

    for i, row in enumerate(reader):
        if i >= max_rows:
            break
        # Strip whitespace from all values
        rows.append({k: (v or "").strip() for k, v in row.items()})

    return headers, rows


def parse_preview(
    raw_bytes: bytes,
    source_timezone: str = "Asia/Kolkata",
    max_rows: int = 50,
) -> dict:
    """
    Full preview pipeline:
    1. Parse CSV into headers + rows
    2. Suggest column mapping
    3. Infer column types
    4. Return structured preview payload
    """
    headers, rows = parse_csv_bytes(raw_bytes, max_rows)
    total_rows_sampled = len(rows)

    # Suggest mapping
    suggested = suggest_mapping(headers)

    # Infer types per column
    column_types: dict[str, str] = {}
    for h in headers:
        samples = [r.get(h, "") for r in rows[:10]]
        column_types[h] = infer_column_type(samples)

    # Build preview rows with status
    preview_rows = []
    for i, row in enumerate(rows):
        mapped = {suggested.get(h, ""): row.get(h, "") for h in headers if suggested.get(h, "")}
        status = "accepted"
        error = None

        # Quick timestamp check
        ts_val = mapped.get("timestamp")
        if not ts_val:
            status = "rejected"
            error = "Missing timestamp"
        elif not (mapped.get("power_kw") or mapped.get("energy_kwh")):
            status = "flagged"
            error = "No power or energy column mapped"

        preview_rows.append({
            "row_number": i + 2,  # 1-indexed, header is row 1
            "timestamp": mapped.get("timestamp"),
            "power_kw": mapped.get("power_kw"),
            "energy_kwh": mapped.get("energy_kwh"),
            "irradiance_w_m2": mapped.get("irradiance_w_m2"),
            "ambient_temp_c": mapped.get("ambient_temp_c"),
            "module_temp_c": mapped.get("module_temp_c"),
            "status": status,
            "error_code": "MISSING_TIMESTAMP" if status == "rejected" else None,
            "error_message": error,
        })

    accepted = sum(1 for r in preview_rows if r["status"] == "accepted")
    rejected = sum(1 for r in preview_rows if r["status"] == "rejected")
    flagged = sum(1 for r in preview_rows if r["status"] == "flagged")

    return {
        "headers": headers,
        "suggested_mapping": suggested,
        "column_types": column_types,
        "sample_rows": preview_rows,
        "counts": {
            "total_sampled": total_rows_sampled,
            "accepted": accepted,
            "rejected": rejected,
            "flagged": flagged,
        },
    }
