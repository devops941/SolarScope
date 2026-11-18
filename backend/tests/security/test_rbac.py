"""
RBAC (Role-Based Access Control) security tests.

Verifies that every role can only perform the actions it is authorized for.
Tests both "can do" and "cannot do" scenarios for each role.

Role hierarchy: viewer(0) < analyst(1) < site_manager(2) < workspace_admin(3) < platform_admin(4)
"""
import uuid
import pytest
from httpx import AsyncClient
from app.core.security import create_access_token
from app.core.middleware import login_limiter
from app.ingestion.template_generator import generate_sample_30_days


def uid():
    return uuid.uuid4().hex[:8]


@pytest.fixture(autouse=True)
def reset_limiter():
    login_limiter.reset_all()
    yield
    login_limiter.reset_all()


async def _register(client):
    t = uid()
    r = await client.post("/api/v1/auth/register", json={
        "email": f"u_{t}@test.dev", "name": f"U {t}",
        "password": "securepass123", "workspace_name": f"WS {t}",
    })
    assert r.status_code == 201
    return r.json()["workspace"]["id"], r.json()["access_token"]


def _token(role, workspace_id):
    return create_access_token({
        "sub": f"{role}_{uid()}", "email": f"{role}@t.dev",
        "name": role, "role": role, "workspace_id": workspace_id,
    })


