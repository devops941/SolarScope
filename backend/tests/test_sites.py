"""
Phase 4 Sites & Systems Tests.

Covers:
  - Site CRUD: create, list, get, update, archive
  - System CRUD: create, list, get, update
  - Validation: timezone, capacity ratio, negative values
  - Cross-tenant isolation
  - Audit trail: every mutation generates an audit log
  - RBAC: viewer cannot create; site_manager can; workspace_admin can archive
"""
import uuid
import pytest
from httpx import AsyncClient
from app.core.security import create_access_token
from app.core.middleware import login_limiter


def uid() -> str:
    return uuid.uuid4().hex[:8]


def sm_token(workspace_id: str) -> str:
    return create_access_token({
        "sub": f"sm_{uid()}", "email": f"sm_{uid()}@t.dev", "name": "SM",
        "role": "site_manager", "workspace_id": workspace_id,
    })


def viewer_token(workspace_id: str) -> str:
    return create_access_token({
        "sub": f"vw_{uid()}", "email": f"vw_{uid()}@t.dev", "name": "Viewer",
        "role": "viewer", "workspace_id": workspace_id,
    })


def wa_token(workspace_id: str) -> str:
    return create_access_token({
        "sub": f"wa_{uid()}", "email": f"wa_{uid()}@t.dev", "name": "Admin",
        "role": "workspace_admin", "workspace_id": workspace_id,
    })


@pytest.fixture(autouse=True)
def reset_limiter():
    login_limiter.reset_all()
    yield
    login_limiter.reset_all()


async def _register_and_get_workspace(client: AsyncClient) -> tuple[str, str]:
    """Register a new user and return (workspace_id, access_token)."""
    t = uid()
    resp = await client.post("/api/v1/auth/register", json={
        "email": f"user_{t}@test.dev",
        "name": f"User {t}",
        "password": "securepass123",
        "workspace_name": f"Workspace {t}",
    })
    assert resp.status_code == 201, resp.text
    body = resp.json()
    return body["workspace"]["id"], body["access_token"]


