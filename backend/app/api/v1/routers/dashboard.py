from fastapi import APIRouter, Depends, Query
from app.core.permissions import get_current_user, get_workspace_id
from app.services.dashboard import get_summary, get_series
from app.services.readings import parse_datetime_param

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", summary="Dashboard KPI summary")
async def dashboard_summary(
    system_id: str = Query(...),
    site_id: str = Query(...),
    start: str = Query(..., description="ISO 8601 start datetime"),
    end: str = Query(..., description="ISO 8601 end datetime"),
    interval: str = Query(default="15m"),
    quality: str = Query(default="valid"),
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(get_current_user),
):
    """
    Returns KPIs for the period using the SAME calculations as the analytics engine.
    Dashboard energy must always match analytics run + readings export for the same filter.
    """
    return await get_summary(
        workspace_id=workspace_id,
        system_id=system_id,
        start=parse_datetime_param(start),
        end=parse_datetime_param(end),
        interval=interval,
        quality=quality,
    )


@router.get("/series", summary="Chart time-series data")
async def dashboard_series(
    system_id: str = Query(...),
    site_id: str = Query(...),
    start: str = Query(..., description="ISO 8601 start datetime"),
    end: str = Query(..., description="ISO 8601 end datetime"),
    interval: str = Query(default="15m"),
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(get_current_user),
):
    """
    Returns time-series data for generation, irradiance, and temperature charts.
    Includes flagged readings for visualization (official totals use valid only).
    """
    return await get_series(
        workspace_id=workspace_id,
        system_id=system_id,
        start=parse_datetime_param(start),
        end=parse_datetime_param(end),
        interval=interval,
    )
