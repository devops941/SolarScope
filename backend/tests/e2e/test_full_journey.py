"""
E2E Test — Full SolarScope User Journey.

Tests the complete critical path:
  register -> site -> system -> download sample -> upload -> preview
  -> confirm -> readings -> dashboard -> analytics -> alerts -> report -> download

This is the most important test: it verifies all phases work together
as a connected application, not isolated modules.
"""
import uuid
import pytest
from httpx import AsyncClient
from app.core.middleware import login_limiter
from app.ingestion.template_generator import generate_sample_30_days


def uid():
    return uuid.uuid4().hex[:8]


@pytest.fixture(autouse=True)
def reset_limiter():
    login_limiter.reset_all()
    yield
    login_limiter.reset_all()


@pytest.mark.asyncio
async def test_complete_solarscope_journey(client: AsyncClient):
    """
    Full end-to-end journey covering all critical paths.
    Verified invariants:
    - Dashboard energy matches analytics energy for same filter
    - Readings count > 0 after import
    - Analysis run persisted with formula version
    - Report generated from saved analysis run (not recalculated)
    - Cross-module filters are consistent
    """
    t = uid()

    # ── 1. Register user (creates workspace automatically) ────────────
    reg = await client.post("/api/v1/auth/register", json={
        "email": f"e2e_{t}@solarscope.dev",
        "name": "E2E Test User",
        "password": "securepass123",
        "workspace_name": f"E2E Workspace {t}",
    })
    assert reg.status_code == 201, f"Register failed: {reg.text}"
    token = reg.json()["access_token"]
    workspace_id = reg.json()["workspace"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # ── 2. Create site ────────────────────────────────────────────────
    site = (await client.post("/api/v1/sites",
        json={"name": f"E2E Solar Plant {t}", "timezone": "Asia/Kolkata",
              "address": "Anna Nagar, Chennai"},
        headers=headers)).json()
    assert site.get("id"), f"Site creation failed: {site}"
    site_id = site["id"]

    # ── 3. Create solar system (25 kWp) ───────────────────────────────
    system = (await client.post(f"/api/v1/sites/{site_id}/systems", json={
        "name": "E2E Array A",
        "dc_capacity_kwp": 25.0,
        "ac_capacity_kw": 20.0,
        "panel_count": 100,
        "panel_rating_w": 250,
        "tilt_degrees": 15,
        "azimuth_degrees": 180,
    }, headers=headers)).json()
    assert system.get("id"), f"System creation failed: {system}"
    system_id = system["id"]
    assert system["dc_capacity_kwp"] == 25.0
    assert system["status"] == "active"

    # ── 4. Download sample CSV ────────────────────────────────────────
    sample_resp = await client.get("/api/v1/imports/sample?variant=clean")
    assert sample_resp.status_code == 200
    csv_bytes = sample_resp.content
    assert len(csv_bytes) > 1000, "Sample CSV is too small"
    assert b"timestamp" in csv_bytes  # has correct headers

    # ── 5. Upload + preview ───────────────────────────────────────────
    preview = (await client.post(
        "/api/v1/imports/preview",
        params={"site_id": site_id, "system_id": system_id,
                "source_timezone": "Asia/Kolkata"},
        files={"file": ("solar.csv", csv_bytes, "text/csv")},
        headers=headers,
    )).json()
    assert preview.get("import_id"), f"Preview failed: {preview}"
    import_id = preview["import_id"]
    assert preview["status"] == "preview_ready"
    assert preview["total_rows"] > 0
    assert preview["counts"]["total_sampled"] > 0

    # Mapping was auto-suggested
    mapping = preview["suggested_mapping"]
    ts_mapped = any(m["canonical_column"] == "timestamp" for m in mapping)
    assert ts_mapped, "timestamp column not auto-mapped"

    # ── 6. Confirm import ─────────────────────────────────────────────
    confirm = (await client.post(
        f"/api/v1/imports/{import_id}/confirm",
        params={"duplicate_policy": "skip"},
        headers=headers,
    )).json()
    assert confirm.get("status") in ("queued", "processing", "completed",
                                      "completed_with_warnings"), f"Confirm failed: {confirm}"

    # Fetch final status
    final_import = (await client.get(
        f"/api/v1/imports/{import_id}",
        headers=headers,
    )).json()
    assert final_import["status"] in (
        "completed", "completed_with_warnings"
    ), f"Import did not complete: {final_import['status']}"
    assert final_import["counts"]["accepted"] > 0, "No rows accepted"

    # ── 7. Readings must exist ────────────────────────────────────────
    readings = (await client.get(
        f"/api/v1/readings?system_id={system_id}&site_id={site_id}"
        f"&start=2026-10-01T00:00:00Z&end=2026-10-02T00:00:00Z",
        headers=headers,
    )).json()
    assert readings["total"] > 0, "No readings after import"

    # ── 8. Dashboard KPIs must have positive energy ───────────────────
    dash = (await client.get(
        f"/api/v1/dashboard/summary?system_id={system_id}&site_id={site_id}"
        f"&start=2026-10-01T00:00:00Z&end=2026-10-01T23:59:59Z",
        headers=headers,
    )).json()
    assert dash.get("kpis"), f"Dashboard summary missing kpis: {dash}"
    energy_kpi = dash["kpis"]["energy_kwh"]
    assert energy_kpi["value"] is not None, "Dashboard energy is None"
    assert energy_kpi["value"] > 0, "Dashboard energy is not positive"

    # Dashboard series must return chart data
    series = (await client.get(
        f"/api/v1/dashboard/series?system_id={system_id}&site_id={site_id}"
        f"&start=2026-10-01T00:00:00Z&end=2026-10-01T23:59:59Z",
        headers=headers,
    )).json()
    assert series["total_points"] > 0, "Dashboard series is empty"

    # ── 9. Analytics run + reconciliation ────────────────────────────
    start, end = "2026-10-01T00:00:00Z", "2026-10-01T23:59:59Z"
    run = (await client.post(
        f"/api/v1/analytics/runs?system_id={system_id}&start={start}&end={end}",
        headers=headers,
    )).json()
    assert run.get("id"), f"Analytics run failed: {run}"
    assert run["formula_version"] == "v1.0"
    assert "metrics" in run

    # KEY RECONCILIATION: dashboard energy == analytics energy
    dash_energy = dash["kpis"]["energy_kwh"]["value"]
    analytics_energy = run["metrics"]["energy_kwh"]["value"]
    assert analytics_energy is not None
    assert abs(dash_energy - analytics_energy) < 0.01, (
        f"RECONCILIATION FAILED: dashboard={dash_energy}, analytics={analytics_energy}"
    )

    # ── 10. Alerts may exist ──────────────────────────────────────────
    alerts = (await client.get("/api/v1/alerts", headers=headers)).json()
    assert "items" in alerts
    assert "total" in alerts
    # Counts endpoint
    counts = (await client.get("/api/v1/alerts/counts", headers=headers)).json()
    assert "total" in counts

    # ── 11. Generate PDF report ───────────────────────────────────────
    report = (await client.post(
        f"/api/v1/reports?analysis_run_id={run['id']}&format=pdf",
        headers=headers,
    )).json()
    assert report.get("id"), f"Report creation failed: {report}"
    assert report["status"] in ("queued", "generating", "ready")
    assert report["analysis_run_id"] == run["id"]

    # Fetch final status
    final_report = (await client.get(
        f"/api/v1/reports/{report['id']}",
        headers=headers,
    )).json()

    if final_report["status"] == "ready":
        # ── 12. Download report ───────────────────────────────────────
        dl = await client.get(
            f"/api/v1/reports/{report['id']}/download",
            headers=headers,
        )
        assert dl.status_code == 200
        assert len(dl.content) > 500, "PDF file is too small"
        assert b"%PDF" in dl.content[:10], "Downloaded file is not a PDF"

    # ── 13. Export readings CSV ───────────────────────────────────────
    csv_export = await client.get(
        f"/api/v1/readings?system_id={system_id}&site_id={site_id}"
        f"&start={start}&end={end}&export=csv",
        headers=headers,
    )
    assert csv_export.status_code == 200
    assert "text/csv" in csv_export.headers.get("content-type", "")
    csv_lines = csv_export.content.decode("utf-8").strip().splitlines()
    assert len(csv_lines) >= 2, "CSV export has no data rows"

    # ── 14. Metrics CSV export ────────────────────────────────────────
    metrics_report = (await client.post(
        f"/api/v1/reports?analysis_run_id={run['id']}&format=metrics_csv",
        headers=headers,
    )).json()
    assert metrics_report["status"] in ("queued", "generating", "ready")
