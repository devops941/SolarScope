"""
Phase 8 Analytics Tests — Golden Dataset + API Integration.

Golden dataset (hand-calculated):
  4 intervals × 15 minutes (09:00–09:45 IST)
  DC capacity = 10 kWp
  Performance factor = 80%

Row  | power_kw | energy_kwh | irr_w_m2 | amb_c | mod_c
09:00|   1.6    |    0.4     |   200    |  28.0 |  32.0
09:15|   3.2    |    0.8     |   400    |  29.0 |  36.0
09:30|   4.8    |    1.2     |   600    |  30.0 |  40.0
09:45|   6.4    |    1.6     |   800    |  31.0 |  44.0

Expected results (tolerance ±0.001):
  total_energy_kwh    = 4.0  kWh
  avg_power_kw        = 4.0  kW
  peak_power_kw       = 6.4  kW
  irradiation         = 0.5  kWh/m²  (Σ(G × 0.25h)/1000)
  specific_yield      = 0.4  kWh/kWp (÷ 10 kWp)
  PR                  = 80.0 %        (4.0 / (10 × 0.5))
  avg_ambient_temp    = 29.5 °C
  avg_module_temp     = 38.0 °C
  data_coverage       = 100.0%
"""
import uuid
import pytest
from datetime import datetime, timezone
from httpx import AsyncClient

from app.analytics.metrics import (
    calculate_energy, calculate_average_power, calculate_peak_power,
    calculate_specific_yield, calculate_irradiation,
    calculate_temperature_stats, calculate_data_coverage,
    MetricResult,
)
from app.analytics.performance_ratio import calculate_performance_ratio
from app.analytics.resampling import resample, build_chart_series
from app.analytics.formula_registry import FORMULA_VERSION
from app.core.security import create_access_token
from app.core.middleware import login_limiter
from app.ingestion.template_generator import generate_sample_30_days

TOLERANCE = 0.01   # ±0.01 kWh / % tolerance for golden dataset

# ── Golden dataset fixture ────────────────────────────────────────────
GOLDEN_READINGS = [
    {
        "id": f"r{i}", "system_id": "sys1", "site_id": "site1", "workspace_id": "ws1",
        "timestamp_utc": ts, "power_kw": pwr, "interval_energy_kwh": eng,
        "irradiance_w_m2": irr, "ambient_temp_c": amb, "module_temp_c": mod,
        "quality": ["valid"], "source_import_id": "import1",
    }
    for i, (ts, pwr, eng, irr, amb, mod) in enumerate([
        ("2026-11-18T03:30:00+00:00", 1.6, 0.4, 200.0, 28.0, 32.0),  # 09:00 IST
        ("2026-11-18T03:45:00+00:00", 3.2, 0.8, 400.0, 29.0, 36.0),  # 09:15 IST
        ("2026-11-18T04:00:00+00:00", 4.8, 1.2, 600.0, 30.0, 40.0),  # 09:30 IST
        ("2026-11-18T04:15:00+00:00", 6.4, 1.6, 800.0, 31.0, 44.0),  # 09:45 IST
    ])
]

DC_CAPACITY_KWP = 10.0


# ══════════════════════════════════════════════════════════════════════
# UNIT TESTS — pure function golden dataset
# ══════════════════════════════════════════════════════════════════════

class TestEnergyCalculation:
    def test_interval_energy_sum(self):
        result = calculate_energy(GOLDEN_READINGS, "15m", 4)
        assert result.value == pytest.approx(4.0, abs=TOLERANCE)
        assert result.unit == "kWh"
        assert result.method == "interval_energy_sum"
        assert result.formula_version == FORMULA_VERSION
        assert result.sample_count == 4
        assert result.coverage_pct == pytest.approx(100.0, abs=0.1)
        assert not result.is_estimated

    def test_power_integration_fallback(self):
        # Remove energy values → should fall back to power integration
        readings_no_energy = [{**r, "interval_energy_kwh": None} for r in GOLDEN_READINGS]
        result = calculate_energy(readings_no_energy, "15m", 4)
        # 15m = 0.25h; total = (1.6+3.2+4.8+6.4) × 0.25 = 16 × 0.25 = 4.0
        assert result.value == pytest.approx(4.0, abs=TOLERANCE)
        assert result.method == "power_integration"
        assert result.is_estimated

    def test_empty_readings_returns_none(self):
        result = calculate_energy([], "15m")
        assert result.value is None
        assert len(result.warnings) > 0

    def test_energy_returns_metricresult(self):
        result = calculate_energy(GOLDEN_READINGS, "15m")
        assert isinstance(result, MetricResult)
        d = result.to_dict()
        for key in ("value", "unit", "method", "formula_version", "sample_count",
                    "coverage_pct", "warnings", "is_estimated"):
            assert key in d


