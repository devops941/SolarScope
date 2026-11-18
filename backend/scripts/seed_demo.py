"""
Generate synthetic demo CSV data for SolarScope testing and demos.
Run: python -m scripts.seed_demo

Output files:
  - solarscope_readings_template_v1.csv      (blank template)
  - solarscope_demo_30_days_clean.csv        (clean 30-day data)
  - solarscope_demo_validation_cases.csv     (intentional errors for testing)
"""
import csv
import math
import os
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

SEED = 42  # Fixed seed for reproducible output

# Generator parameters
TIMEZONE = "Asia/Kolkata"
START_DATE = "2026-10-01"
DAYS = 30
INTERVAL_MINUTES = 15
DC_CAPACITY_KWP = 25.0
PEAK_IRRADIANCE = 850.0
AMBIENT_RANGE = (25.0, 38.0)

OUTPUT_DIR = os.path.dirname(__file__)


def daylight_curve(hour_float: float) -> float:
    """Generate a daylight curve. Sunrise ~6:00, sunset ~18:30."""
    sunrise, sunset = 6.0, 18.5
    if hour_float < sunrise or hour_float > sunset:
        return 0.0
    mid = (sunrise + sunset) / 2
    angle = math.pi * (hour_float - sunrise) / (sunset - sunrise)
    return max(0.0, math.sin(angle))


def simple_hash(seed: int, t: int) -> float:
    """Deterministic pseudo-random float 0..1."""
    x = math.sin(seed * 127.1 + t * 311.7) * 43758.5453
    return x - math.floor(x)


def generate_row(dt_local: datetime, idx: int, dc_kwp: float) -> dict:
    h = dt_local.hour + dt_local.minute / 60.0
    curve = daylight_curve(h)

    # Irradiance with cloud variation
    cloud = 1.0 - 0.3 * simple_hash(SEED, idx % 1000)
    irradiance = round(PEAK_IRRADIANCE * curve * cloud, 1) if curve > 0 else 0.0

    # Power from irradiance + noise
    perf_factor = 0.78 + 0.1 * simple_hash(SEED + 1, idx % 500)
    power_kw = round(dc_kwp * (irradiance / 1000.0) * perf_factor, 3) if irradiance > 0 else 0.0

    # Interval energy (power × interval hours)
    energy_kwh = round(power_kw * INTERVAL_MINUTES / 60.0, 4)

    # Temperatures
    daily_temp = AMBIENT_RANGE[0] + (AMBIENT_RANGE[1] - AMBIENT_RANGE[0]) * simple_hash(SEED + 2, idx // 96)
    ambient = round(daily_temp + 2.0 * math.sin(math.pi * h / 12.0), 1)
    module_temp = round(ambient + (25.0 if irradiance > 500 else 10.0) * (irradiance / 1000.0), 1) if irradiance > 0 else ambient

    return {
        "timestamp": dt_local.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "power_kw": power_kw,
        "energy_kwh": energy_kwh,
        "irradiance_w_m2": irradiance,
        "ambient_temp_c": ambient,
        "module_temp_c": module_temp,
        "voltage_v": round(400.0 + 20.0 * simple_hash(SEED + 3, idx % 200), 1) if power_kw > 0 else "",
        "current_a": round(power_kw * 1000 / 400.0, 2) if power_kw > 0 else "",
        "inverter_status": "NORMAL",
    }


FIELDNAMES = ["timestamp", "power_kw", "energy_kwh", "irradiance_w_m2",
              "ambient_temp_c", "module_temp_c", "voltage_v", "current_a", "inverter_status"]


def write_template():
    path = os.path.join(OUTPUT_DIR, "solarscope_readings_template_v1.csv")
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerow({k: "" for k in FIELDNAMES})
    print(f"  Written: {path}")


def write_clean_30_days():
    tz = ZoneInfo(TIMEZONE)
    start = datetime.strptime(START_DATE, "%Y-%m-%d").replace(tzinfo=tz)
    rows = []
    total_intervals = DAYS * 24 * 60 // INTERVAL_MINUTES
    for i in range(total_intervals):
        dt = start + timedelta(minutes=i * INTERVAL_MINUTES)
        rows.append(generate_row(dt, i, DC_CAPACITY_KWP))

    path = os.path.join(OUTPUT_DIR, "solarscope_demo_30_days_clean.csv")
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)
    print(f"  Written: {path}  ({len(rows):,} rows)")


def write_validation_cases():
    tz = ZoneInfo(TIMEZONE)
    start = datetime(2026, 11, 18, 9, 0, tzinfo=tz)
    base_rows = [generate_row(start + timedelta(minutes=i * 15), i, DC_CAPACITY_KWP) for i in range(10)]

    validation_rows = list(base_rows)
    # Inject deliberate errors
    validation_rows.append({**base_rows[0], "timestamp": "not_a_date", "power_kw": 1.0})
    validation_rows.append({**base_rows[1], "power_kw": -5.2})
    validation_rows.append({**base_rows[2], "irradiance_w_m2": 9999.0})
    validation_rows.append({**base_rows[3], "power_kw": "five_kw"})
    validation_rows.append({**base_rows[4], "module_temp_c": 250.0})
    validation_rows.append(base_rows[0])  # duplicate

    path = os.path.join(OUTPUT_DIR, "solarscope_demo_validation_cases.csv")
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(validation_rows)
    print(f"  Written: {path}  ({len(validation_rows)} rows with intentional errors)")


if __name__ == "__main__":
    print("Generating SolarScope demo CSV files...")
    write_template()
    write_clean_30_days()
    write_validation_cases()
    print("Done.")
