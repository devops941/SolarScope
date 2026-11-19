from fastapi import APIRouter, Depends
from app.schemas.systems import SystemCreate, SystemUpdate, SystemResponse
from app.core.permissions import get_current_user, get_workspace_id, require_role
from app.domain.enums import Role, SystemStatus
from app.services import systems as systems_svc

router = APIRouter(tags=["systems"])


@router.get(
    "/systems",
    response_model=list[SystemResponse],
    summary="List all solar systems across workspace",
)
async def list_all_systems(
    site_id: str | None = None,
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(get_current_user),
):
    systems = await systems_svc.list_all_systems(workspace_id, site_id)
    return [_serialize(s) for s in systems]


def _serialize(sys: dict) -> dict:
    return {
        "id": sys["id"],
        "site_id": sys.get("site_id", ""),
        "site_name": sys.get("site_name"),
        "workspace_id": sys.get("workspace_id", ""),
        "name": sys["name"],
        "dc_capacity_kwp": sys["dc_capacity_kwp"],
        "ac_capacity_kw": sys["ac_capacity_kw"],
        "panel_count": sys.get("panel_count", 0),
        "panel_rating_w": sys.get("panel_rating_w", 0),
        "tilt_degrees": sys.get("tilt_degrees", 0),
        "azimuth_degrees": sys.get("azimuth_degrees", 180),
        "temp_coefficient_per_c": sys.get("temp_coefficient_per_c"),
        "inverter_make": sys.get("inverter_make"),
        "commissioning_date": sys.get("commissioning_date"),
        "status": sys.get("status", SystemStatus.ACTIVE.value),
        "created_at": sys.get("created_at"),
    }


@router.get(
    "/sites/{site_id}/systems",
    response_model=list[SystemResponse],
    summary="List systems for a site",
)
async def list_systems(
    site_id: str,
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(get_current_user),
):
    systems = await systems_svc.list_systems(workspace_id, site_id)
    return [_serialize(s) for s in systems]


@router.post(
    "/sites/{site_id}/systems",
    response_model=SystemResponse,
    status_code=201,
    summary="Create solar system",
)
async def create_system(
    site_id: str,
    body: SystemCreate,
    user: dict = Depends(require_role(Role.SITE_MANAGER)),
    workspace_id: str = Depends(get_workspace_id),
):
    system = await systems_svc.create_system(workspace_id, site_id, user, body.model_dump())
    return _serialize(system)


@router.get(
    "/systems/{system_id}",
    response_model=SystemResponse,
    summary="Get system detail",
)
async def get_system(
    system_id: str,
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(get_current_user),
):
    system = await systems_svc.get_system(workspace_id, system_id)
    return _serialize(system)


@router.patch(
    "/systems/{system_id}",
    response_model=SystemResponse,
    summary="Update system configuration",
)
async def update_system(
    system_id: str,
    body: SystemUpdate,
    user: dict = Depends(require_role(Role.SITE_MANAGER)),
    workspace_id: str = Depends(get_workspace_id),
):
    system = await systems_svc.update_system(
        workspace_id, system_id, user, body.model_dump(exclude_unset=True)
    )
    return _serialize(system)