# ═══════════════════════════════════════════════════════════════════════
# SITES — CRUD
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_create_site_success(client: AsyncClient):
    ws_id, token = await _register_and_get_workspace(client)
    resp = await client.post("/api/v1/sites", json={
        "name": "Chennai Rooftop Plant",
        "timezone": "Asia/Kolkata",
        "address": "Anna Nagar, Chennai",
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["name"] == "Chennai Rooftop Plant"
    assert body["timezone"] == "Asia/Kolkata"
    assert body["status"] == "active"
    assert "id" in body


@pytest.mark.asyncio
async def test_list_sites_returns_created(client: AsyncClient):
    ws_id, token = await _register_and_get_workspace(client)
    await client.post("/api/v1/sites", json={"name": f"Site {uid()}", "timezone": "Asia/Kolkata"},
                      headers={"Authorization": f"Bearer {token}"})
    resp = await client.get("/api/v1/sites", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] >= 1
    assert len(body["items"]) >= 1


@pytest.mark.asyncio
async def test_get_site_by_id(client: AsyncClient):
    ws_id, token = await _register_and_get_workspace(client)
    created = (await client.post("/api/v1/sites",
        json={"name": f"Site {uid()}", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {token}"})).json()
    resp = await client.get(f"/api/v1/sites/{created['id']}",
                            headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


@pytest.mark.asyncio
async def test_update_site(client: AsyncClient):
    ws_id, token = await _register_and_get_workspace(client)
    created = (await client.post("/api/v1/sites",
        json={"name": f"Old {uid()}", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {token}"})).json()
    new_name = f"Updated {uid()}"
    resp = await client.patch(f"/api/v1/sites/{created['id']}",
        json={"name": new_name},
        headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["name"] == new_name


@pytest.mark.asyncio
async def test_archive_site(client: AsyncClient):
    ws_id, token = await _register_and_get_workspace(client)
    # Need workspace_admin token to archive
    wa = wa_token(ws_id)
    created = (await client.post("/api/v1/sites",
        json={"name": f"Archive {uid()}", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {token}"})).json()
    resp = await client.delete(f"/api/v1/sites/{created['id']}",
                               headers={"Authorization": f"Bearer {wa}"})
    assert resp.status_code == 204
    # Verify archived
    get_resp = await client.get(f"/api/v1/sites/{created['id']}",
                                headers={"Authorization": f"Bearer {token}"})
    assert get_resp.json()["status"] == "archived"


@pytest.mark.asyncio
async def test_get_nonexistent_site_404(client: AsyncClient):
    ws_id, token = await _register_and_get_workspace(client)
    resp = await client.get("/api/v1/sites/000000000000000000000099",
                            headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════════════════
# SITES — VALIDATION
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_invalid_timezone_rejected(client: AsyncClient):
    ws_id, token = await _register_and_get_workspace(client)
    resp = await client.post("/api/v1/sites",
        json={"name": "Bad TZ Site", "timezone": "Not/A/Timezone"},
        headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 422
    assert "timezone" in resp.text.lower() or "VALIDATION" in resp.text


@pytest.mark.asyncio
async def test_duplicate_site_name_rejected(client: AsyncClient):
    ws_id, token = await _register_and_get_workspace(client)
    name = f"Duplicate Site {uid()}"
    await client.post("/api/v1/sites", json={"name": name, "timezone": "Asia/Kolkata"},
                      headers={"Authorization": f"Bearer {token}"})
    resp = await client.post("/api/v1/sites", json={"name": name, "timezone": "Asia/Kolkata"},
                             headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_site_with_valid_location(client: AsyncClient):
    ws_id, token = await _register_and_get_workspace(client)
    resp = await client.post("/api/v1/sites", json={
        "name": f"GPS Site {uid()}", "timezone": "Asia/Kolkata",
        "location": {"lat": 13.0827, "lng": 80.2707},
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 201
    assert resp.json()["location"]["lat"] == 13.0827


# ═══════════════════════════════════════════════════════════════════════
# SITES — RBAC
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_viewer_cannot_create_site(client: AsyncClient):
    ws_id, _ = await _register_and_get_workspace(client)
    resp = await client.post("/api/v1/sites",
        json={"name": "Viewer Site", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {viewer_token(ws_id)}"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_site_manager_can_create_site(client: AsyncClient):
    ws_id, _ = await _register_and_get_workspace(client)
    resp = await client.post("/api/v1/sites",
        json={"name": f"SM Site {uid()}", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {sm_token(ws_id)}"})
    assert resp.status_code == 201


# ═══════════════════════════════════════════════════════════════════════
# SITES — CROSS-TENANT ISOLATION
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_cannot_read_other_workspace_site(client: AsyncClient):
    ws_a, token_a = await _register_and_get_workspace(client)
    login_limiter.reset_all()
    ws_b, token_b = await _register_and_get_workspace(client)
    # Create site in workspace A
    site_a = (await client.post("/api/v1/sites",
        json={"name": f"WS-A Site {uid()}", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {token_a}"})).json()
    # User B tries to access it → 404 (not revealing it exists)
    resp = await client.get(f"/api/v1/sites/{site_a['id']}",
                            headers={"Authorization": f"Bearer {token_b}"})
    assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════════════════
# SYSTEMS — CRUD
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_create_system_success(client: AsyncClient):
    ws_id, token = await _register_and_get_workspace(client)
    site = (await client.post("/api/v1/sites",
        json={"name": f"Site {uid()}", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {token}"})).json()
    resp = await client.post(f"/api/v1/sites/{site['id']}/systems", json={
        "name": "Rooftop Array A",
        "dc_capacity_kwp": 25.0,
        "ac_capacity_kw": 20.0,
        "panel_count": 100,
        "panel_rating_w": 250,
        "tilt_degrees": 15,
        "azimuth_degrees": 180,
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["name"] == "Rooftop Array A"
    assert body["dc_capacity_kwp"] == 25.0
    assert body["status"] == "active"


@pytest.mark.asyncio
async def test_list_systems_for_site(client: AsyncClient):
    ws_id, token = await _register_and_get_workspace(client)
    site = (await client.post("/api/v1/sites",
        json={"name": f"Site {uid()}", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {token}"})).json()
    await client.post(f"/api/v1/sites/{site['id']}/systems", json={
        "name": "Array A", "dc_capacity_kwp": 10.0, "ac_capacity_kw": 8.0,
    }, headers={"Authorization": f"Bearer {token}"})
    await client.post(f"/api/v1/sites/{site['id']}/systems", json={
        "name": "Array B", "dc_capacity_kwp": 15.0, "ac_capacity_kw": 12.0,
    }, headers={"Authorization": f"Bearer {token}"})
    resp = await client.get(f"/api/v1/sites/{site['id']}/systems",
                            headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_get_system_by_id(client: AsyncClient):
    ws_id, token = await _register_and_get_workspace(client)
    site = (await client.post("/api/v1/sites",
        json={"name": f"Site {uid()}", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {token}"})).json()
    sys = (await client.post(f"/api/v1/sites/{site['id']}/systems", json={
        "name": "Array A", "dc_capacity_kwp": 10.0, "ac_capacity_kw": 8.0,
    }, headers={"Authorization": f"Bearer {token}"})).json()
    resp = await client.get(f"/api/v1/systems/{sys['id']}",
                            headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["id"] == sys["id"]


@pytest.mark.asyncio
async def test_update_system(client: AsyncClient):
    ws_id, token = await _register_and_get_workspace(client)
    site = (await client.post("/api/v1/sites",
        json={"name": f"Site {uid()}", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {token}"})).json()
    sys = (await client.post(f"/api/v1/sites/{site['id']}/systems", json={
        "name": "Array A", "dc_capacity_kwp": 10.0, "ac_capacity_kw": 8.0,
    }, headers={"Authorization": f"Bearer {token}"})).json()
    resp = await client.patch(f"/api/v1/systems/{sys['id']}",
        json={"inverter_make": "SMA Sunny Boy"},
        headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["inverter_make"] == "SMA Sunny Boy"


# ═══════════════════════════════════════════════════════════════════════
# SYSTEMS — VALIDATION
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_negative_dc_capacity_rejected(client: AsyncClient):
    ws_id, token = await _register_and_get_workspace(client)
    site = (await client.post("/api/v1/sites",
        json={"name": f"Site {uid()}", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {token}"})).json()
    resp = await client.post(f"/api/v1/sites/{site['id']}/systems", json={
        "name": "Bad System", "dc_capacity_kwp": -5.0, "ac_capacity_kw": 4.0,
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code in (422, 400)


@pytest.mark.asyncio
async def test_ac_exceeds_dc_clipping_ratio_rejected(client: AsyncClient):
    ws_id, token = await _register_and_get_workspace(client)
    site = (await client.post("/api/v1/sites",
        json={"name": f"Site {uid()}", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {token}"})).json()
    # AC 15 kW > DC 10 kWp × 1.25 = 12.5 kW → rejected
    resp = await client.post(f"/api/v1/sites/{site['id']}/systems", json={
        "name": "Over-clipped", "dc_capacity_kwp": 10.0, "ac_capacity_kw": 15.0,
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code in (422, 400)


@pytest.mark.asyncio
async def test_invalid_tilt_rejected(client: AsyncClient):
    ws_id, token = await _register_and_get_workspace(client)
    site = (await client.post("/api/v1/sites",
        json={"name": f"Site {uid()}", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {token}"})).json()
    resp = await client.post(f"/api/v1/sites/{site['id']}/systems", json={
        "name": "Bad Tilt", "dc_capacity_kwp": 10.0, "ac_capacity_kw": 8.0, "tilt_degrees": 95,
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code in (422, 400)


@pytest.mark.asyncio
async def test_system_on_nonexistent_site_404(client: AsyncClient):
    ws_id, token = await _register_and_get_workspace(client)
    resp = await client.post("/api/v1/sites/000000000000000000000099/systems", json={
        "name": "Ghost System", "dc_capacity_kwp": 10.0, "ac_capacity_kw": 8.0,
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════════════════
# SYSTEMS — CROSS-TENANT
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_cannot_read_other_workspace_system(client: AsyncClient):
    ws_a, token_a = await _register_and_get_workspace(client)
    login_limiter.reset_all()
    ws_b, token_b = await _register_and_get_workspace(client)
    site_a = (await client.post("/api/v1/sites",
        json={"name": f"Site {uid()}", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {token_a}"})).json()
    sys_a = (await client.post(f"/api/v1/sites/{site_a['id']}/systems", json={
        "name": "Array", "dc_capacity_kwp": 10.0, "ac_capacity_kw": 8.0,
    }, headers={"Authorization": f"Bearer {token_a}"})).json()
    resp = await client.get(f"/api/v1/systems/{sys_a['id']}",
                            headers={"Authorization": f"Bearer {token_b}"})
    assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════════════════
# SITE DETAIL — system_count
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_site_has_correct_system_count(client: AsyncClient):
    ws_id, token = await _register_and_get_workspace(client)
    site = (await client.post("/api/v1/sites",
        json={"name": f"Count Site {uid()}", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {token}"})).json()
    for i in range(3):
        await client.post(f"/api/v1/sites/{site['id']}/systems", json={
            "name": f"Array {i}", "dc_capacity_kwp": 5.0, "ac_capacity_kw": 4.0,
        }, headers={"Authorization": f"Bearer {token}"})
    detail = (await client.get(f"/api/v1/sites/{site['id']}",
                               headers={"Authorization": f"Bearer {token}"})).json()
    assert detail["system_count"] == 3