class TestPowerCalculations:
    def test_average_power(self):
        result = calculate_average_power(GOLDEN_READINGS, 4)
        assert result.value == pytest.approx(4.0, abs=TOLERANCE)
        assert result.unit == "kW"

    def test_peak_power(self):
        result = calculate_peak_power(GOLDEN_READINGS)
        assert result.value == pytest.approx(6.4, abs=TOLERANCE)
        assert result.unit == "kW"
        assert result.sample_count == 4

    def test_average_power_excludes_negative(self):
        with_negative = GOLDEN_READINGS + [{
            **GOLDEN_READINGS[0], "power_kw": -1.0,
        }]
        result = calculate_average_power(with_negative)
        assert result.value == pytest.approx(4.0, abs=TOLERANCE)

    def test_peak_power_empty_returns_none(self):
        result = calculate_peak_power([])
        assert result.value is None


class TestSpecificYield:
    def test_specific_yield_correct(self):
        energy = calculate_energy(GOLDEN_READINGS, "15m")
        result = calculate_specific_yield(energy.value, DC_CAPACITY_KWP, energy)
        assert result.value == pytest.approx(0.4, abs=TOLERANCE)
        assert result.unit == "kWh/kWp"

    def test_no_dc_capacity_returns_none(self):
        result = calculate_specific_yield(4.0, None)
        assert result.value is None
        assert len(result.warnings) > 0

    def test_zero_dc_capacity_returns_none(self):
        result = calculate_specific_yield(4.0, 0.0)
        assert result.value is None


class TestIrradiation:
    def test_irradiation_correct(self):
        result = calculate_irradiation(GOLDEN_READINGS, "15m", 4)
        # (200+400+600+800) × 0.25 / 1000 = 2000 × 0.25 / 1000 = 0.5
        assert result.value == pytest.approx(0.5, abs=TOLERANCE)
        assert result.unit == "kWh/m²"
        assert result.method == "irradiation_time_integration"

    def test_irradiation_no_irradiance_returns_none(self):
        readings_no_irr = [{**r, "irradiance_w_m2": None} for r in GOLDEN_READINGS]
        result = calculate_irradiation(readings_no_irr, "15m")
        assert result.value is None


class TestPerformanceRatio:
    def test_pr_golden_dataset(self):
        energy = calculate_energy(GOLDEN_READINGS, "15m")
        irr = calculate_irradiation(GOLDEN_READINGS, "15m")
        result = calculate_performance_ratio(
            ac_energy_kwh=energy.value,
            dc_capacity_kwp=DC_CAPACITY_KWP,
            h_poa_kwh_m2=irr.value,
        )
        # PR = 4.0 / (10 × 0.5 / 1) = 4.0 / 5.0 = 0.8 = 80%
        assert result.value == pytest.approx(80.0, abs=0.1)
        assert result.unit == "%"

    def test_pr_no_dc_capacity_returns_none(self):
        result = calculate_performance_ratio(4.0, None, 0.5)
        assert result.value is None

    def test_pr_no_irradiation_returns_none(self):
        result = calculate_performance_ratio(4.0, DC_CAPACITY_KWP, None)
        assert result.value is None

    def test_pr_no_energy_returns_none(self):
        result = calculate_performance_ratio(None, DC_CAPACITY_KWP, 0.5)
        assert result.value is None

    def test_pr_above_110_warns(self):
        # Very high energy relative to irradiation → PR > 110% → warning
        result = calculate_performance_ratio(100.0, 1.0, 0.1)
        assert result.value is not None
        assert any("implausible" in w.lower() or "110" in w for w in result.warnings)

    def test_pr_below_50_warns(self):
        result = calculate_performance_ratio(0.1, DC_CAPACITY_KWP, 0.5)
        assert result.value is not None
        assert any("low" in w.lower() or "50" in w for w in result.warnings)


