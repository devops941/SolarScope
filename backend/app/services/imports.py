"""
Imports service — file storage, checksum, duplicate detection, and preview orchestration.

Phase 5: upload → checksum → store → preview (NO DB writes to readings)
Phase 6: confirm → validate → batch write readings
"""
import hashlib
import os
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import get_settings
from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.repositories.imports import ImportsRepository
from app.ingestion.parser import parse_preview
from app.ingestion.template_generator import generate_template, generate_sample_30_days, generate_validation_cases
from app.domain.enums import ImportStatus

logger = logging.getLogger(__name__)

_imports = ImportsRepository()


# ── File storage ──────────────────────────────────────────────────────
def _uploads_dir() -> Path:
    settings = get_settings()
    upload_dir = settings.UPLOAD_DIR
    # On Windows, use a local path if the default /tmp path is used
    if upload_dir.startswith("/tmp") and os.name == "nt":
        upload_dir = os.path.join(os.path.expanduser("~"), "solarscope_uploads")
    path = Path(upload_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _compute_sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def _save_file(workspace_id: str, checksum: str, content: bytes, filename: str) -> str:
    ws_dir = _uploads_dir() / workspace_id
    ws_dir.mkdir(exist_ok=True)
    # Store as checksum.csv so identical files share storage
    dest = ws_dir / f"{checksum}.csv"
    if not dest.exists():
        dest.write_bytes(content)
    return str(dest)


def _load_file(file_path: str) -> bytes:
    return Path(file_path).read_bytes()


# ── Template / sample ─────────────────────────────────────────────────
def get_template_bytes() -> bytes:
    return generate_template()


def get_sample_bytes(variant: str = "clean") -> bytes:
    if variant == "validation":
        return generate_validation_cases()
    return generate_sample_30_days()


# ── Upload + preview ─────────────────────────────────────────────────
async def upload_and_preview(
    workspace_id: str,
    site_id: str,
    system_id: str,
    actor: dict,
    filename: str,
    file_content: bytes,
    source_timezone: str = "Asia/Kolkata",
) -> dict:
    """
    1. Compute SHA-256 checksum
    2. Check for duplicate upload in this workspace
    3. Save file to disk
    4. Create import record (status = preview_ready)
    5. Run preview (parse headers, suggest mapping, sample rows)
    6. Return preview payload
    """
    if len(file_content) == 0:
        raise ValidationError("Uploaded file is empty.")
    if len(file_content) > get_settings().UPLOAD_MAX_MB * 1024 * 1024:
        raise ValidationError(f"File exceeds maximum size of {get_settings().UPLOAD_MAX_MB} MB.")

    checksum = _compute_sha256(file_content)

    # Check for exact duplicate
    existing = await _imports.find_by_checksum(workspace_id, checksum)
    if existing and existing.get("status") not in (ImportStatus.FAILED.value, ImportStatus.ROLLED_BACK.value):
        raise ConflictError(
            f"This file was already uploaded on "
            f"{_fmt_date(existing.get('created_at'))}. "
            f"Import ID: {existing['id']}"
        )

    # Save file
    file_path = _save_file(workspace_id, checksum, file_content, filename)

    # Create import record
    import_id = await _imports.create(workspace_id, {
        "filename": filename,
        "checksum": checksum,
        "file_path": file_path,
        "site_id": site_id,
        "system_id": system_id,
        "actor": actor.get("email", ""),
        "actor_id": actor.get("sub", ""),
        "source_timezone": source_timezone,
        "status": ImportStatus.PREVIEW_READY.value,
        "mapping": {},
        "energy_mode": "interval",
        "interval_minutes": 15,
    })

    # Run preview
    preview_data = parse_preview(file_content, source_timezone=source_timezone, max_rows=50)

    # Update import record with suggested mapping
    await _imports.update_counts(import_id, preview_data["counts"])

    return {
        "import_id": import_id,
        "filename": filename,
        "checksum": checksum,
        "total_rows": preview_data["counts"]["total_sampled"],
        "headers": preview_data["headers"],
        "suggested_mapping": [
            {"source_column": k, "canonical_column": v}
            for k, v in preview_data["suggested_mapping"].items()
        ],
        "column_types": preview_data["column_types"],
        "sample_rows": preview_data["sample_rows"],
        "counts": preview_data["counts"],
        "status": ImportStatus.PREVIEW_READY.value,
    }


async def get_import(workspace_id: str, import_id: str) -> dict:
    imp = await _imports.get(workspace_id, import_id)
    if not imp:
        raise NotFoundError("Import")
    return imp


async def list_imports(workspace_id: str, page: int = 1, page_size: int = 50) -> dict:
    skip = (page - 1) * page_size
    items = await _imports.list_for_workspace(workspace_id, skip=skip, limit=page_size)
    total = await _imports.count_scoped(workspace_id)
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, -(-total // page_size)),
    }


# ── Phase 6: Confirm ──────────────────────────────────────────────────
async def confirm_import(
    workspace_id: str,
    import_id: str,
    actor: dict,
    duplicate_policy: str = "skip",
    column_mapping: list | None = None,
    source_timezone: str = "Asia/Kolkata",
    energy_mode: str = "interval",
) -> dict:
    """
    Validate that the import is in preview_ready state, update settings,
    and queue it for background processing.
    Returns the updated import record (status = queued).
    """
    imp = await _imports.get(workspace_id, import_id)
    if not imp:
        raise NotFoundError("Import")

    if imp.get("status") not in (
        ImportStatus.PREVIEW_READY.value, ImportStatus.AWAITING_CONFIRMATION.value
    ):
        raise ValidationError(
            f"Import cannot be confirmed from status '{imp.get('status')}'. "
            "It must be in preview_ready state."
        )

    # Store confirmed settings
    mapping = column_mapping or []
    await _imports.update_mapping(import_id, mapping, duplicate_policy, source_timezone, energy_mode)
    await _imports.update_status(import_id, ImportStatus.QUEUED)

    logger.info("Import %s queued by %s", import_id, actor.get("email"))
    return await get_import(workspace_id, import_id)


# ── Phase 6: Rollback ─────────────────────────────────────────────────
async def rollback_import(workspace_id: str, import_id: str, actor: dict) -> dict:
    """
    Revert an import: delete all readings created by this import.
    Only affects completed or completed_with_warnings imports.
    """
    from app.workers.import_worker import rollback_import_readings
    from app.services import audit as audit_svc

    imp = await _imports.get(workspace_id, import_id)
    if not imp:
        raise NotFoundError("Import")

    rollback_allowed = {
        ImportStatus.COMPLETED.value,
        ImportStatus.COMPLETED_WITH_WARNINGS.value,
    }
    if imp.get("status") not in rollback_allowed:
        raise ValidationError(
            f"Import cannot be rolled back from status '{imp.get('status')}'."
        )

    deleted = await rollback_import_readings(import_id)
    await _imports.update_status(import_id, ImportStatus.ROLLED_BACK)

    await audit_svc.log_event(
        workspace_id=workspace_id,
        actor_id=actor.get("sub", ""),
        actor_email=actor.get("email", ""),
        action="import.rollback",
        resource_type="import",
        resource_id=import_id,
        metadata={"readings_deleted": deleted},
    )
    logger.info("Import %s rolled back: %d readings deleted", import_id, deleted)
    return await get_import(workspace_id, import_id)


async def get_error_csv_path(workspace_id: str, import_id: str) -> str | None:
    """Return the error CSV file path if it exists."""
    imp = await _imports.get(workspace_id, import_id)
    if not imp:
        raise NotFoundError("Import")
    return imp.get("error_file_path")


def _fmt_date(dt) -> str:
    if dt is None:
        return "unknown date"
    if isinstance(dt, datetime):
        return dt.strftime("%d %b %Y")
    return str(dt)
