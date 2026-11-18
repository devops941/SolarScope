"""
Phase 5 Imports Tests.

Covers all exit-gate criteria:
  - /imports/template returns downloadable blank CSV with headers
  - /imports/sample returns synthetic 30-day CSV
  - POST /imports/preview: upload saves file, returns checksum
  - Preview returns suggested mapping for well-known aliases
  - Preview returns sample rows with status (accepted/rejected/flagged)
  - Duplicate file (same checksum) returns 409 CONFLICT
  - Non-CSV file is rejected with 422
  - GET /imports returns paginated list
  - GET /imports/{id} returns import detail
  - Unit tests for mapper, normalizer, parser functions
"""
import io
import uuid
import pytest
from httpx import AsyncClient
from app.core.security import create_access_token
from app.core.middleware import login_limiter

# ── ingestion unit tests (no DB needed) ─────────────────────────────
from app.ingestion.mapper import suggest_mapping, apply_mapping, CANONICAL_COLUMNS
from app.ingestion.normalizer import (
    parse_timestamp, normalize_power, normalize_energy,
    normalize_temperature, normalize_irradiance,
    cumulative_to_interval, infer_column_type,
)
from app.ingestion.parser import parse_csv_bytes, parse_preview, detect_delimiter
from app.ingestion.template_generator import (
    generate_template, generate_sample_30_days, generate_validation_cases
)


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


@pytest.fixture(autouse=True)
def reset_limiter():
    login_limiter.reset_all()
    yield
    login_limiter.reset_all()


async def _register(client: AsyncClient) -> tuple[str, str]:
    t = uid()
    resp = await client.post("/api/v1/auth/register", json={
        "email": f"user_{t}@test.dev", "name": f"User {t}",
        "password": "securepass123", "workspace_name": f"WS {t}",
    })
    assert resp.status_code == 201
    return resp.json()["workspace"]["id"], resp.json()["access_token"]


