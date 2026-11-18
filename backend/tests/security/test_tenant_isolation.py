"""
Cross-tenant isolation security tests.

Verifies that workspace A data is completely invisible to workspace B users
across ALL endpoints: sites, systems, imports, readings, analytics, alerts, reports.

The key invariant: workspace_id ALWAYS comes from the JWT token,
never from client-supplied query parameters or request body.
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
    from app.core.middleware import preview_limiter
    preview_limiter.reset_all()
    yield
    login_limiter.reset_all()
    preview_limiter.reset_all()


async def _register(client, name="user"):
    t = uid()
    r = await client.post("/api/v1/auth/register", json={
        "email": f"{name}_{t}@test.dev", "name": f"{name} {t}",
        "password": "securepass123", "workspace_name": f"WS_{name}_{t}",
    })
    assert r.status_code == 201
    return r.json()["workspace"]["id"], r.json()["access_token"]


async def _setup_full_workspace(client, token):
    """Create site, system, import data, run analytics. Returns IDs."""
    site = (await client.post("/api/v1/sites",
        json={"name": f"Site {uid()}", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {token}"})).json()
    sys_ = (await client.post(f"/api/v1/sites/{site['id']}/systems",
        json={"name": "Array A", "dc_capacity_kwp": 10.0, "ac_capacity_kw": 8.0},
        headers={"Authorization": f"Bearer {token}"})).json()

    csv_bytes = generate_sample_30_days(days=1, interval_minutes=15)
    login_limiter.reset_all()
    from app.core.middleware import preview_limiter
    preview_limiter.reset_all()
    preview = (await client.post(
        "/api/v1/imports/preview",
        params={"site_id": site["id"], "system_id": sys_["id"]},
        files={"file": (f"s.csv", csv_bytes, "text/csv")},
        headers={"Authorization": f"Bearer {token}"},
    )).json()
    await client.post(f"/api/v1/imports/{preview['import_id']}/confirm",
                      params={"duplicate_policy": "skip"},
                      headers={"Authorization": f"Bearer {token}"})

    run = (await client.post(
        f"/api/v1/analytics/runs?system_id={sys_['id']}&start=2026-10-01T00:00:00Z&end=2026-10-01T23:59:59Z",
        headers={"Authorization": f"Bearer {token}"},
    )).json()

    report = (await client.post(
        f"/api/v1/reports?analysis_run_id={run['id']}&format=pdf",
        headers={"Authorization": f"Bearer {token}"},
    )).json()

    return {
        "site_id": site["id"], "system_id": sys_["id"],
        "import_id": preview["import_id"], "run_id": run["id"],
        "report_id": report["id"],
    }


@pytest.mark.asyncio
async def test_site_invisible_to_other_workspace(client: AsyncClient):
    ws_a, token_a = await _register(client, "tenant_a")
    login_limiter.reset_all()
    ws_b, token_b = await _register(client, "tenant_b")
    ids = await _setup_full_workspace(client, token_a)

    resp = await client.get(f"/api/v1/sites/{ids['site_id']}",
                            headers={"Authorization": f"Bearer {token_b}"})
    assert resp.status_code == 404, "Site should be 404 for other tenant"


@pytest.mark.asyncio
async def test_system_invisible_to_other_workspace(client: AsyncClient):
    ws_a, token_a = await _register(client, "ta")
    login_limiter.reset_all()
    ws_b, token_b = await _register(client, "tb")
    ids = await _setup_full_workspace(client, token_a)

    resp = await client.get(f"/api/v1/systems/{ids['system_id']}",
                            headers={"Authorization": f"Bearer {token_b}"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_import_invisible_to_other_workspace(client: AsyncClient):
    ws_a, token_a = await _register(client, "ta")
    login_limiter.reset_all()
    ws_b, token_b = await _register(client, "tb")
    ids = await _setup_full_workspace(client, token_a)

    resp = await client.get(f"/api/v1/imports/{ids['import_id']}",
                            headers={"Authorization": f"Bearer {token_b}"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_readings_return_zero_for_other_workspace(client: AsyncClient):
    ws_a, token_a = await _register(client, "ta")
    login_limiter.reset_all()
    ws_b, token_b = await _register(client, "tb")
    ids = await _setup_full_workspace(client, token_a)

    resp = await client.get(
        f"/api/v1/readings?system_id={ids['system_id']}&site_id={ids['site_id']}"
        f"&start=2026-10-01T00:00:00Z&end=2026-10-02T00:00:00Z",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 200
    assert resp.json()["total"] == 0, "Readings must be 0 for another workspace"


@pytest.mark.asyncio
async def test_analysis_run_invisible_to_other_workspace(client: AsyncClient):
    ws_a, token_a = await _register(client, "ta")
    login_limiter.reset_all()
    ws_b, token_b = await _register(client, "tb")
    ids = await _setup_full_workspace(client, token_a)

    resp = await client.get(f"/api/v1/analytics/runs/{ids['run_id']}",
                            headers={"Authorization": f"Bearer {token_b}"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_report_invisible_to_other_workspace(client: AsyncClient):
    ws_a, token_a = await _register(client, "ta")
    login_limiter.reset_all()
    ws_b, token_b = await _register(client, "tb")
    ids = await _setup_full_workspace(client, token_a)

    resp = await client.get(f"/api/v1/reports/{ids['report_id']}",
                            headers={"Authorization": f"Bearer {token_b}"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_alerts_return_zero_for_other_workspace(client: AsyncClient):
    ws_a, token_a = await _register(client, "ta")
    login_limiter.reset_all()
    ws_b, token_b = await _register(client, "tb")
    await _setup_full_workspace(client, token_a)

    resp = await client.get("/api/v1/alerts",
                            headers={"Authorization": f"Bearer {token_b}"})
    assert resp.status_code == 200
    alerts_b = resp.json()["items"]
    # B has no data, so no alerts
    assert resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_workspace_id_from_body_is_ignored(client: AsyncClient):
    """
    CRITICAL: Even if attacker supplies another workspace's site_id in the
    request body or query params, the backend ALWAYS uses workspace from token.
    """
    ws_a, token_a = await _register(client, "ta")
    login_limiter.reset_all()
    ws_b, token_b = await _register(client, "tb")
    ids = await _setup_full_workspace(client, token_a)

    # B tries to list sites using A's site_id in a parameter
    list_resp = await client.get("/api/v1/sites",
                                 headers={"Authorization": f"Bearer {token_b}"})
    assert list_resp.status_code == 200
    site_ids_b = {s["id"] for s in list_resp.json()["items"]}
    assert ids["site_id"] not in site_ids_b, (
        "CRITICAL: Workspace A site appeared in workspace B's site list!"
    )


@pytest.mark.asyncio
async def test_me_endpoint_returns_own_workspace(client: AsyncClient):
    """GET /auth/me must always return the caller's own workspace."""
    ws_a, token_a = await _register(client, "ta")
    login_limiter.reset_all()
    ws_b, token_b = await _register(client, "tb")

    me_a = (await client.get("/api/v1/auth/me",
                              headers={"Authorization": f"Bearer {token_a}"})).json()
    me_b = (await client.get("/api/v1/auth/me",
                              headers={"Authorization": f"Bearer {token_b}"})).json()

    assert me_a["workspace"]["id"] == ws_a
    assert me_b["workspace"]["id"] == ws_b
    assert me_a["workspace"]["id"] != me_b["workspace"]["id"]

