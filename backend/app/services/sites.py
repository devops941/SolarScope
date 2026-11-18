"""
Sites service — business logic for site management.

Validation rules:
  - name: 1–100 chars, unique within workspace
  - timezone: valid IANA string (zoneinfo-verified)
  - lat/lng: within geographic bounds
  - Workspace scoping enforced at repository level
  - Every mutation generates an audit log entry
"""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
import logging

from app.core.errors import NotFoundError, ConflictError, ValidationError
from app.repositories.sites import SitesRepository
from app.services import audit as audit_svc
from app.domain.enums import SiteStatus

logger = logging.getLogger(__name__)

_sites = SitesRepository()


# ── Validation helpers ────────────────────────────────────────────────
def _validate_timezone(tz: str) -> None:
    try:
        ZoneInfo(tz)
    except (ZoneInfoNotFoundError, KeyError):
        raise ValidationError(f"'{tz}' is not a valid IANA timezone string.")


def _validate_location(lat: float | None, lng: float | None) -> None:
    if lat is not None and not (-90 <= lat <= 90):
        raise ValidationError("Latitude must be between -90 and 90.")
    if lng is not None and not (-180 <= lng <= 180):
        raise ValidationError("Longitude must be between -180 and 180.")


async def _assert_name_unique(workspace_id: str, name: str, exclude_id: str | None = None) -> None:
    sites = await _sites.list_for_workspace(workspace_id, limit=500)
    for s in sites:
        if s["name"].lower() == name.lower() and s["id"] != exclude_id:
            raise ConflictError(f"A site named '{name}' already exists in this workspace.")


# ── CRUD ──────────────────────────────────────────────────────────────
async def create_site(workspace_id: str, actor: dict, data: dict) -> dict:
    _validate_timezone(data["timezone"])
    loc = data.get("location")
    if loc:
        _validate_location(loc.get("lat"), loc.get("lng"))
    await _assert_name_unique(workspace_id, data["name"])

    doc = {
        "name": data["name"].strip(),
        "timezone": data["timezone"],
        "address": data.get("address"),
        "location": loc,
        "status": SiteStatus.ACTIVE.value,
    }
    site_id = await _sites.create(workspace_id, doc)

    await audit_svc.log_event(
        workspace_id=workspace_id,
        actor_id=actor["sub"],
        actor_email=actor["email"],
        action="site.create",
        resource_type="site",
        resource_id=site_id,
        metadata={"name": doc["name"]},
    )
    return await _get_or_404(workspace_id, site_id)


async def list_sites(
    workspace_id: str,
    status: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> dict:
    skip = (page - 1) * page_size
    items = await _sites.list_for_workspace(workspace_id, status=status, skip=skip, limit=page_size)
    total = await _sites.count_scoped(workspace_id, {"status": status} if status else None)

    # Enrich each site with system count
    enriched = []
    for s in items:
        s["system_count"] = await _sites.count_systems(s["id"])
        enriched.append(s)

    return {
        "items": enriched,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, -(-total // page_size)),
    }


async def get_site(workspace_id: str, site_id: str) -> dict:
    site = await _get_or_404(workspace_id, site_id)
    site["system_count"] = await _sites.count_systems(site_id)
    return site


async def update_site(workspace_id: str, site_id: str, actor: dict, data: dict) -> dict:
    await _get_or_404(workspace_id, site_id)

    if "timezone" in data and data["timezone"]:
        _validate_timezone(data["timezone"])
    if "location" in data and data["location"]:
        _validate_location(data["location"].get("lat"), data["location"].get("lng"))
    if "name" in data and data["name"]:
        await _assert_name_unique(workspace_id, data["name"], exclude_id=site_id)

    update_fields = {k: v for k, v in data.items() if v is not None}
    await _sites.update(workspace_id, site_id, update_fields)

    await audit_svc.log_event(
        workspace_id=workspace_id,
        actor_id=actor["sub"],
        actor_email=actor["email"],
        action="site.update",
        resource_type="site",
        resource_id=site_id,
        metadata={"fields_changed": list(update_fields.keys())},
    )
    return await get_site(workspace_id, site_id)


async def archive_site(workspace_id: str, site_id: str, actor: dict) -> None:
    await _get_or_404(workspace_id, site_id)
    await _sites.update(workspace_id, site_id, {"status": SiteStatus.ARCHIVED.value})
    await audit_svc.log_event(
        workspace_id=workspace_id,
        actor_id=actor["sub"],
        actor_email=actor["email"],
        action="site.archive",
        resource_type="site",
        resource_id=site_id,
    )


# ── Helpers ───────────────────────────────────────────────────────────
async def _get_or_404(workspace_id: str, site_id: str) -> dict:
    site = await _sites.get(workspace_id, site_id)
    if not site:
        raise NotFoundError("Site")
    return site
