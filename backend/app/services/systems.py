"""
Systems service — business logic for solar system configuration.

Validation rules:
  - dc_capacity_kwp > 0 (required)
  - ac_capacity_kw > 0 and ≤ dc_capacity_kwp × 1.25 (clipping ratio)
  - tilt_degrees: 0–90
  - azimuth_degrees: 0–360
  - temp_coefficient_per_c: typically –0.005 to –0.001 (negative)
  - panel_count × panel_rating_w / 1000 ≈ dc_capacity_kwp (warn if >20% off)
  - System must belong to a site in the same workspace
"""
import logging

from app.core.errors import NotFoundError, ValidationError
from app.repositories.systems import SystemsRepository
from app.repositories.sites import SitesRepository
from app.services import audit as audit_svc
from app.domain.enums import SystemStatus

logger = logging.getLogger(__name__)

_systems = SystemsRepository()
_sites = SitesRepository()


# ── Validation ────────────────────────────────────────────────────────
def _validate_system(data: dict) -> list[str]:
    """Validate a system dict. Returns list of warnings (non-fatal)."""
    warnings: list[str] = []

    dc = data.get("dc_capacity_kwp", 0)
    ac = data.get("ac_capacity_kw", 0)
    panel_count = data.get("panel_count", 0)
    panel_rating_w = data.get("panel_rating_w", 0)
    tilt = data.get("tilt_degrees", 0)
    azimuth = data.get("azimuth_degrees", 180)
    temp_coeff = data.get("temp_coefficient_per_c")

    if dc is not None and dc <= 0:
        raise ValidationError("dc_capacity_kwp must be greater than 0.")
    if ac is not None and ac <= 0:
        raise ValidationError("ac_capacity_kw must be greater than 0.")
    if dc and ac and ac > dc * 1.25:
        raise ValidationError(
            f"AC capacity ({ac} kW) exceeds DC capacity × 1.25 ({dc * 1.25:.1f} kW). "
            "Check inverter clipping ratio."
        )
    if tilt is not None and not (0 <= tilt <= 90):
        raise ValidationError("tilt_degrees must be between 0 and 90.")
    if azimuth is not None and not (0 <= azimuth <= 360):
        raise ValidationError("azimuth_degrees must be between 0 and 360.")
    if temp_coeff is not None and not (-0.01 <= temp_coeff <= 0):
        raise ValidationError(
            "temp_coefficient_per_c should be negative (e.g. -0.004). "
            "Typical range: -0.005 to -0.001."
        )

    # Non-fatal: panel count × rating vs DC capacity
    if panel_count and panel_rating_w and dc:
        inferred_kwp = panel_count * panel_rating_w / 1000
        deviation = abs(inferred_kwp - dc) / dc
        if deviation > 0.20:
            warnings.append(
                f"Panel count × rating ({inferred_kwp:.1f} kWp) differs from "
                f"DC capacity ({dc} kWp) by {deviation*100:.0f}%. Verify configuration."
            )

    return warnings


# ── CRUD ──────────────────────────────────────────────────────────────
async def create_system(
    workspace_id: str,
    site_id: str,
    actor: dict,
    data: dict,
) -> dict:
    # Verify site exists and belongs to this workspace
    site = await _sites.get(workspace_id, site_id)
    if not site:
        raise NotFoundError("Site")

    warnings = _validate_system(data)

    doc = {
        "name": data["name"].strip(),
        "dc_capacity_kwp": data["dc_capacity_kwp"],
        "ac_capacity_kw": data["ac_capacity_kw"],
        "panel_count": data.get("panel_count", 0),
        "panel_rating_w": data.get("panel_rating_w", 0),
        "tilt_degrees": data.get("tilt_degrees", 0),
        "azimuth_degrees": data.get("azimuth_degrees", 180),
        "temp_coefficient_per_c": data.get("temp_coefficient_per_c"),
        "inverter_make": data.get("inverter_make"),
        "commissioning_date": data.get("commissioning_date"),
        "status": SystemStatus.ACTIVE.value,
        "config_warnings": warnings,
    }
    system_id = await _systems.create(workspace_id, site_id, doc)

    await audit_svc.log_event(
        workspace_id=workspace_id,
        actor_id=actor["sub"],
        actor_email=actor["email"],
        action="system.create",
        resource_type="solar_system",
        resource_id=system_id,
        metadata={"name": doc["name"], "dc_kwp": doc["dc_capacity_kwp"]},
    )
    return await _get_or_404(workspace_id, system_id)


async def list_systems(workspace_id: str, site_id: str) -> list[dict]:
    return await _systems.list_for_site(workspace_id, site_id)


async def list_all_systems(workspace_id: str, site_id: str | None = None) -> list[dict]:
    systems = await _systems.list_all(workspace_id, site_id)
    site_names: dict[str, str] = {}
    for s in systems:
        sid = s.get("site_id")
        if sid and sid not in site_names:
            site = await _sites.get(workspace_id, sid)
            site_names[sid] = site.get("name", "") if site else ""
        s["site_name"] = site_names.get(sid, "")
    return systems


async def get_system(workspace_id: str, system_id: str) -> dict:
    return await _get_or_404(workspace_id, system_id)


async def update_system(
    workspace_id: str,
    system_id: str,
    actor: dict,
    data: dict,
) -> dict:
    existing = await _get_or_404(workspace_id, system_id)

    # Merge with existing for cross-field validation
    merged = {
        "dc_capacity_kwp": data.get("dc_capacity_kwp") or existing.get("dc_capacity_kwp"),
        "ac_capacity_kw": data.get("ac_capacity_kw") or existing.get("ac_capacity_kw"),
        "panel_count": data.get("panel_count") or existing.get("panel_count", 0),
        "panel_rating_w": data.get("panel_rating_w") or existing.get("panel_rating_w", 0),
        "tilt_degrees": data.get("tilt_degrees") if data.get("tilt_degrees") is not None else existing.get("tilt_degrees", 0),
        "azimuth_degrees": data.get("azimuth_degrees") if data.get("azimuth_degrees") is not None else existing.get("azimuth_degrees", 180),
        "temp_coefficient_per_c": data.get("temp_coefficient_per_c"),
    }
    warnings = _validate_system(merged)

    update_fields = {k: v for k, v in data.items() if v is not None}
    if warnings:
        update_fields["config_warnings"] = warnings

    await _systems.update(workspace_id, system_id, update_fields)

    await audit_svc.log_event(
        workspace_id=workspace_id,
        actor_id=actor["sub"],
        actor_email=actor["email"],
        action="system.update",
        resource_type="solar_system",
        resource_id=system_id,
        metadata={"fields_changed": list(update_fields.keys()), "warnings": warnings},
    )
    return await get_system(workspace_id, system_id)


# ── Helpers ───────────────────────────────────────────────────────────
async def _get_or_404(workspace_id: str, system_id: str) -> dict:
    system = await _systems.get(workspace_id, system_id)
    if not system:
        raise NotFoundError("Solar system")
    return system
