"""Basic smoke tests for Phase 2 — verify app starts and health check works."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/health")
    # Accept 200 (db connected) or 200 with degraded (db not running in CI)
    assert resp.status_code == 200
    body = resp.json()
    assert "status" in body
    assert body["app"] == "SolarScope API"


@pytest.mark.asyncio
async def test_docs_accessible():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/docs")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_unprotected_routes_reject_unauthenticated():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/sites")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_error_format():
    """Standard error response has correct shape."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/sites")
    body = resp.json()
    assert "error" in body
    assert "code" in body["error"]
    assert "message" in body["error"]
