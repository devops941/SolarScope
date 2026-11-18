from fastapi import APIRouter, Depends, Query
from app.core.permissions import get_current_user, get_workspace_id, require_role
from app.domain.enums import Role
from app.services.analytics import create_analysis_run, get_analysis_run, list_analysis_runs
from app.services.readings import parse_datetime_param
from app.analytics.comparison import compare_metrics

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.post("/runs", status_code=201, summary="Create an analysis run")
async def create_run(
    system_id: str = Query(...),
    start: str = Query(..., description="ISO 8601 start datetime"),
    end: str = Query(..., description="ISO 8601 end datetime"),
    interval: str = Query(default="15m"),
    quality: str = Query(default="valid"),
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(require_role(Role.ANALYST)),
):
    """
    Run all analytics for a system + period and persist the result.
    Returns the full analysis run with metrics, formula version, and warnings.
    """
    start_dt = parse_datetime_param(start)
    end_dt = parse_datetime_param(end)
    return await create_analysis_run(
        workspace_id=workspace_id,
        system_id=system_id,
        start=start_dt,
        end=end_dt,
        interval=interval,
        quality=quality,
        actor=user,
    )


@router.get("/runs/{run_id}", summary="Get analysis run result")
async def get_run(
    run_id: str,
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(get_current_user),
):
    return await get_analysis_run(workspace_id, run_id)


@router.get("/runs", summary="List analysis runs for a system")
async def list_runs(
    system_id: str = Query(...),
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(get_current_user),
):
    return await list_analysis_runs(workspace_id, system_id)


@router.post("/compare", status_code=201, summary="Compare two periods side by side")
async def compare_periods(
    system_id: str = Query(...),
    start_a: str = Query(..., description="Period A start (ISO 8601)"),
    end_a: str = Query(..., description="Period A end"),
    start_b: str = Query(..., description="Period B start"),
    end_b: str = Query(..., description="Period B end"),
    interval: str = Query(default="15m"),
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(require_role(Role.ANALYST)),
):
    """Run analytics for two periods and return metrics + deltas."""
    run_a = await create_analysis_run(
        workspace_id, system_id,
        parse_datetime_param(start_a), parse_datetime_param(end_a),
        interval=interval, actor=user,
    )
    run_b = await create_analysis_run(
        workspace_id, system_id,
        parse_datetime_param(start_b), parse_datetime_param(end_b),
        interval=interval, actor=user,
    )
    comparison = compare_metrics(run_a["metrics"], run_b["metrics"])
    return {
        "period_a": run_a,
        "period_b": run_b,
        "comparison": comparison,
    }