class TestTemperature:
    def test_avg_ambient_temp(self):
        result = calculate_temperature_stats(GOLDEN_READINGS, "ambient_temp_c")
        # (28+29+30+31)/4 = 29.5
        assert result.value == pytest.approx(29.5, abs=TOLERANCE)
        assert result.unit == "°C"

    def test_avg_module_temp(self):
        result = calculate_temperature_stats(GOLDEN_READINGS, "module_temp_c")
        # (32+36+40+44)/4 = 38.0
        assert result.value == pytest.approx(38.0, abs=TOLERANCE)

    def test_missing_temp_returns_none(self):
        result = calculate_temperature_stats(GOLDEN_READINGS, "nonexistent_field")
        assert result.value is None


class TestDataCoverage:
    def test_full_coverage(self):
        result = calculate_data_coverage(4, 4)
        assert result.value == pytest.approx(100.0, abs=0.1)
        assert result.unit == "%"

    def test_partial_coverage(self):
        result = calculate_data_coverage(90, 100)
        assert result.value == pytest.approx(90.0, abs=0.1)

    def test_low_coverage_warns(self):
        result = calculate_data_coverage(80, 100)
        assert len(result.warnings) > 0

    def test_zero_expected_returns_none(self):
        result = calculate_data_coverage(5, 0)
        assert result.value is None


class TestResampling:
    def test_resample_to_hourly(self):
        # 4 × 15-min readings (03:30-04:15 UTC) → 2 hourly buckets (03:00 and 04:00)
        result = resample(GOLDEN_READINGS, "1h")
        assert len(result) == 2  # spans two 1-hour windows
        # Total energy across all buckets must equal sum of all interval energy
        total_energy = sum(b["interval_energy_kwh"] for b in result if b["interval_energy_kwh"])
        assert total_energy == pytest.approx(4.0, abs=TOLERANCE)

    def test_resample_empty_returns_empty(self):
        assert resample([], "1h") == []

    def test_build_chart_series(self):
        series = build_chart_series(GOLDEN_READINGS, "15m")
        assert len(series) == 4
        assert all("generation_kw" in p for p in series)
        assert all("irradiance_w_m2" in p for p in series)


# ══════════════════════════════════════════════════════════════════════
# API INTEGRATION TESTS
# ══════════════════════════════════════════════════════════════════════

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
    return r.json()["workspace"]["id"], r.json()["access_token"]


async def _create_site_system(client, token, dc_kwp=25.0):
    site = (await client.post("/api/v1/sites",
        json={"name": f"Site {uid()}", "timezone": "Asia/Kolkata"},
        headers={"Authorization": f"Bearer {token}"})).json()
    sys_ = (await client.post(f"/api/v1/sites/{site['id']}/systems",
        json={"name": "Array A", "dc_capacity_kwp": dc_kwp, "ac_capacity_kw": dc_kwp * 0.8},
        headers={"Authorization": f"Bearer {token}"})).json()
    return site["id"], sys_["id"]


async def _do_import(client, token, site_id, sys_id, days=1):
    csv_bytes = generate_sample_30_days(days=days, interval_minutes=15)
    preview = (await client.post(
        "/api/v1/imports/preview",
        params={"site_id": site_id, "system_id": sys_id},
        files={"file": (f"s_{uid()}.csv", csv_bytes, "text/csv")},
        headers={"Authorization": f"Bearer {token}"},
    )).json()
    await client.post(
        f"/api/v1/imports/{preview['import_id']}/confirm",
        params={"duplicate_policy": "skip"},
        headers={"Authorization": f"Bearer {token}"},
    )
    return preview["import_id"]


