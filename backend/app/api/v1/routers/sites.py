from fastapi import APIRouter, Depends, Query
from app.schemas.sites import SiteCreate, SiteUpdate, SiteResponse
from app.schemas.common import PaginatedResponse
from app.core.permissions import get_current_user, get_workspace_id, require_role
from app.domain.enums import Role, SiteStatus
from app.services import sites as sites_svc

router = APIRouter(prefix="/sites", tags=["sites"])


def _serialize(site: dict) -> dict:
    """Normalize DB doc → response-safe dict."""
    return {
        "id": site["id"],
        "workspace_id": site.get("workspace_id", ""),
        "name": site["name"],
        "timezone": site["timezone"],
        "status": site.get("status", SiteStatus.ACTIVE.value),
        "address": site.get("address"),
        "location": site.get("location"),
        "system_count": site.get("system_count", 0),
        "created_at": site.get("created_at"),
        "updated_at": site.get("updated_at"),
    }


@router.get("", response_model=PaginatedResponse[SiteResponse], summary="List sites")
async def list_sites(
    status: str | None = Query(default=None, description="Filter by status: active|inactive|archived"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(get_current_user),
):
    result = await sites_svc.list_sites(workspace_id, status, page, page_size)
    return {**result, "items": [_serialize(s) for s in result["items"]]}


@router.post("", response_model=SiteResponse, status_code=201, summary="Create site")
async def create_site(
    body: SiteCreate,
    user: dict = Depends(require_role(Role.SITE_MANAGER)),
    workspace_id: str = Depends(get_workspace_id),
):
    site = await sites_svc.create_site(workspace_id, user, body.model_dump())
    return _serialize(site)


@router.get("/{site_id}", response_model=SiteResponse, summary="Get site")
async def get_site(
    site_id: str,
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(get_current_user),
):
    site = await sites_svc.get_site(workspace_id, site_id)
    return _serialize(site)


@router.patch("/{site_id}", response_model=SiteResponse, summary="Update site")
async def update_site(
    site_id: str,
    body: SiteUpdate,
    user: dict = Depends(require_role(Role.SITE_MANAGER)),
    workspace_id: str = Depends(get_workspace_id),
):
    site = await sites_svc.update_site(workspace_id, site_id, user, body.model_dump(exclude_unset=True))
    return _serialize(site)


@router.delete("/{site_id}", status_code=204, summary="Archive site")
async def archive_site(
    site_id: str,
    user: dict = Depends(require_role(Role.WORKSPACE_ADMIN)),
    workspace_id: str = Depends(get_workspace_id),
):
    await sites_svc.archive_site(workspace_id, site_id, user)
    return None
