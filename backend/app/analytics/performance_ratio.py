"""
Performance Ratio (PR) calculation — IEC 61724 method.

PR = Measured_AC_energy / Reference_energy
Reference_energy = P_STC (kWp) × H_POA (kWh/m²) / G_ref (kW/m²)

Prerequisites:
  - AC energy must be a measured value (not estimated from power)
  - Irradiance must be POA (plane-of-array), not GHI (global horizontal)
  - Same time period for both energy and irradiance
  - DC capacity (P_STC) must be configured

Limitations:
  - If sensor orientation is unknown, label PR as "indicative"
  - PR > 1.0 is physically implausible → warn and return anyway
  - PR < 0.5 may indicate system issues → warn
"""
from app.analytics.metrics import MetricResult
from app.analytics.formula_registry import FORMULA_VERSION

G_REF_KW_M2 = 1.0   # Reference irradiance, 1 kW/m²


def calculate_performance_ratio(
    ac_energy_kwh: float | None,
    dc_capacity_kwp: float | None,
    h_poa_kwh_m2: float | None,
    energy_is_estimated: bool = False,
    sensor_plane_known: bool = True,
) -> MetricResult:
    """
    Performance Ratio = AC_energy / (P_STC × H_POA / G_ref)

    Returns MetricResult with value as a decimal (0.0–1.0).
    Multiply by 100 for percentage.
    """
    warnings: list[str] = []

    if dc_capacity_kwp is None or dc_capacity_kwp <= 0:
        return MetricResult(
            value=None, unit="%", method="performance_ratio_iec",
            warnings=["DC capacity not configured. PR cannot be calculated."]
        )
    if h_poa_kwh_m2 is None or h_poa_kwh_m2 <= 0:
        return MetricResult(
            value=None, unit="%", method="performance_ratio_iec",
            warnings=["Irradiation (H_POA) is zero or unavailable. PR cannot be calculated."]
        )
    if ac_energy_kwh is None:
        return MetricResult(
            value=None, unit="%", method="performance_ratio_iec",
            warnings=["Energy not available. PR cannot be calculated."]
        )

    # Prerequisite warnings (non-blocking)
    if energy_is_estimated:
        warnings.append("Energy was estimated from power integration, not meter data. "
                        "PR may be less accurate.")
    if not sensor_plane_known:
        warnings.append("Irradiance sensor plane (POA vs GHI) is unknown. "
                        "PR is labelled indicative.")

    reference_energy = dc_capacity_kwp * h_poa_kwh_m2 / G_REF_KW_M2
    if reference_energy <= 0:
        return MetricResult(value=None, unit="%", method="performance_ratio_iec",
                            warnings=["Reference energy is zero; cannot compute PR."])

    pr_decimal = ac_energy_kwh / reference_energy
    pr_pct = round(pr_decimal * 100, 2)

    if pr_pct > 110:
        warnings.append(
            f"PR = {pr_pct}% > 110% is physically implausible. "
            "Verify irradiance sensor is measuring POA, not GHI, "
            "and that energy and irradiance cover the same period."
        )
    elif pr_pct > 100:
        warnings.append(f"PR = {pr_pct}% slightly above 100%. Check sensor calibration.")

    if pr_pct < 50:
        warnings.append(f"PR = {pr_pct}% is very low. "
                        "Possible causes: system issues, shading, data quality problems, "
                        "or mismatched irradiance period.")

    method = "performance_ratio_iec" if sensor_plane_known else "performance_ratio_indicative"

    return MetricResult(
        value=pr_pct,
        unit="%",
        method=method,
        formula_version=FORMULA_VERSION,
        warnings=warnings,
        is_estimated=energy_is_estimated or not sensor_plane_known,
    )
