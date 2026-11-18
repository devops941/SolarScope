"""
Phase 3 Auth Integration Tests — all exit-gate criteria covered.
"""
import uuid
import pytest
from httpx import AsyncClient
from app.core.security import create_access_token
from app.core.middleware import login_limiter


def uid() -> str:
    return uuid.uuid4().hex[:8]


def new_user(prefix: str = "u") -> dict:
    t = uid()
    return {
        "email": f"{prefix}_{t}@test.solarscope.dev",
        "name": f"User {t}",
        "password": "securepass123",
        "workspace_name": f"Workspace {t}",
    }


def _viewer_token() -> str:
    return create_access_token({
        "sub": "viewer_id", "email": "viewer@t.dev", "name": "Viewer",
        "role": "viewer", "workspace_id": "000000000000000000000001",
    })


def _analyst_token() -> str:
    return create_access_token({
        "sub": "analyst_id", "email": "analyst@t.dev", "name": "Analyst",
        "role": "analyst", "workspace_id": "000000000000000000000001",
    })


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset ALL buckets before each test so rate limit never bleeds between tests."""
    login_limiter.reset_all()
    yield
    login_limiter.reset_all()


# 1. Registration
@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    p = new_user("reg")
    resp = await client.post("/api/v1/auth/register", json=p)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert "access_token" in body
    assert body["user"]["email"] == p["email"]
    assert body["workspace"]["name"] == p["workspace_name"]
    assert "password" not in str(body) and "password_hash" not in str(body)


@pytest.mark.asyncio
async def test_register_duplicate_409(client: AsyncClient):
    p = new_user("dup")
    await client.post("/api/v1/auth/register", json=p)
    resp = await client.post("/api/v1/auth/register", json=p)
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "CONFLICT"


# 2. Login
@pytest.mark.asyncio
async def test_login_valid(client: AsyncClient):
    p = new_user("login")
    await client.post("/api/v1/auth/register", json=p)
    resp = await client.post("/api/v1/auth/login", json={"email": p["email"], "password": p["password"]})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password_401(client: AsyncClient):
    p = new_user("bad")
    await client.post("/api/v1/auth/register", json=p)
    resp = await client.post("/api/v1/auth/login", json={"email": p["email"], "password": "WRONG"})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_login_nonexistent_email_401(client: AsyncClient):
    resp = await client.post("/api/v1/auth/login", json={
        "email": f"ghost_{uid()}@nowhere.com", "password": "anypassword",
    })
    assert resp.status_code == 401


# 3. /me
@pytest.mark.asyncio
async def test_me_correct_user(client: AsyncClient):
    p = new_user("me")
    reg = await client.post("/api/v1/auth/register", json=p)
    token = reg.json()["access_token"]
    resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["user"]["email"] == p["email"]
    assert body["workspace"]["name"] == p["workspace_name"]
    assert len(body["permissions"]) > 0


# 4. Protected routes without token
@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", [
    ("GET", "/api/v1/auth/me"),
    ("GET", "/api/v1/sites"),
    ("GET", "/api/v1/alerts"),
])
async def test_no_token_returns_401(method, path, client: AsyncClient):
    resp = await client.request(method, path)
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_malformed_token_401(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer bad.token.here"})
    assert resp.status_code == 401


# 5. RBAC
@pytest.mark.asyncio
async def test_viewer_cannot_create_site(client: AsyncClient):
    resp = await client.post(
        "/api/v1/sites",
        json={"name": "Site", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {_viewer_token()}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_analyst_cannot_upload(client: AsyncClient):
    resp = await client.post(
        "/api/v1/imports/preview",
        headers={"Authorization": f"Bearer {_analyst_token()}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_viewer_cannot_acknowledge_alert(client: AsyncClient):
    resp = await client.patch(
        "/api/v1/alerts/fakeid",
        json={"status": "acknowledged"},
        headers={"Authorization": f"Bearer {_viewer_token()}"},
    )
    assert resp.status_code == 403


# 6. Cross-tenant isolation
@pytest.mark.asyncio
async def test_cross_tenant_me_returns_own_workspace(client: AsyncClient):
    pa, pb = new_user("ta"), new_user("tb")
    reg_a = await client.post("/api/v1/auth/register", json=pa)
    login_limiter.reset_all()
    reg_b = await client.post("/api/v1/auth/register", json=pb)
    assert reg_a.status_code == 201, reg_a.text
    assert reg_b.status_code == 201, reg_b.text
    token_a = reg_a.json()["access_token"]
    ws_b_id = reg_b.json()["workspace"]["id"]
    resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_a}"})
    assert resp.json()["workspace"]["id"] != ws_b_id


# 7. Logout
@pytest.mark.asyncio
async def test_logout_204(client: AsyncClient):
    p = new_user("lo")
    reg = await client.post("/api/v1/auth/register", json=p)
    assert reg.status_code == 201, reg.text
    token = reg.json()["access_token"]
    resp = await client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 204


# 8. Error response format
@pytest.mark.asyncio
async def test_error_format(client: AsyncClient):
    resp = await client.post("/api/v1/auth/login", json={
        "email": f"nobody_{uid()}@x.com", "password": "wrong",
    })
    body = resp.json()
    assert "error" in body
    assert {"code", "message", "details"} <= body["error"].keys()


# 9. Password hashing end-to-end
@pytest.mark.asyncio
async def test_password_case_sensitive(client: AsyncClient):
    p = new_user("cs")
    await client.post("/api/v1/auth/register", json=p)
    login_limiter.reset_all()
    r1 = await client.post("/api/v1/auth/login", json={"email": p["email"], "password": p["password"]})
    assert r1.status_code == 200, r1.text
    r2 = await client.post("/api/v1/auth/login", json={"email": p["email"], "password": p["password"].upper()})
    assert r2.status_code == 401


# 10. Rate limiting — uses autouse fixture for cleanup
@pytest.mark.asyncio
async def test_rate_limiter_429_after_10(client: AsyncClient):
    codes = []
    for _ in range(13):
        r = await client.post("/api/v1/auth/login", json={
            "email": f"brute_{uid()}@x.com", "password": "wrong",
        })
        codes.append(r.status_code)
    assert 429 in codes, f"No 429 seen in {codes}"
