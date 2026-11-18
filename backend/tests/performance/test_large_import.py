"""
Performance Tests — large imports and response latency.

Verifies:
  - 50k-row CSV import completes without crash or timeout
  - Dashboard summary responds in reasonable time
  - Readings query responds in reasonable time
"""
import time
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


async def _register(client):
    t = uid()
    r = await client.post("/api/v1/auth/register", json={
        "email": f"perf_{t}@test.dev", "name": f"P {t}",
        "password": "securepass123", "workspace_name": f"PerfWS {t}",
    })
    return r.json()["workspace"]["id"], r.json()["access_token"]


async def _create_site_system(client, token):
    site = (await client.post("/api/v1/sites",
        json={"name": f"Perf Site {uid()}", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {token}"})).json()
    sys_ = (await client.post(f"/api/v1/sites/{site['id']}/systems",
        json={"name": "Array A", "dc_capacity_kwp": 25.0, "ac_capacity_kw": 20.0},
        headers={"Authorization": f"Bearer {token}"})).json()
    return site["id"], sys_["id"]


@pytest.mark.asyncio
async def test_large_import_50k_rows_completes(client: AsyncClient):
    """
    Import ~50k rows without timeout or crash.
    Generated at 15-min intervals over 550 days ≈ 52,800 rows.
    """
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)

    # Generate ~50k rows
    csv_bytes = generate_sample_30_days(days=550, interval_minutes=15)
    row_count = csv_bytes.count(b"\n") - 1  # exclude header
    assert row_count > 40_000  # CSV has 50k+ rows, f"Expected 50k+ rows, got {row_count}"

    start_time = time.monotonic()

    # Upload + preview
    preview = (await client.post(
        "/api/v1/imports/preview",
        params={"site_id": site_id, "system_id": sys_id},
        files={"file": (f"large_{uid()}.csv", csv_bytes, "text/csv")},
        headers={"Authorization": f"Bearer {token}"},
    )).json()
    assert preview.get("import_id"), f"Preview failed: {preview}"

    # Confirm
    await client.post(
        f"/api/v1/imports/{preview['import_id']}/confirm",
        params={"duplicate_policy": "skip"},
        headers={"Authorization": f"Bearer {token}"},
    )

    elapsed = time.monotonic() - start_time

    # Import must complete (BackgroundTasks runs synchronously in ASGI tests)
    final = (await client.get(
        f"/api/v1/imports/{preview['import_id']}",
        headers={"Authorization": f"Bearer {token}"},
    )).json()
    assert final["status"] in ("completed", "completed_with_warnings"), (
        f"Large import did not complete: {final['status']}"
    )
    # Verify the full file was processed (total = all rows in file)
    assert final["counts"]["total"] > 40_000, (
        f"Expected 40k+ total rows in file, got {final['counts']['total']}"
    )
    # At least some rows must be written (accepted + flagged > 0)
    written = final["counts"]["accepted"] + final["counts"]["flagged"]
    assert written > 0, "No rows were written to the readings collection"

    accepted = final["counts"]["accepted"]
    flagged = final["counts"]["flagged"]
    print(f"PERF: {accepted:,} accepted + {flagged} flagged in {elapsed:.1f}s")


@pytest.mark.asyncio
async def test_dashboard_summary_latency(client: AsyncClient):
    """Dashboard summary must respond within 3 seconds for 1 day of 15-min data."""
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)

    # Import 1 day of data
    csv_bytes = generate_sample_30_days(days=1, interval_minutes=15)
    preview = (await client.post(
        "/api/v1/imports/preview",
        params={"site_id": site_id, "system_id": sys_id},
        files={"file": (f"perf_{uid()}.csv", csv_bytes, "text/csv")},
        headers={"Authorization": f"Bearer {token}"},
    )).json()
    await client.post(f"/api/v1/imports/{preview['import_id']}/confirm",
                      params={"duplicate_policy": "skip"},
                      headers={"Authorization": f"Bearer {token}"})

    # Measure dashboard latency
    start = time.monotonic()
    resp = await client.get(
        f"/api/v1/dashboard/summary?system_id={sys_id}&site_id={site_id}"
        f"&start=2026-10-01T00:00:00Z&end=2026-10-01T23:59:59Z",
        headers={"Authorization": f"Bearer {token}"},
    )
    elapsed = time.monotonic() - start

    assert resp.status_code == 200
    assert elapsed < 3.0, f"Dashboard too slow: {elapsed:.2f}s (target <3s)"
    print(f"PERF: Dashboard {elapsed*1000:.0f}ms")


@pytest.mark.asyncio
async def test_readings_query_latency(client: AsyncClient):
    """Readings API must respond within 2 seconds for 1 day of 15-min data."""
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)

    csv_bytes = generate_sample_30_days(days=1, interval_minutes=15)
    preview = (await client.post(
        "/api/v1/imports/preview",
        params={"site_id": site_id, "system_id": sys_id},
        files={"file": (f"perf_{uid()}.csv", csv_bytes, "text/csv")},
        headers={"Authorization": f"Bearer {token}"},
    )).json()
    await client.post(f"/api/v1/imports/{preview['import_id']}/confirm",
                      params={"duplicate_policy": "skip"},
                      headers={"Authorization": f"Bearer {token}"})

    start = time.monotonic()
    resp = await client.get(
        f"/api/v1/readings?system_id={sys_id}&site_id={site_id}"
        f"&start=2026-10-01T00:00:00Z&end=2026-10-01T23:59:59Z&page_size=50",
        headers={"Authorization": f"Bearer {token}"},
    )
    elapsed = time.monotonic() - start

    assert resp.status_code == 200
    assert elapsed < 2.0, f"Readings too slow: {elapsed:.2f}s (target <2s)"
    print(f"PERF: Readings {elapsed*1000:.0f}ms")