async def _create_site(client, token, ws_id=None):
    return (await client.post("/api/v1/sites",
        json={"name": f"Site {uid()}", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {token}"}))


# ══════════════════════════════════════════════════════════════════════
# VIEWER ROLE
# ══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_viewer_can_read_dashboard(client: AsyncClient):
    ws_id, wa_token = await _register(client)
    viewer = _token("viewer", ws_id)
    site = (await _create_site(client, wa_token)).json()
    sys_ = (await client.post(f"/api/v1/sites/{site["id"]}/systems",
        json={"name": "A", "dc_capacity_kwp": 10.0, "ac_capacity_kw": 8.0},
        headers={"Authorization": f"Bearer {wa_token}"})).json()
    # Viewer can call dashboard (empty data, but not 403)
    resp = await client.get(
        f"/api/v1/dashboard/summary?system_id={sys_["id"]}&site_id={site["id"]}"
        f"&start=2026-10-01T00:00:00Z&end=2026-10-01T23:59:59Z",
        headers={"Authorization": f"Bearer {viewer}"},
    )
    assert resp.status_code not in (403, 401), f"Viewer should be able to read dashboard: {resp.status_code}"


@pytest.mark.asyncio
async def test_viewer_cannot_create_site(client: AsyncClient):
    ws_id, _ = await _register(client)
    resp = await _create_site(client, _token("viewer", ws_id))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_viewer_cannot_import_csv(client: AsyncClient):
    ws_id, token_admin = await _register(client)
    site = (await _create_site(client, token_admin)).json()
    sys_ = (await client.post(f"/api/v1/sites/{site['id']}/systems",
        json={"name": "A", "dc_capacity_kwp": 10.0, "ac_capacity_kw": 8.0},
        headers={"Authorization": f"Bearer {token_admin}"})).json()

    csv_bytes = generate_sample_30_days(days=1, interval_minutes=15)
    resp = await client.post(
        "/api/v1/imports/preview",
        params={"site_id": site["id"], "system_id": sys_["id"]},
        files={"file": ("s.csv", csv_bytes, "text/csv")},
        headers={"Authorization": f"Bearer {_token('viewer', ws_id)}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_viewer_cannot_acknowledge_alert(client: AsyncClient):
    ws_id, _ = await _register(client)
    resp = await client.patch(
        "/api/v1/alerts/fakealertid",
        json={"status": "acknowledged"},
        headers={"Authorization": f"Bearer {_token('viewer', ws_id)}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_viewer_cannot_create_report(client: AsyncClient):
    ws_id, _ = await _register(client)
    resp = await client.post(
        "/api/v1/reports?analysis_run_id=fakerunid&format=pdf",
        headers={"Authorization": f"Bearer {_token('viewer', ws_id)}"},
    )
    assert resp.status_code == 403


# ══════════════════════════════════════════════════════════════════════
# ANALYST ROLE
# ══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_analyst_can_create_analytics_run(client: AsyncClient):
    ws_id, _ = await _register(client)
    # Analyst can create analytics runs (endpoint returns 404 for fake system, not 403)
    resp = await client.post(
        "/api/v1/analytics/runs?system_id=fakeid&start=2026-10-01T00:00:00Z&end=2026-10-01T23:59:59Z",
        headers={"Authorization": f"Bearer {_token('analyst', ws_id)}"},
    )
    assert resp.status_code != 403, "Analyst should be able to create analytics runs"


@pytest.mark.asyncio
async def test_analyst_cannot_create_site(client: AsyncClient):
    ws_id, _ = await _register(client)
    resp = await _create_site(client, _token("analyst", ws_id))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_analyst_cannot_import_csv(client: AsyncClient):
    ws_id, _ = await _register(client)
    csv_bytes = b"timestamp,power_kw\n2026-10-01T00:00:00Z,4.2\n"
    resp = await client.post(
        "/api/v1/imports/preview",
        params={"site_id": "fake", "system_id": "fake"},
        files={"file": ("s.csv", csv_bytes, "text/csv")},
        headers={"Authorization": f"Bearer {_token('analyst', ws_id)}"},
    )
    assert resp.status_code == 403


# ══════════════════════════════════════════════════════════════════════
# SITE MANAGER ROLE
# ══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_site_manager_can_create_site(client: AsyncClient):
    ws_id, _ = await _register(client)
    resp = await _create_site(client, _token("site_manager", ws_id))
    assert resp.status_code == 201, f"Site manager should create site: {resp.text}"


@pytest.mark.asyncio
async def test_site_manager_cannot_archive_site(client: AsyncClient):
    """Archiving requires workspace_admin."""
    ws_id, wa_token = await _register(client)
    site = (await _create_site(client, wa_token)).json()
    resp = await client.delete(
        f"/api/v1/sites/{site['id']}",
        headers={"Authorization": f"Bearer {_token('site_manager', ws_id)}"},
    )
    assert resp.status_code == 403


# ══════════════════════════════════════════════════════════════════════
# TOKEN FORGERY PROTECTION
# ══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_forged_role_in_token_rejected(client: AsyncClient):
    """A token with an invalid role string is rejected."""
    from app.core.security import create_access_token
    # Create token with made-up "superadmin" role
    bad_token = create_access_token({
        "sub": "attacker", "email": "hack@evil.com", "name": "Hacker",
        "role": "superadmin",  # not a valid role
        "workspace_id": "000000000000000000000001",
    })
    resp = await client.post(
        "/api/v1/sites",
        json={"name": "Hack Site", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {bad_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_expired_token_rejected(client: AsyncClient):
    """Tokens with exp in the past must be rejected."""
    import time
    from jose import jwt
    from app.core.config import get_settings
    s = get_settings()
    # Create already-expired token
    past_exp = int(time.time()) - 3600  # 1 hour ago
    expired = jwt.encode(
        {"sub": "u", "email": "u@t.dev", "name": "U", "role": "analyst",
         "workspace_id": "000000000000000000000001", "exp": past_exp, "type": "access"},
        s.JWT_SECRET, algorithm=s.JWT_ALGORITHM,
    )
    resp = await client.get("/api/v1/auth/me",
                            headers={"Authorization": f"Bearer {expired}"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_rejected_as_access(client: AsyncClient):
    """A refresh token must not be accepted as an access token."""
    from app.core.security import create_refresh_token
    refresh = create_refresh_token({
        "sub": "u", "email": "u@t.dev", "name": "U", "role": "analyst",
        "workspace_id": "000000000000000000000001",
    })
    resp = await client.get("/api/v1/auth/me",
                            headers={"Authorization": f"Bearer {refresh}"})
    assert resp.status_code == 401

