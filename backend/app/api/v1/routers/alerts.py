from fastapi import APIRouter, Depends, Query
from app.core.permissions import get_current_user, get_workspace_id, require_role
from app.domain.enums import Role
from app.services import alerts as alerts_svc

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", summary="List alerts for this workspace")
async def list_alerts(
    severity: str | None = Query(default=None),
    status: str | None = Query(default=None),
    system_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(get_current_user),
):
    return await alerts_svc.list_alerts(
        workspace_id, severity=severity, status=status,
        system_id=system_id, page=page, page_size=page_size,
    )


@router.get("/counts", summary="Open alert counts by severity")
async def alert_counts(
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(get_current_user),
):
    return await alerts_svc.get_alert_counts(workspace_id)


@router.get("/{alert_id}", summary="Get alert detail")
async def get_alert(
    alert_id: str,
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(get_current_user),
):
    return await alerts_svc.get_alert(workspace_id, alert_id)


@router.patch("/{alert_id}", summary="Update alert status (acknowledge / resolve)")
async def update_alert(
    alert_id: str,
    body: dict,
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(require_role(Role.SITE_MANAGER)),
):
    new_status = body.get("status", "")
    note = body.get("note")
    return await alerts_svc.update_alert_status(workspace_id, alert_id, new_status, user, note)
