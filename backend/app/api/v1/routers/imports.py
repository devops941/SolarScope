from fastapi import APIRouter, BackgroundTasks, Depends, Request, UploadFile, File, Query
from fastapi.responses import Response, FileResponse
from app.core.permissions import get_current_user, get_workspace_id, require_role
from app.core.errors import NotFoundError, ValidationError
from app.core.middleware import preview_limiter, get_client_ip
from app.domain.enums import Role
from app.services import imports as imports_svc
from app.workers.import_worker import process_import
import os

router = APIRouter(prefix="/imports", tags=["imports"])


# ── Template / sample downloads ───────────────────────────────────────
@router.get("/template", summary="Download blank CSV template")
async def download_template():
    content = imports_svc.get_template_bytes()
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="solarscope_readings_template_v1.csv"'},
    )


@router.get("/sample", summary="Download synthetic 30-day sample CSV")
async def download_sample(variant: str = Query(default="clean")):
    content = imports_svc.get_sample_bytes(variant)
    name = "solarscope_demo_30_days_clean.csv" if variant == "clean" else "solarscope_demo_validation_cases.csv"
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{name}"'},
    )


# ── Upload + preview ──────────────────────────────────────────────────
@router.post("/preview", summary="Upload CSV and preview (no DB writes)")
async def preview_import(
    request: Request,
    file: UploadFile = File(...),
    site_id: str = Query(...),
    system_id: str = Query(...),
    source_timezone: str = Query(default="Asia/Kolkata"),
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(require_role(Role.SITE_MANAGER)),
):
    # Rate limiting: max 5 preview uploads per IP per minute
    preview_limiter.check(get_client_ip(request))

    # File type validation
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise ValidationError("Only .csv files are accepted. Rename your file to .csv.")

    content = await file.read()

    # File content validation — must be valid text (not binary/executable)
    try:
        content.decode("utf-8", errors="strict")
    except UnicodeDecodeError:
        try:
            content.decode("latin-1", errors="strict")
        except UnicodeDecodeError:
            raise ValidationError("File content is not valid text. Only UTF-8 or Latin-1 encoded CSV files are accepted.")
    return await imports_svc.upload_and_preview(
        workspace_id=workspace_id,
        site_id=site_id,
        system_id=system_id,
        actor=user,
        filename=file.filename,
        file_content=content,
        source_timezone=source_timezone,
    )


# ── Confirm → queue worker ────────────────────────────────────────────
@router.post("/{import_id}/confirm", status_code=202, summary="Confirm import and queue background worker")
async def confirm_import(
    import_id: str,
    background_tasks: BackgroundTasks,
    duplicate_policy: str = Query(default="skip"),
    source_timezone: str = Query(default="Asia/Kolkata"),
    energy_mode: str = Query(default="interval"),
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(require_role(Role.SITE_MANAGER)),
):
    """
    Confirm a previewed import and start background processing.
    Returns immediately with status=queued; poll GET /imports/{id} for progress.
    """
    imp = await imports_svc.confirm_import(
        workspace_id=workspace_id,
        import_id=import_id,
        actor=user,
        duplicate_policy=duplicate_policy,
        source_timezone=source_timezone,
        energy_mode=energy_mode,
    )
    # Launch background worker (non-blocking)
    background_tasks.add_task(process_import, import_id, workspace_id)
    return imp


# ── History + status ──────────────────────────────────────────────────
@router.get("", summary="List all imports for this workspace")
async def list_imports(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(get_current_user),
):
    return await imports_svc.list_imports(workspace_id, page, page_size)


@router.get("/{import_id}", summary="Get import status and counts")
async def get_import(
    import_id: str,
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(get_current_user),
):
    return await imports_svc.get_import(workspace_id, import_id)


# ── Error CSV download ────────────────────────────────────────────────
@router.get("/{import_id}/errors.csv", summary="Download rejected rows CSV")
async def download_errors(
    import_id: str,
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(get_current_user),
):
    error_path = await imports_svc.get_error_csv_path(workspace_id, import_id)
    if not error_path or not os.path.exists(error_path):
        raise NotFoundError("Error file not available for this import")
    return FileResponse(
        path=error_path,
        media_type="text/csv",
        filename=f"import_{import_id}_errors.csv",
    )


# ── Rollback ──────────────────────────────────────────────────────────
@router.post("/{import_id}/rollback", status_code=200, summary="Rollback import — delete readings")
async def rollback_import(
    import_id: str,
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(require_role(Role.SITE_MANAGER)),
):
    """
    Delete all readings created by this import.
    Only works on completed or completed_with_warnings imports.
    Marks import as rolled_back.
    """
    return await imports_svc.rollback_import(workspace_id, import_id, user)
