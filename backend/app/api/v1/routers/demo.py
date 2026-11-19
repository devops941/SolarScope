"""
Demo Seeder Router — One-click seeding of solar site, system, and 30-day telemetry.
"""
from pathlib import Path
import logging
from fastapi import APIRouter, Depends, BackgroundTasks
from app.core.permissions import get_current_user, get_workspace_id
from app.services import sites as sites_svc
from app.services import systems as systems_svc
from app.services import imports as imports_svc
from app.workers.import_worker import process_import
from app.repositories.alerts import AlertsRepository
from app.repositories.readings import ReadingsRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/demo", tags=["demo"])
_alerts = AlertsRepository()
_readings = ReadingsRepository()


@router.post("/seed", summary="One-click seed demo solar plant and 30-day telemetry")
async def seed_demo_data(
    background_tasks: BackgroundTasks,
    workspace_id: str = Depends(get_workspace_id),
    user: dict = Depends(get_current_user),
):
    logger.info("Starting demo seeding for workspace: %s", workspace_id)

    # 1. Site: Find or create
    sites_result = await sites_svc.list_sites(workspace_id, None, 1, 10)
    existing_sites = sites_result.get("items", [])
    
    site = None
    for s in existing_sites:
        if "Chennai" in s.get("name", ""):
            site = s
            break
            
    if not site:
        site = await sites_svc.create_site(workspace_id, user, {
            "name": "Chennai Solar Plant - Alpha",
            "timezone": "Asia/Kolkata",
            "address": "OMR Tech Corridor, Sholinganallur, Chennai, Tamil Nadu 600119",
            "location": {"lat": 12.9010, "lon": 80.2279},
            "status": "active"
        })
    site_id = site["id"]

    # 2. System: Find or create
    systems_result = await systems_svc.list_systems(workspace_id, site_id)
    existing_systems = systems_result if isinstance(systems_result, list) else systems_result.get("items", [])
    
    system = None
    for sys in existing_systems:
        if "Array 1" in sys.get("name", "") or sys.get("dc_capacity_kwp") == 25.0:
            system = sys
            break
            
    if not system:
        system = await systems_svc.create_system(workspace_id, site_id, user, {
            "name": "Rooftop Array 1 (25 kWp)",
            "dc_capacity_kwp": 25.0,
            "ac_capacity_kw": 22.0,
            "panel_count": 60,
            "panel_rating_w": 415,
            "tilt_degrees": 15.0,
            "azimuth_degrees": 180.0,
            "temp_coefficient_per_c": -0.0038,
            "inverter_make": "SMA Sunny Tripower 25000TL",
            "commissioning_date": "2024-01-15",
            "status": "active"
        })
    system_id = system["id"]

    # 3. Telemetry: Check if readings exist; if not, import demo CSV
    existing_count = await _readings.col.count_documents({"workspace_id": workspace_id, "system_id": system_id})
    if existing_count == 0:
        csv_path = Path(__file__).resolve().parents[4] / "scripts" / "solarscope_demo_30_days_clean.csv"
        if not csv_path.exists():
            csv_path = Path("scripts/solarscope_demo_30_days_clean.csv")
            
        if csv_path.exists():
            file_bytes = csv_path.read_bytes()
            preview = await imports_svc.upload_and_preview(
                workspace_id=workspace_id,
                site_id=site_id,
                system_id=system_id,
                actor=user,
                filename="solarscope_demo_30_days_clean.csv",
                file_content=file_bytes,
                source_timezone="Asia/Kolkata",
            )
            import_id = preview["import_id"]
            await imports_svc.confirm_import(
                workspace_id=workspace_id,
                import_id=import_id,
                actor=user,
                duplicate_policy="replace",
                source_timezone="Asia/Kolkata",
                energy_mode="interval",
            )
            # Run import in background so response returns instantaneously without timeout!
            background_tasks.add_task(process_import, import_id, workspace_id)

    # 4. Create sample demo alerts if none exist
    open_alert = await _alerts.find_open(workspace_id, system_id, "SOILING_DETECTED")
    if not open_alert:
        await _alerts.create(workspace_id, {
            "system_id": system_id,
            "site_id": site_id,
            "rule_code": "SOILING_DETECTED",
            "rule_name": "Performance Ratio Drop (Potential Soiling)",
            "severity": "warning",
            "status": "open",
            "description": "Gradual 5.2% midday PR decline detected across consecutive clear days. Scheduled panel cleaning advised.",
            "evidence": {"pr_drop_pct": 5.2, "confidence": 0.89},
            "affected_intervals": ["2026-10-15T12:00:00+05:30", "2026-10-16T12:00:00+05:30"],
        })
        await _alerts.create(workspace_id, {
            "system_id": system_id,
            "site_id": site_id,
            "rule_code": "HIGH_MODULE_TEMP",
            "rule_name": "Elevated Module Temperature Advisory",
            "severity": "info",
            "status": "open",
            "description": "Module temperatures peaked at 58.4°C during high ambient heat intervals.",
            "evidence": {"peak_temp_c": 58.4, "ambient_c": 36.1},
            "affected_intervals": ["2026-10-20T13:15:00+05:30"],
        })

    return {
        "success": True,
        "message": "Demo plant initialized! Telemetry ingestion is running in background.",
        "site_id": site_id,
        "system_id": system_id,
    }
