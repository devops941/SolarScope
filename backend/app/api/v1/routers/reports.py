import os
from fastapi import APIRouter, BackgroundTasks, Depends, Query
from fastapi.responses import FileResponse, Response
from app.core.permissions import get_current_user, get_workspace_id, require_role
from app.core.errors import NotFoundError
from app.domain.enums import Role
from app.services.reports import create_report, get_report, list_reports, get_download_path
from app.workers.report_worker import generate_report

router = APIRouter(prefix="/reports", tags=["reports"])

CONTENT_TYPES = {
    "pdf": "application/pdf",
    "metrics_csv": "text/csv",
    "readings_csv": "text/csv",
}

FILE_EXTENSIONS = {
    "pdf": "pdf",
    "metrics_csv": "csv",
    "readings_csv": "csv",
}


@router.post("", status_code=201, summary="Create and queue a report")
async def create_report_endpoint(
    background_tasks: BackgroundTasks,
    analysis_run_id: str = Query(...),
    format: str = Query(default="pdf", description="pdf | metrics_csv | readings_csv"),
    title: str | None = Query(default=None),
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(require_role(Role.ANALYST)),
):
    """
    Create a report from a persisted analysis run.
    Returns immediately with status=queued; poll GET /reports/{id} for status.

    CRITICAL: All values come from the saved analysis run — never recalculated.
    """
    report = await create_report(workspace_id, analysis_run_id, format, title, user)
    background_tasks.add_task(generate_report, report["id"], workspace_id)
    return report


@router.get("", summary="List all reports")
async def list_reports_endpoint(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(get_current_user),
):
    return await list_reports(workspace_id, page, page_size)


@router.get("/{report_id}", summary="Get report status")
async def get_report_endpoint(
    report_id: str,
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(get_current_user),
):
    return await get_report(workspace_id, report_id)


@router.get("/{report_id}/download", summary="Download completed report file")
async def download_report(
    report_id: str,
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(get_current_user),
):
    """Download the generated report file. Requires report status = ready."""
    file_path = await get_download_path(workspace_id, report_id)
    if not os.path.exists(file_path):
        raise NotFoundError("Report file not found on disk")

    report = await get_report(workspace_id, report_id)
    fmt = report.get("format", "pdf")
    ext = FILE_EXTENSIONS.get(fmt, "pdf")
    ct = CONTENT_TYPES.get(fmt, "application/octet-stream")
    filename = f"solarscope_{fmt}_{report_id[:8]}.{ext}"

    return FileResponse(
        path=file_path,
        media_type=ct,
        filename=filename,
    )
