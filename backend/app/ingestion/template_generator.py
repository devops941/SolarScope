"""
Template and sample CSV generator for SolarScope.

Generates:
  1. Blank template CSV (headers only + one example row)
  2. 30-day synthetic clean CSV (realistic solar data)
  3. Validation test CSV (intentional errors for testing)
"""
import csv
import io
import math
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

TEMPLATE_HEADERS = [
    "timestamp",
    "power_kw",
    "energy_kwh",
    "irradiance_w_m2",
    "ambient_temp_c",
    "module_temp_c",
    "voltage_v",
    "current_a",
    "inverter_status",
]

TEMPLATE_EXAMPLE_ROW = {
    "timestamp": "2026-11-18T09:00:00+05:30",
    "power_kw": "4.20",
    "energy_kwh": "1.05",
    "irradiance_w_m2": "420",
    "ambient_temp_c": "29.0",
    "module_temp_c": "38.5",
    "voltage_v": "410.2",
    "current_a": "10.24",
    "inverter_status": "NORMAL",
}

SEED = 42


def _pseudo_random(seed: int, idx: int) -> float:
    """Deterministic pseudo-random float 0..1."""
    x = math.sin(seed * 127.1 + idx * 311.7) * 43758.5453
    return x - math.floor(x)


def _daylight_curve(hour_float: float) -> float:
    sunrise, sunset = 6.0, 18.5
    if hour_float < sunrise or hour_float > sunset:
        return 0.0
    return max(0.0, math.sin(math.pi * (hour_float - sunrise) / (sunset - sunrise)))


def _write_csv(rows: list[dict], headers: list[str]) -> bytes:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=headers, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    return buf.getvalue().encode("utf-8")


def generate_template() -> bytes:
    """Blank template: headers + 1 annotated example row."""
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=TEMPLATE_HEADERS)
    writer.writeheader()
    writer.writerow(TEMPLATE_EXAMPLE_ROW)
    return buf.getvalue().encode("utf-8")


def generate_sample_30_days(
    timezone: str = "Asia/Kolkata",
    start_date: str = "2026-10-01",
    days: int = 30,
    interval_minutes: int = 15,
    dc_capacity_kwp: float = 25.0,
    peak_irradiance: float = 850.0,
) -> bytes:
    """Clean 30-day synthetic dataset — no errors, missing data, or duplicates."""
    tz = ZoneInfo(timezone)
    start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=tz)
    total = days * 24 * 60 // interval_minutes
    rows: list[dict] = []

    for i in range(total):
        dt = start + timedelta(minutes=i * interval_minutes)
        h = dt.hour + dt.minute / 60.0
        curve = _daylight_curve(h)

        cloud = 1.0 - 0.3 * _pseudo_random(SEED, i % 1000)
        irradiance = round(peak_irradiance * curve * cloud, 1) if curve > 0 else 0.0
        perf = 0.78 + 0.1 * _pseudo_random(SEED + 1, i % 500)
        power_kw = round(dc_capacity_kwp * (irradiance / 1000.0) * perf, 3) if irradiance > 0 else 0.0
        energy_kwh = round(power_kw * interval_minutes / 60.0, 4)

        daily_base = 25.0 + 13.0 * _pseudo_random(SEED + 2, i // 96)
        ambient = round(daily_base + 2.0 * math.sin(math.pi * h / 12.0), 1)
        module_t = round(ambient + (25.0 if irradiance > 500 else 10.0) * (irradiance / 1000.0), 1)
        voltage = round(400.0 + 20.0 * _pseudo_random(SEED + 3, i % 200), 1) if power_kw > 0 else 0.0
        current = round(power_kw * 1000 / max(voltage, 1), 2) if power_kw > 0 else 0.0

        rows.append({
            "timestamp": dt.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "power_kw": power_kw,
            "energy_kwh": energy_kwh,
            "irradiance_w_m2": irradiance,
            "ambient_temp_c": ambient,
            "module_temp_c": module_t,
            "voltage_v": voltage if voltage > 0 else "",
            "current_a": current if current > 0 else "",
            "inverter_status": "NORMAL",
        })

    return _write_csv(rows, TEMPLATE_HEADERS)


def generate_validation_cases() -> bytes:
    """CSV with intentional errors for testing the import validator."""
    tz = ZoneInfo("Asia/Kolkata")
    base_dt = datetime(2026, 11, 18, 9, 0, tzinfo=tz)
    rows: list[dict] = []

    # 10 clean rows
    for i in range(10):
        dt = base_dt + timedelta(minutes=i * 15)
        rows.append({
            "timestamp": dt.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "power_kw": round(4 + i * 0.5, 2),
            "energy_kwh": round((4 + i * 0.5) * 0.25, 3),
            "irradiance_w_m2": 400 + i * 20,
            "ambient_temp_c": 29 + i * 0.3,
            "module_temp_c": 38 + i * 0.4,
            "voltage_v": 410, "current_a": 10.0, "inverter_status": "NORMAL",
        })

    # Intentional errors
    rows.append({"timestamp": "not_a_date", "power_kw": 1.0, "energy_kwh": 0.25,
                 "irradiance_w_m2": 400, "ambient_temp_c": 29, "module_temp_c": 38,
                 "voltage_v": 410, "current_a": 10, "inverter_status": "NORMAL"})
    rows.append({"timestamp": rows[2]["timestamp"], "power_kw": -5.2, "energy_kwh": -1.3,
                 "irradiance_w_m2": 400, "ambient_temp_c": 29, "module_temp_c": 38,
                 "voltage_v": 410, "current_a": 10, "inverter_status": "NORMAL"})
    rows.append({"timestamp": rows[3]["timestamp"], "power_kw": 4.0, "energy_kwh": 1.0,
                 "irradiance_w_m2": 9999.0, "ambient_temp_c": 29, "module_temp_c": 38,
                 "voltage_v": 410, "current_a": 10, "inverter_status": "NORMAL"})
    rows.append({"timestamp": rows[4]["timestamp"], "power_kw": "five_kw", "energy_kwh": 1.0,
                 "irradiance_w_m2": 400, "ambient_temp_c": 29, "module_temp_c": 38,
                 "voltage_v": 410, "current_a": 10, "inverter_status": "NORMAL"})
    rows.append({"timestamp": rows[5]["timestamp"], "power_kw": 4.0, "energy_kwh": 1.0,
                 "irradiance_w_m2": 400, "ambient_temp_c": 29, "module_temp_c": 250.0,
                 "voltage_v": 410, "current_a": 10, "inverter_status": "NORMAL"})
    rows.append(rows[0])  # duplicate

    return _write_csv(rows, TEMPLATE_HEADERS)
