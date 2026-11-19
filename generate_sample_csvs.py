"""
Generate two proper CSV files for SolarScope telemetry upload & validation testing.
"""
import os
import csv
import math
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

HEADERS = [
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

def daylight_curve(hour_float: float) -> float:
    sunrise, sunset = 6.0, 18.5
    if hour_float < sunrise or hour_float > sunset:
        return 0.0
    return max(0.0, math.sin(math.pi * (hour_float - sunrise) / (sunset - sunrise)))

def generate_normal_dataset(filepath: str, start_date: str = "2026-11-01", days: int = 7, dc_capacity_kwp: float = 25.0):
    tz = ZoneInfo("Asia/Kolkata")
    start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=tz)
    total_intervals = days * 24 * 4  # 15-min intervals
    rows = []

    for i in range(total_intervals):
        dt = start + timedelta(minutes=i * 15)
        h = dt.hour + dt.minute / 60.0
        curve = daylight_curve(h)

        if curve > 0:
            # Daytime
            sun_var = 1.0 - 0.05 * math.sin(i * 0.1)
            irradiance = round(max(0.0, 850.0 * curve * sun_var), 1)
            perf = 0.82 + 0.03 * math.cos(i * 0.05)
            power_kw = round(dc_capacity_kwp * (irradiance / 1000.0) * perf, 2)
            energy_kwh = round(power_kw * 0.25, 3)
            ambient = round(26.0 + 7.0 * curve + 1.5 * math.sin(h), 1)
            module_t = round(ambient + 22.0 * (irradiance / 850.0), 1)
            voltage = round(412.0 + 5.0 * math.sin(i * 0.2), 1)
            current = round((power_kw * 1000.0) / max(voltage, 1.0), 2)
            status = "NORMAL"
        else:
            # Nighttime
            irradiance = 0.0
            power_kw = 0.0
            energy_kwh = 0.0
            ambient = round(23.0 + 2.0 * math.cos(h * math.pi / 12.0), 1)
            module_t = ambient
            voltage = 0.0
            current = 0.0
            status = "NORMAL"

        rows.append({
            "timestamp": dt.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "power_kw": power_kw,
            "energy_kwh": energy_kwh,
            "irradiance_w_m2": irradiance,
            "ambient_temp_c": ambient,
            "module_temp_c": module_t,
            "voltage_v": voltage if voltage > 0 else "",
            "current_a": current if current > 0 else "",
            "inverter_status": status,
        })

    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=HEADERS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Generated normal dataset: {filepath} ({len(rows)} rows)")

def generate_anomalies_dataset(filepath: str, start_date: str = "2026-11-08", days: int = 7, dc_capacity_kwp: float = 25.0):
    tz = ZoneInfo("Asia/Kolkata")
    start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=tz)
    total_intervals = days * 24 * 4
    rows = []

    for i in range(total_intervals):
        dt = start + timedelta(minutes=i * 15)
        day_idx = i // 96
        h = dt.hour + dt.minute / 60.0
        curve = daylight_curve(h)

        if curve > 0:
            irradiance = round(max(0.0, 880.0 * curve), 1)
            ambient = round(27.0 + 8.0 * curve, 1)
            module_t = round(ambient + 24.0 * (irradiance / 880.0), 1)
            perf = 0.82
            status = "NORMAL"

            # Inject Anomaly 1: Day 2 (Nov 10) - Output Drop / Soiling Mismatch (power is 50% below baseline for midday)
            if day_idx == 2 and 10.0 <= h <= 14.5:
                perf = 0.25  # severe drop triggers OUTPUT_DROP & IRRADIANCE_MISMATCH

            # Inject Anomaly 2: Day 3 (Nov 11) - Daylight Flatline / Inverter Trip at 11:30 - 12:45
            elif day_idx == 3 and 11.5 <= h <= 12.75:
                perf = 0.0
                status = "FAULT"

            # Inject Anomaly 3: Day 4 (Nov 12) - High Module Temperature spike (>75°C) at 12:30 - 14:00
            elif day_idx == 4 and 12.5 <= h <= 14.0:
                module_t = round(77.5 + 2.5 * curve, 1)
                perf = 0.65  # thermal derating

            power_kw = round(dc_capacity_kwp * (irradiance / 1000.0) * perf, 2)
            energy_kwh = round(power_kw * 0.25, 3)
            voltage = round(410.0 if power_kw > 0 else 0.0, 1)
            current = round((power_kw * 1000.0) / max(voltage, 1.0), 2) if voltage > 0 else 0.0
        else:
            irradiance = 0.0
            power_kw = 0.0
            energy_kwh = 0.0
            ambient = 23.5
            module_t = ambient
            voltage = 0.0
            current = 0.0
            status = "NORMAL"

        rows.append({
            "timestamp": dt.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "power_kw": power_kw,
            "energy_kwh": energy_kwh,
            "irradiance_w_m2": irradiance,
            "ambient_temp_c": ambient,
            "module_temp_c": module_t,
            "voltage_v": voltage if voltage > 0 else "",
            "current_a": current if current > 0 else "",
            "inverter_status": status,
        })

    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=HEADERS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Generated anomaly dataset: {filepath} ({len(rows)} rows)")

if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "sample_data")
    generate_normal_dataset(os.path.join(out_dir, "01_solar_telemetry_normal_chennai_7days.csv"))
    generate_anomalies_dataset(os.path.join(out_dir, "02_solar_telemetry_with_anomalies_7days.csv"))
