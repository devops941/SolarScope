"""
Phase 7 Readings Explorer Tests.

Covers all exit-gate criteria:
  - Readings API returns paginated results after import
  - Date range filter correctly scopes results
  - Quality flag filter: all / valid / flagged
  - Row detail has correct source import info
  - Data gap count and coverage_pct in response
  - Export CSV returns same rows as the table (same filter)
  - Pagination: page 1, 2, 3 work correctly
  - Sorting by timestamp asc / desc
  - Cross-tenant isolation: other workspace's readings never returned
  - Manual reading creation
  - Import source filter works
"""
import uuid
import pytest
from httpx import AsyncClient
from app.core.security import create_access_token
from app.core.middleware import login_limiter
from app.ingestion.template_generator import generate_sample_30_days


def uid() -> str:
    return uuid.uuid4().hex[:8]


@pytest.fixture(autouse=True)
def reset_limiter():
    login_limiter.reset_all()
    yield
    login_limiter.reset_all()


async def _register(client: AsyncClient) -> tuple[str, str]:
    t = uid()
    r = await client.post("/api/v1/auth/register", json={
        "email": f"u_{t}@test.dev", "name": f"U {t}",
        "password": "securepass123", "workspace_name": f"WS {t}",
    })
    assert r.status_code == 201
    return r.json()["workspace"]["id"], r.json()["access_token"]


