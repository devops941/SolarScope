"""
Reports service — orchestrates report creation and retrieval.

Report lifecycle: queued → generating → ready | failed
"""
import logging
from datetime import datetime, timezone
from app.core.errors import NotFoundError, ValidationError
from app.repositories.reports import ReportsRepository
from app.repositories.analysis_runs import AnalysisRunsRepository
from app.domain.enums import ReportStatus, ReportFormat

logger = logging.getLogger(__name__)

_reports = ReportsRepository()
_runs = AnalysisRunsRepository()

VALID_FORMATS = {f.value for f in ReportFormat}


async def create_report(
    workspace_id: str,
    analysis_run_id: str,
    report_format: str,
    title: str | None,
    actor: dict,
) -> dict:
    """
    Create a report record and return it (status=queued).
    Caller must start the background worker after calling this.
    """
    if report_format not in VALID_FORMATS:
        raise ValidationError(f"Format '{report_format}' is not supported. Valid: {VALID_FORMATS}")

    # Verify analysis run exists
    run = await _runs.get(workspace_id, analysis_run_id)
    if not run:
        raise NotFoundError("Analysis run")

    report_id = await _reports.create(workspace_id, {
        "analysis_run_id": analysis_run_id,
        "format": report_format,
        "title": title or _default_title(run, report_format),
        "actor_id": actor.get("sub", ""),
        "filter_snapshot": run.get("filter_snapshot", {}),
    })
    return await get_report(workspace_id, report_id)


async def get_report(workspace_id: str, report_id: str) -> dict:
    report = await _reports.get(workspace_id, report_id)
    if not report:
        raise NotFoundError("Report")
    return _serialize(report)


async def list_reports(workspace_id: str, page: int = 1, page_size: int = 50) -> dict:
    skip = (page - 1) * page_size
    items = await _reports.list_for_workspace(workspace_id, skip=skip, limit=page_size)
    total = await _reports.count_scoped(workspace_id)
    return {
        "items": [_serialize(r) for r in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, -(-total // page_size)),
    }


async def get_download_path(workspace_id: str, report_id: str) -> str:
    report = await _reports.get(workspace_id, report_id)
    if not report:
        raise NotFoundError("Report")
    if report.get("status") != ReportStatus.READY.value:
        raise ValidationError(f"Report is not ready (status: {report.get('status')})")
    file_path = report.get("file_path")
    if not file_path:
        raise NotFoundError("Report file")
    return file_path


def _default_title(run: dict, fmt: str) -> str:
    snap = run.get("filter_snapshot", {})
    start = snap.get("start", "")[:10]
    end = snap.get("end", "")[:10]
    return f"SolarScope {fmt.upper()} Report — {start} to {end}"


def _serialize(r: dict) -> dict:
    created = r.get("created_at")
    generated = r.get("generated_at")
    return {
        "id": str(r.get("id", r.get("_id", ""))),
        "workspace_id": r.get("workspace_id", ""),
        "analysis_run_id": r.get("analysis_run_id", ""),
        "format": r.get("format", "pdf"),
        "title": r.get("title", ""),
        "status": r.get("status", ReportStatus.QUEUED.value),
        "file_size_bytes": r.get("file_size_bytes"),
        "error_message": r.get("error_message"),
        "filter_snapshot": r.get("filter_snapshot", {}),
        "created_at": str(created) if created else None,
        "generated_at": str(generated) if generated else None,
    }