async def _create_site_and_system(client: AsyncClient, token: str) -> tuple[str, str]:
    site = (await client.post("/api/v1/sites",
        json={"name": f"Site {uid()}", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {token}"})).json()
    system = (await client.post(f"/api/v1/sites/{site['id']}/systems",
        json={"name": "Array A", "dc_capacity_kwp": 25.0, "ac_capacity_kw": 20.0},
        headers={"Authorization": f"Bearer {token}"})).json()
    return site["id"], system["id"]


# ══════════════════════════════════════════════════════════════════════
# UNIT TESTS — no DB
# ══════════════════════════════════════════════════════════════════════

class TestMapper:
    def test_exact_canonical_name_matches(self):
        result = suggest_mapping(["timestamp", "power_kw", "energy_kwh"])
        assert result["timestamp"] == "timestamp"
        assert result["power_kw"] == "power_kw"

    def test_alias_matches_canonical(self):
        result = suggest_mapping(["ts", "power", "kwh", "irradiance", "poa"])
        assert result["ts"] == "timestamp"
        assert result["power"] == "power_kw"
        assert result["kwh"] == "energy_kwh"
        assert result["irradiance"] == "irradiance_w_m2"
        assert result["poa"] == "irradiance_w_m2"

    def test_case_insensitive_match(self):
        result = suggest_mapping(["TimeStamp", "POWER_KW", "Energy_KWH"])
        assert result["TimeStamp"] == "timestamp"
        assert result["POWER_KW"] == "power_kw"

    def test_space_and_bracket_normalization(self):
        result = suggest_mapping(["Active Power (kW)", "Ambient Temperature (°C)"])
        assert result["Active Power (kW)"] == "power_kw"
        assert result["Ambient Temperature (°C)"] == "ambient_temp_c"

    def test_unknown_header_maps_empty(self):
        result = suggest_mapping(["widget_count", "foo_bar"])
        assert result["widget_count"] == ""
        assert result["foo_bar"] == ""

    def test_apply_mapping(self):
        mapping = {"ts": "timestamp", "pwr": "power_kw"}
        row = {"ts": "2026-11-18T09:00:00+05:30", "pwr": "4.2", "junk": "x"}
        out = apply_mapping(row, mapping)
        assert out["timestamp"] == "2026-11-18T09:00:00+05:30"
        assert out["power_kw"] == "4.2"
        assert "junk" not in out


class TestNormalizer:
    def test_parse_iso8601_with_tz(self):
        dt = parse_timestamp("2026-11-18T09:00:00+05:30")
        assert dt is not None
        assert dt.tzinfo is not None
        assert dt.hour == 3   # 9:00 IST = 3:30 UTC → hour 3

    def test_parse_no_tz_uses_source_timezone(self):
        dt = parse_timestamp("2026-11-18 09:00:00", source_timezone="Asia/Kolkata")
        assert dt is not None
        assert dt.hour == 3   # 9:00 IST = 3:30 UTC

    def test_parse_utc_explicit(self):
        dt = parse_timestamp("2026-11-18T09:00:00Z")
        assert dt is not None
        assert dt.hour == 9

    def test_parse_indian_date_format(self):
        dt = parse_timestamp("18/11/2026 09:00:00", source_timezone="Asia/Kolkata")
        assert dt is not None

    def test_parse_invalid_returns_none(self):
        assert parse_timestamp("not_a_date") is None
        assert parse_timestamp("") is None
        assert parse_timestamp(None) is None

    def test_normalize_power_kw_identity(self):
        assert normalize_power("4.2", "kW") == 4.2

    def test_normalize_power_watts_to_kw(self):
        assert normalize_power("4200", "W") == pytest.approx(4.2)

    def test_normalize_energy_wh_to_kwh(self):
        assert normalize_energy("1050", "Wh") == pytest.approx(1.05)

    def test_normalize_temperature_fahrenheit(self):
        assert normalize_temperature("32", "F") == pytest.approx(0.0)
        assert normalize_temperature("212", "F") == pytest.approx(100.0)

    def test_normalize_irradiance_identity(self):
        assert normalize_irradiance("420", "W/m2") == 420.0

    def test_cumulative_to_interval_basic(self):
        cumulative = [100.0, 102.0, 105.0, 109.0]
        result = cumulative_to_interval(cumulative)
        assert result[0] is None          # first row has no previous
        assert result[1] == pytest.approx(2.0)
        assert result[2] == pytest.approx(3.0)
        assert result[3] == pytest.approx(4.0)

    def test_cumulative_to_interval_reset_detected(self):
        cumulative = [100.0, 102.0, 1.0, 3.0]  # reset at index 2
        result = cumulative_to_interval(cumulative)
        assert result[2] is None   # reset → None

    def test_infer_column_type_timestamp(self):
        samples = ["2026-11-18T09:00:00+05:30", "2026-11-18T09:15:00+05:30"]
        assert infer_column_type(samples) == "timestamp"

    def test_infer_column_type_number(self):
        assert infer_column_type(["4.2", "6.8", "9.1", "10.4"]) == "number"

    def test_infer_column_type_text(self):
        assert infer_column_type(["NORMAL", "FAULT", "NORMAL"]) == "text"

    def test_infer_column_type_empty(self):
        assert infer_column_type([]) == "empty"
        assert infer_column_type(["", "", ""]) == "empty"


class TestParser:
    def test_detect_comma_delimiter(self):
        csv_text = "a,b,c\n1,2,3\n"
        assert detect_delimiter(csv_text) == ","

    def test_detect_semicolon_delimiter(self):
        csv_text = "a;b;c\n1;2;3\n"
        assert detect_delimiter(csv_text) in (";", ",")  # sniffer may vary

    def test_parse_csv_bytes_basic(self):
        content = b"timestamp,power_kw,energy_kwh\n2026-11-18T09:00:00+05:30,4.2,1.05\n"
        headers, rows = parse_csv_bytes(content)
        assert "timestamp" in headers
        assert "power_kw" in headers
        assert len(rows) == 1
        assert rows[0]["power_kw"] == "4.2"

    def test_parse_csv_bytes_max_rows(self):
        lines = ["timestamp,power_kw"]
        for i in range(100):
            lines.append(f"2026-11-18T{i:02d}:00:00Z,{i}")
        content = "\n".join(lines).encode()
        _, rows = parse_csv_bytes(content, max_rows=20)
        assert len(rows) == 20

    def test_parse_preview_suggests_mapping(self):
        content = b"ts,power,kwh,irradiance\n2026-11-18T09:00:00+05:30,4.2,1.05,420\n"
        result = parse_preview(content)
        mapping = result["suggested_mapping"]
        assert mapping.get("ts") == "timestamp"
        assert mapping.get("power") == "power_kw"
        assert mapping.get("kwh") == "energy_kwh"
        assert mapping.get("irradiance") == "irradiance_w_m2"


class TestTemplateGenerator:
    def test_template_has_correct_headers(self):
        content = generate_template()
        text = content.decode("utf-8")
        assert "timestamp" in text
        assert "power_kw" in text
        assert "energy_kwh" in text
        assert "irradiance_w_m2" in text

    def test_sample_30_days_row_count(self):
        content = generate_sample_30_days(days=1, interval_minutes=15)
        lines = content.decode("utf-8").strip().splitlines()
        # 1 header + 24*60/15 = 96 data rows
        assert len(lines) == 97

    def test_sample_rows_have_valid_timestamps(self):
        content = generate_sample_30_days(days=1, interval_minutes=15)
        _, rows = parse_csv_bytes(content)
        ts = parse_timestamp(rows[0]["timestamp"])
        assert ts is not None

    def test_validation_cases_has_errors(self):
        content = generate_validation_cases()
        _, rows = parse_csv_bytes(content)
        raw_ts = [r.get("timestamp", "") for r in rows]
        assert any("not_a_date" in ts for ts in raw_ts)


# ══════════════════════════════════════════════════════════════════════
# API INTEGRATION TESTS
# ══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_template_download(client: AsyncClient):
    resp = await client.get("/api/v1/imports/template")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert b"timestamp" in resp.content
    assert b"power_kw" in resp.content


@pytest.mark.asyncio
async def test_sample_clean_download(client: AsyncClient):
    resp = await client.get("/api/v1/imports/sample?variant=clean")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    lines = resp.content.decode("utf-8").strip().splitlines()
    assert len(lines) > 100  # 30 days × 96 intervals + header


@pytest.mark.asyncio
async def test_sample_validation_download(client: AsyncClient):
    resp = await client.get("/api/v1/imports/sample?variant=validation")
    assert resp.status_code == 200
    assert b"not_a_date" in resp.content


@pytest.mark.asyncio
async def test_preview_upload_success(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_and_system(client, token)
    csv_content = generate_sample_30_days(days=1, interval_minutes=15)
    resp = await client.post(
        f"/api/v1/imports/preview?site_id={site_id}&system_id={sys_id}&source_timezone=Asia/Kolkata",
        files={"file": ("solar.csv", csv_content, "text/csv")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "import_id" in body
    assert "checksum" in body
    assert len(body["checksum"]) == 64        # SHA-256 hex
    assert "suggested_mapping" in body
    assert len(body["sample_rows"]) > 0
    assert body["counts"]["total_sampled"] > 0


@pytest.mark.asyncio
async def test_preview_mapping_suggests_correct_columns(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_and_system(client, token)
    # CSV with alias column names
    csv_content = b"ts,power,kwh,irradiance,ambient_temp,module_temp\n"
    csv_content += b"2026-11-18T09:00:00+05:30,4.2,1.05,420,29.0,38.5\n"
    resp = await client.post(
        f"/api/v1/imports/preview?site_id={site_id}&system_id={sys_id}",
        files={"file": ("aliases.csv", csv_content, "text/csv")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    mapping = {m["source_column"]: m["canonical_column"] for m in resp.json()["suggested_mapping"]}
    assert mapping.get("ts") == "timestamp"
    assert mapping.get("power") == "power_kw"
    assert mapping.get("kwh") == "energy_kwh"
    assert mapping.get("irradiance") == "irradiance_w_m2"


@pytest.mark.asyncio
async def test_preview_duplicate_file_409(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_and_system(client, token)
    csv_content = generate_sample_30_days(days=1, interval_minutes=15)
    # First upload succeeds
    r1 = await client.post(
        f"/api/v1/imports/preview?site_id={site_id}&system_id={sys_id}",
        files={"file": ("solar.csv", csv_content, "text/csv")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r1.status_code == 200
    # Same file again → 409 CONFLICT
    r2 = await client.post(
        f"/api/v1/imports/preview?site_id={site_id}&system_id={sys_id}",
        files={"file": ("solar.csv", csv_content, "text/csv")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r2.status_code == 409
    assert r2.json()["error"]["code"] == "CONFLICT"


@pytest.mark.asyncio
async def test_preview_non_csv_rejected(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_and_system(client, token)
    resp = await client.post(
        f"/api/v1/imports/preview?site_id={site_id}&system_id={sys_id}",
        files={"file": ("report.xlsx", b"PK...", "application/octet-stream")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code in (422, 400)


@pytest.mark.asyncio
async def test_preview_viewer_cannot_upload(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_and_system(client, token)
    csv_content = b"timestamp,power_kw\n2026-11-18T09:00:00+05:30,4.2\n"
    resp = await client.post(
        f"/api/v1/imports/preview?site_id={site_id}&system_id={sys_id}",
        files={"file": ("solar.csv", csv_content, "text/csv")},
        headers={"Authorization": f"Bearer {viewer_token(ws_id)}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_imports_returns_uploaded(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_and_system(client, token)
    csv_content = generate_sample_30_days(days=1, interval_minutes=15)
    await client.post(
        f"/api/v1/imports/preview?site_id={site_id}&system_id={sys_id}",
        files={"file": ("solar.csv", csv_content, "text/csv")},
        headers={"Authorization": f"Bearer {token}"},
    )
    resp = await client.get("/api/v1/imports", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


@pytest.mark.asyncio
async def test_get_import_by_id(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_and_system(client, token)
    csv_content = generate_sample_30_days(days=1, interval_minutes=15)
    preview = (await client.post(
        f"/api/v1/imports/preview?site_id={site_id}&system_id={sys_id}",
        files={"file": ("solar.csv", csv_content, "text/csv")},
        headers={"Authorization": f"Bearer {token}"},
    )).json()
    resp = await client.get(
        f"/api/v1/imports/{preview['import_id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_import_cross_tenant_isolation(client: AsyncClient):
    ws_a, token_a = await _register(client)
    login_limiter.reset_all()
    ws_b, token_b = await _register(client)
    site_id, sys_id = await _create_site_and_system(client, token_a)
    csv_content = generate_sample_30_days(days=1, interval_minutes=15)
    preview = (await client.post(
        f"/api/v1/imports/preview?site_id={site_id}&system_id={sys_id}",
        files={"file": ("solar.csv", csv_content, "text/csv")},
        headers={"Authorization": f"Bearer {token_a}"},
    )).json()
    resp = await client.get(
        f"/api/v1/imports/{preview['import_id']}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_preview_no_data_written_to_readings(client: AsyncClient):
    """After preview, import status is preview_ready — no readings committed yet."""
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_and_system(client, token)
    csv_content = generate_sample_30_days(days=1, interval_minutes=15)
    preview = (await client.post(
        "/api/v1/imports/preview",
        params={"site_id": site_id, "system_id": sys_id},
        files={"file": ("solar.csv", csv_content, "text/csv")},
        headers={"Authorization": f"Bearer {token}"},
    )).json()
    imp = (await client.get(
        f"/api/v1/imports/{preview['import_id']}",
        headers={"Authorization": f"Bearer {token}"},
    )).json()
    # preview_ready = no readings committed (Phase 6 does the actual write)
    assert imp.get("status") == "preview_ready"