@pytest.mark.asyncio
async def test_create_analysis_run_returns_metrics(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)
    await _do_import(client, token, site_id, sys_id, days=1)

    resp = await client.post(
        "/api/v1/analytics/runs",
        params={
            "system_id": sys_id,
            "start": "2026-10-01T00:00:00Z",
            "end": "2026-10-01T23:59:59Z",
            "interval": "15m",
            "quality": "valid",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert "id" in body
    assert "metrics" in body
    assert "formula_version" in body
    assert body["formula_version"] == FORMULA_VERSION
    assert "filter_snapshot" in body

    metrics = body["metrics"]
    # All expected metric keys present
    for key in ("energy_kwh", "specific_yield", "performance_ratio",
                "irradiation", "peak_power_kw", "data_coverage"):
        assert key in metrics, f"Missing metric: {key}"
        assert "value" in metrics[key]
        assert "unit" in metrics[key]
        assert "method" in metrics[key]
        assert "formula_version" in metrics[key]


@pytest.mark.asyncio
async def test_analysis_run_energy_positive(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)
    await _do_import(client, token, site_id, sys_id, days=1)

    resp = await client.post(
        "/api/v1/analytics/runs",
        params={"system_id": sys_id, "start": "2026-10-01T00:00:00Z",
                "end": "2026-10-01T23:59:59Z"},
        headers={"Authorization": f"Bearer {token}"},
    )
    energy = resp.json()["metrics"]["energy_kwh"]
    assert energy["value"] is not None
    assert energy["value"] > 0


@pytest.mark.asyncio
async def test_get_analysis_run_by_id(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)
    await _do_import(client, token, site_id, sys_id, days=1)

    created = (await client.post(
        "/api/v1/analytics/runs",
        params={"system_id": sys_id, "start": "2026-10-01T00:00:00Z",
                "end": "2026-10-01T23:59:59Z"},
        headers={"Authorization": f"Bearer {token}"},
    )).json()

    resp = await client.get(
        f"/api/v1/analytics/runs/{created['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


@pytest.mark.asyncio
async def test_analysis_run_persists_filter_snapshot(client: AsyncClient):
    """Analysis runs must store the filter used so they can be reproduced."""
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)
    await _do_import(client, token, site_id, sys_id, days=1)

    start, end = "2026-10-01T00:00:00Z", "2026-10-01T23:59:59Z"
    created = (await client.post(
        "/api/v1/analytics/runs",
        params={"system_id": sys_id, "start": start, "end": end},
        headers={"Authorization": f"Bearer {token}"},
    )).json()

    snap = created["filter_snapshot"]
    assert snap["system_id"] == sys_id
    assert "2026-10-01" in snap["start"]
    assert "2026-10-01" in snap["end"]


@pytest.mark.asyncio
async def test_analysis_run_no_data_returns_null_metrics(client: AsyncClient):
    """Analytics run on a period with no readings returns null values, not errors."""
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)
    # No import — no readings

    resp = await client.post(
        "/api/v1/analytics/runs",
        params={"system_id": sys_id, "start": "2026-10-01T00:00:00Z",
                "end": "2026-10-01T23:59:59Z"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    metrics = resp.json()["metrics"]
    assert metrics["energy_kwh"]["value"] is None


@pytest.mark.asyncio
async def test_list_analysis_runs(client: AsyncClient):
    ws_id, token = await _register(client)
    site_id, sys_id = await _create_site_system(client, token)
    await _do_import(client, token, site_id, sys_id, days=1)

    for _ in range(2):
        await client.post(
            "/api/v1/analytics/runs",
            params={"system_id": sys_id, "start": "2026-10-01T00:00:00Z",
                    "end": "2026-10-01T23:59:59Z"},
            headers={"Authorization": f"Bearer {token}"},
        )

    resp = await client.get(
        f"/api/v1/analytics/runs?system_id={sys_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) >= 2


@pytest.mark.asyncio
async def test_analysis_run_cross_tenant_blocked(client: AsyncClient):
    ws_a, token_a = await _register(client)
    login_limiter.reset_all()
    ws_b, token_b = await _register(client)

    site_id, sys_id = await _create_site_system(client, token_a)
    created = (await client.post(
        "/api/v1/analytics/runs",
        params={"system_id": sys_id, "start": "2026-10-01T00:00:00Z",
                "end": "2026-10-01T23:59:59Z"},
        headers={"Authorization": f"Bearer {token_a}"},
    )).json()

    resp = await client.get(
        f"/api/v1/analytics/runs/{created['id']}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 404
