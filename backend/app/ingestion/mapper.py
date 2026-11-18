"""
Column mapper — maps arbitrary user CSV headers to canonical SolarScope field names.

The alias dictionary is case-insensitive and strips whitespace/underscores/hyphens
so "Active Power (kW)", "active_power_kw", and "ActivePower" all map to "power_kw".
"""

CANONICAL_COLUMNS = [
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

COLUMN_ALIASES: dict[str, list[str]] = {
    "timestamp": [
        "ts", "datetime", "time", "date_time", "recorded_at", "timestamp_local",
        "timestamp_utc", "date", "date_time_local", "readingtime", "reading_time",
        "sample_time", "interval_start", "interval_end", "logged_at",
    ],
    "power_kw": [
        "power", "pwr", "generation_kw", "active_power", "p_kw", "watts_kw",
        "ac_power", "dc_power", "power_w", "generation_w", "output_kw",
        "activepowerkw", "power_output", "generation_power",
    ],
    "energy_kwh": [
        "energy", "kwh", "generation_kwh", "energy_wh", "e_kwh",
        "interval_energy", "energy_generated", "yield_kwh", "production_kwh",
        "ac_energy", "cumulative_energy", "meter_kwh", "total_kwh",
    ],
    "irradiance_w_m2": [
        "irradiance", "solar_irradiance", "ghi", "poa", "irr", "w_m2",
        "irr_w_m2", "solar_radiation", "insolation", "plane_of_array",
        "horizontal_irradiance", "global_irradiance", "radiation",
    ],
    "ambient_temp_c": [
        "ambient_temp", "air_temp", "temp_c", "temperature", "amb_temp",
        "ambient_temperature", "outdoor_temp", "env_temp", "ta", "t_ambient",
        "ambienttemperaturec", "ambienttemperature", "airtemperature",
    ],
    "module_temp_c": [
        "module_temp", "panel_temp", "cell_temp", "mod_temp",
        "module_temperature", "panel_temperature", "pv_temp", "t_module",
        "cell_temperature", "moduletemperaturec", "moduletemperature",
    ],
    "voltage_v": [
        "voltage", "dc_voltage", "vdc", "v", "dc_v", "pv_voltage",
        "string_voltage", "mppt_voltage", "u_dc",
    ],
    "current_a": [
        "current", "dc_current", "idc", "i", "amps", "pv_current",
        "string_current", "mppt_current", "i_dc",
    ],
    "inverter_status": [
        "status", "inv_status", "state", "inverter_state", "fault_code",
        "operating_state", "mode",
    ],
}


def _normalize_key(raw: str) -> str:
    """Strip and lowercase a column name for fuzzy matching."""
    import re
    # Strip spaces, punctuation, brackets, units (°, ², common SI symbols)
    return re.sub(r"[\s\-_()/°℃℉²³.]+", "", raw.lower().strip())


# Build a flattened lookup: normalized_alias → canonical
_ALIAS_LOOKUP: dict[str, str] = {}
for canonical, aliases in COLUMN_ALIASES.items():
    _ALIAS_LOOKUP[_normalize_key(canonical)] = canonical
    for alias in aliases:
        _ALIAS_LOOKUP[_normalize_key(alias)] = canonical


def suggest_mapping(user_headers: list[str]) -> dict[str, str]:
    """
    Map a list of user column headers to canonical names.
    Returns {user_header: canonical_name or ''}.
    Unknown headers get an empty string.
    """
    mapping: dict[str, str] = {}
    for header in user_headers:
        canonical = _ALIAS_LOOKUP.get(_normalize_key(header), "")
        mapping[header] = canonical
    return mapping


def apply_mapping(
    row: dict[str, str],
    mapping: dict[str, str],
) -> dict[str, str | None]:
    """
    Apply a column mapping to a raw CSV row dict.
    Returns a dict with canonical keys; unmapped columns are dropped.
    """
    result: dict[str, str | None] = {col: None for col in CANONICAL_COLUMNS}
    for user_col, canonical in mapping.items():
        if canonical and canonical in result:
            result[canonical] = row.get(user_col)
    return result
