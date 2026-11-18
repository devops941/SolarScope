"""
Report worker — generates PDF / CSV exports in the background.

Flow: queued → generating → ready | failed

The worker fetches the analysis run from DB, retrieves readings,
calls the appropriate generator, saves the file, and updates the report status.
"""
import logging
import os
from pathlib import Path
from datetime import datetime, timezone

from app.repositories.reports import ReportsRepository
from app.repositories.analysis_runs import AnalysisRunsRepository
from app.repositories.readings import ReadingsRepository
from app.repositories.systems import SystemsRepository
from app.repositories.sites import SitesRepository
from app.domain.enums import ReportStatus
from app.reports.csv_exporter import export_metrics_csv, export_time_series_csv
from app.reports.pdf_generator import generate_pdf_report
from app.services.readings import parse_datetime_param

logger = logging.getLogger(__name__)

_reports = ReportsRepository()
_runs = AnalysisRunsRepository()
_readings = ReadingsRepository()
_systems = SystemsRepository()
_sites = SitesRepository()


def _reports_dir() -> Path:
    from app.core.config import get_settings
    settings = get_settings()
    base = settings.UPLOAD_DIR
    if base.startswith("/tmp") and os.name == "nt":
        base = os.path.join(os.path.expanduser("~"), "solarscope_uploads")
    path = Path(base) / "reports"
    path.mkdir(parents=True, exist_ok=True)
    return path


async def generate_report(report_id: str, workspace_id: str) -> None:
    """Entry point for background report generation."""
    report = await _reports.get(workspace_id, report_id)
    if not report:
        logger.error("Report not found: %s", report_id)
        return

    if report.get("status") not in (ReportStatus.QUEUED.value,):
        logger.warning("Report %s not in queued state (%s), skipping", report_id, report.get("status"))
        return

    await _reports.update_status(report_id, ReportStatus.GENERATING)

    try:
        await _do_generate(report, report_id, workspace_id)
    except Exception:
        logger.exception("Report generation failed: %s", report_id)
        await _reports.update_status(report_id, ReportStatus.FAILED,
                                     error_message="Unexpected error during report generation.")


async def _do_generate(report: dict, report_id: str, workspace_id: str) -> None:
    report_format = report.get("format", "pdf")
    analysis_run_id = report.get("analysis_run_id", "")

    # Fetch analysis run
    run = await _runs.get(workspace_id, analysis_run_id)
    if not run:
        await _reports.update_status(report_id, ReportStatus.FAILED,
                                     error_message=f"Analysis run not found: {analysis_run_id}")
        return

    snap = run.get("filter_snapshot", {})
    system_id = snap.get("system_id") or run.get("system_id", "")
    site_id = snap.get("site_id") or run.get("site_id", "")

    # Fetch system and site for PDF context
    system = await _systems.get(workspace_id, system_id) or {}
    site = await _sites.get(workspace_id, site_id) or {}

    # Generate file bytes
    if report_format == "metrics_csv":
        file_bytes = export_metrics_csv(run)
        ext = "csv"
    elif report_format == "readings_csv":
        # Fetch readings using the run's filter snapshot
        try:
            start_dt = parse_datetime_param(snap.get("start", "2026-01-01T00:00:00Z"))
            end_dt = parse_datetime_param(snap.get("end", "2026-12-31T23:59:59Z"))
        except Exception:
            start_dt = datetime(2026, 1, 1, tzinfo=timezone.utc)
            end_dt = datetime(2026, 12, 31, tzinfo=timezone.utc)

        readings = await _readings.fetch_for_analytics(
            workspace_id, system_id, start_dt, end_dt,
            quality=snap.get("quality", "valid"),
        )
        file_bytes = export_time_series_csv(readings, snap)
        ext = "csv"
    else:
        # PDF (default)
        file_bytes = generate_pdf_report(run, system, site)
        ext = "pdf"

    # Save to disk
    report_dir = _reports_dir() / workspace_id
    report_dir.mkdir(exist_ok=True)
    file_path = report_dir / f"{report_id}.{ext}"
    file_path.write_bytes(file_bytes)

    await _reports.update_status(
        report_id, ReportStatus.READY,
        file_path=str(file_path),
        file_size_bytes=len(file_bytes),
    )
    logger.info("Report %s generated: %d bytes, format=%s", report_id, len(file_bytes), report_format)
