"""
Formula registry — central version tracking for all SolarScope analytics formulas.

Bumping FORMULA_VERSION in a release ensures old analysis_runs remain
reproducible (they store the version at time of creation).
"""

FORMULA_VERSION = "v1.0"

FORMULA_DESCRIPTIONS = {
    "energy_interval_sum": "Sum of interval_energy_kwh for all valid intervals.",
    "energy_power_integration": "Trapezoidal integration of power_kw × interval_hours.",
    "average_power_time_weighted": "Arithmetic mean of power_kw over equal-interval samples.",
    "peak_power": "Maximum valid power_kw in the period.",
    "specific_yield": "Total energy (kWh) ÷ DC system capacity (kWp).",
    "irradiation_time_integration": "Σ(G_i × Δt_hours) / 1000 — W/m² integrated to kWh/m².",
    "performance_ratio_iec": (
        "PR = AC_energy / (P_STC × H_POA / G_ref). "
        "Requires POA irradiance. G_ref = 1 kW/m²."
    ),
    "temperature_statistics": "Mean, min, max of ambient_temp_c and module_temp_c.",
    "data_coverage": "valid_intervals / expected_intervals × 100.",
    "temp_corrected_power": (
        "P_estimated = P_STC × (G/1000) × [1 + γ × (T_module - 25)]. "
        "Indicative only — not a certified PV simulation."
    ),
}

INTERVAL_HOURS = {
    "5m":  5 / 60,
    "15m": 15 / 60,
    "30m": 0.5,
    "1h":  1.0,
    "1d":  24.0,
}


def interval_to_hours(interval: str = "15m") -> float:
    return INTERVAL_HOURS.get(interval, 0.25)


def describe(formula_key: str) -> str:
    return FORMULA_DESCRIPTIONS.get(formula_key, "")