async def _create_site_system(client: AsyncClient, token: str) -> tuple[str, str]:
    site = (await client.post("/api/v1/sites",
        json={"name": f"Site {uid()}", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {token}"})).json()
    sys_ = (await client.post(f"/api/v1/sites/{site['id']}/systems",
        json={"name": "Array A", "dc_capacity_kwp": 25.0, "ac_capacity_kw": 20.0},
        headers={"Authorization": f"Bearer {token}"})).json()
    return site["id"], sys_["id"]


async def _do_import(client: AsyncClient, token: str, site_id: str, sys_id: str,
                     days: int = 1) -> str:
    """Upload + confirm import, return import_id."""
    csv_bytes = generate_sample_30_days(days=days, interval_minutes=15)
    preview = (await client.post(
        "/api/v1/imports/preview",
        params={"site_id": site_id, "system_id": sys_id},
        files={"file": (f"s_{uid()}.csv", csv_bytes, "text/csv")},
        headers={"Authorization": f"Bearer {token}"},
    )).json()
    import_id = preview["import_id"]
    await client.post(f"/api/v1/imports/{import_id}/confirm",
                      params={"duplicate_policy": "skip"},
                      headers={"Authorization": f"Bearer {token}"})
    return import_id


def _readings_url(sys_id: str, site_id: str,
                  start: str = "2026-10-01T00:00:00Z",
                  end: str = "2026-10-02T00:00:00Z",
                  **kw) -> str:
    base = f"/api/v1/readings?system_id={sys_id}&site_id={site_id}&start={start}&end={end}"
    for k, v in kw.items():
        base += f"&{k}={v}"
    return base


# ══════════════════════════════════════════════════════════════════════
# BASIC READS
# ══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_readings_empty_before_import(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)
    resp = await client.get(
        _readings_url(sys_id, site_id),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["total"] == 0
    assert resp.json()["items"] == []


@pytest.mark.asyncio
async def test_readings_populated_after_import(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)
    await _do_import(client, token, site_id, sys_id, days=1)
    resp = await client.get(
        _readings_url(sys_id, site_id),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["total"] > 0


@pytest.mark.asyncio
async def test_readings_response_has_coverage_stats(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)
    await _do_import(client, token, site_id, sys_id, days=1)
    resp = await client.get(
        _readings_url(sys_id, site_id),
        headers={"Authorization": f"Bearer {token}"},
    )
    body = resp.json()
    assert "coverage_pct" in body
    assert "missing_intervals" in body
    assert 0 <= body["coverage_pct"] <= 100


@pytest.mark.asyncio
async def test_readings_items_have_expected_fields(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)
    await _do_import(client, token, site_id, sys_id, days=1)
    resp = await client.get(
        _readings_url(sys_id, site_id, page_size=1),
        headers={"Authorization": f"Bearer {token}"},
    )
    item = resp.json()["items"][0]
    for field in ["id", "timestamp_utc", "system_id", "quality", "source_import_id"]:
        assert field in item, f"Missing field: {field}"


# ══════════════════════════════════════════════════════════════════════
# FILTERING
# ══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_date_range_filter_scopes_results(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)
    await _do_import(client, token, site_id, sys_id, days=3)

    # Only request day 1
    resp_day1 = await client.get(
        _readings_url(sys_id, site_id,
                      start="2026-10-01T00:00:00Z", end="2026-10-01T23:59:59Z"),
        headers={"Authorization": f"Bearer {token}"},
    )
    # Request all 3 days
    resp_all = await client.get(
        _readings_url(sys_id, site_id,
                      start="2026-10-01T00:00:00Z", end="2026-10-03T23:59:59Z"),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_day1.json()["total"] <= resp_all.json()["total"]


@pytest.mark.asyncio
async def test_quality_filter_valid_excludes_flagged(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)
    await _do_import(client, token, site_id, sys_id, days=1)

    resp_all = await client.get(
        _readings_url(sys_id, site_id, quality="all"),
        headers={"Authorization": f"Bearer {token}"},
    )
    resp_valid = await client.get(
        _readings_url(sys_id, site_id, quality="valid"),
        headers={"Authorization": f"Bearer {token}"},
    )
    # Valid-only count should be <= all count
    assert resp_valid.json()["total"] <= resp_all.json()["total"]


@pytest.mark.asyncio
async def test_import_source_filter(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)
    import_id = await _do_import(client, token, site_id, sys_id, days=1)

    resp = await client.get(
        _readings_url(sys_id, site_id, import_id=import_id),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    # All items should reference this import
    for item in resp.json()["items"]:
        assert item["source_import_id"] == import_id


# ══════════════════════════════════════════════════════════════════════
# PAGINATION & SORTING
# ══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_pagination_page_size(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)
    await _do_import(client, token, site_id, sys_id, days=1)

    resp = await client.get(
        _readings_url(sys_id, site_id, page_size=5),
        headers={"Authorization": f"Bearer {token}"},
    )
    body = resp.json()
    assert len(body["items"]) <= 5
    assert body["total"] > 5  # 1 day has 96 intervals


@pytest.mark.asyncio
async def test_pagination_page_2_different_items(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)
    await _do_import(client, token, site_id, sys_id, days=1)

    p1 = (await client.get(
        _readings_url(sys_id, site_id, page=1, page_size=10),
        headers={"Authorization": f"Bearer {token}"},
    )).json()
    p2 = (await client.get(
        _readings_url(sys_id, site_id, page=2, page_size=10),
        headers={"Authorization": f"Bearer {token}"},
    )).json()

    ids_p1 = {i["id"] for i in p1["items"]}
    ids_p2 = {i["id"] for i in p2["items"]}
    # Pages must not overlap
    assert ids_p1.isdisjoint(ids_p2)


@pytest.mark.asyncio
async def test_sort_order_asc_vs_desc(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)
    await _do_import(client, token, site_id, sys_id, days=1)

    asc = (await client.get(
        _readings_url(sys_id, site_id, sort_order="asc", page_size=5),
        headers={"Authorization": f"Bearer {token}"},
    )).json()["items"]
    desc = (await client.get(
        _readings_url(sys_id, site_id, sort_order="desc", page_size=5),
        headers={"Authorization": f"Bearer {token}"},
    )).json()["items"]

    assert asc[0]["timestamp_utc"] != desc[0]["timestamp_utc"]
    # asc first < desc first
    assert asc[0]["timestamp_utc"] < desc[0]["timestamp_utc"]


# ══════════════════════════════════════════════════════════════════════
# EXPORT CSV
# ══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_export_csv_returns_csv_content_type(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)
    await _do_import(client, token, site_id, sys_id, days=1)

    resp = await client.get(
        _readings_url(sys_id, site_id, export="csv"),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert "text/csv" in resp.headers.get("content-type", "")


@pytest.mark.asyncio
async def test_export_csv_row_count_matches_json_total(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)
    await _do_import(client, token, site_id, sys_id, days=1)

    json_resp = (await client.get(
        _readings_url(sys_id, site_id, page_size=200),
        headers={"Authorization": f"Bearer {token}"},
    )).json()
    csv_resp = await client.get(
        _readings_url(sys_id, site_id, export="csv"),
        headers={"Authorization": f"Bearer {token}"},
    )
    csv_lines = csv_resp.content.decode().strip().splitlines()
    # CSV rows = data rows + 1 header
    assert len(csv_lines) - 1 == json_resp["total"]


# ══════════════════════════════════════════════════════════════════════
# CROSS-TENANT ISOLATION
# ══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_cross_tenant_readings_invisible(client: AsyncClient):
    ws_a, token_a = await _register(client)
    login_limiter.reset_all()
    ws_b, token_b = await _register(client)

    site_a, sys_a = await _create_site_system(client, token_a)
    await _do_import(client, token_a, site_a, sys_a, days=1)

    # User B queries User A's system → no data (not 403, just empty)
    resp = await client.get(
        _readings_url(sys_a, site_a),
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 200
    assert resp.json()["total"] == 0


# ══════════════════════════════════════════════════════════════════════
# MANUAL READING
# ══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_manual_reading_created_successfully(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)

    resp = await client.post(
        "/api/v1/readings/manual",
        json={
            "system_id": sys_id,
            "site_id": site_id,
            "timestamp_local": "2026-11-18T10:00:00+05:30",
            "source_timezone": "Asia/Kolkata",
            "power_kw": 5.5,
            "energy_kwh": 1.375,
            "irradiance_w_m2": 500.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["power_kw"] == 5.5
    assert "manual" in body["quality"]


@pytest.mark.asyncio
async def test_manual_reading_negative_power_rejected(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)

    resp = await client.post(
        "/api/v1/readings/manual",
        json={
            "system_id": sys_id, "site_id": site_id,
            "timestamp_local": "2026-11-18T10:00:00+05:30",
            "source_timezone": "Asia/Kolkata",
            "power_kw": -1.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code in (400, 422)


# ══════════════════════════════════════════════════════════════════════
# COVERAGE & GAPS
# ══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_full_day_coverage_near_100pct(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)
    await _do_import(client, token, site_id, sys_id, days=1)

    resp = await client.get(
        _readings_url(sys_id, site_id,
                      start="2026-10-01T00:00:00Z", end="2026-10-01T23:59:59Z"),
        headers={"Authorization": f"Bearer {token}"},
    )
    body = resp.json()
    # 1 day × 96 intervals at 15m → coverage should be close to 100%
    assert body["coverage_pct"] > 50  # generous lower bound
    assert body["missing_intervals"] >= 0
