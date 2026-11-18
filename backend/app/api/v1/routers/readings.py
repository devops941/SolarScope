from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from app.core.permissions import get_current_user, get_workspace_id, require_role
from app.domain.enums import Role
from app.services.readings import (
    list_readings, export_readings_csv, create_manual_reading, parse_datetime_param
)

router = APIRouter(prefix="/readings", tags=["readings"])


@router.get("", summary="Filter and paginate readings")
async def get_readings(
    system_id: str = Query(...),
    site_id: str = Query(...),
    start: str = Query(..., description="ISO 8601 start datetime"),
    end: str = Query(..., description="ISO 8601 end datetime"),
    quality: str = Query(default="all", description="all | valid | flagged"),
    import_id: str | None = Query(default=None),
    interval: str = Query(default="15m"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    sort_order: str = Query(default="asc", description="asc | desc"),
    export: str | None = Query(default=None, description="Set to 'csv' to download"),
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(get_current_user),
):
    start_dt = parse_datetime_param(start)
    end_dt = parse_datetime_param(end)

    if export == "csv":
        content = await export_readings_csv(
            workspace_id=workspace_id,
            system_id=system_id,
            start=start_dt,
            end=end_dt,
            quality=quality,
            import_id=import_id,
        )
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="readings_{system_id}.csv"'},
        )

    return await list_readings(
        workspace_id=workspace_id,
        system_id=system_id,
        start=start_dt,
        end=end_dt,
        quality=quality,
        import_id=import_id,
        page=page,
        page_size=page_size,
        sort_order=sort_order,
        interval=interval,
    )


@router.post("/manual", status_code=201, summary="Create manual observation")
async def create_manual(
    body: dict,
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(require_role(Role.SITE_MANAGER)),
):
    system_id = body.get("system_id", "")
    site_id = body.get("site_id", "")
    if not system_id or not site_id:
        from app.core.errors import ValidationError
        raise ValidationError("system_id and site_id are required")
    return await create_manual_reading(workspace_id, system_id, site_id, user, body)
