# Phase 8 — Calculation Engine (Analytics Core)
**Duration:** 2 Weeks | **Difficulty:** HARD | **Weeks:** 10-11

---

## Objectives
Build the pure Python analytics engine. All formulas must be testable, versioned, and return metadata (unit, method, coverage, warnings). This is the mathematical heart of SolarScope.

---

## Key Principle
> Every metric function returns: `value, unit, method, formula_version, sample_count, coverage_pct, warnings`
> Never return a bare number.

---

## Detailed Tasks

| # | Task | File | Days |
|---|------|------|------|
| 1 | Build energy calculator (interval sum + power integration) | `analytics/metrics.py` | 1 |
| 2 | Build power calculator (time-weighted mean, peak) | `analytics/metrics.py` | 0.5 |
| 3 | Build specific yield calculator | `analytics/metrics.py` | 0.5 |
| 4 | Build irradiation calculator (integrate W/m² → kWh/m²) | `analytics/metrics.py` | 1 |
| 5 | Build Performance Ratio calculator | `analytics/performance_ratio.py` | 1 |
| 6 | Build temperature calculator (mean/min/max) | `analytics/metrics.py` | 0.5 |
| 7 | Build data coverage calculator | `analytics/metrics.py` | 0.5 |
| 8 | Build time resampler (5m/15m/30m/1h/1d aggregation) | `analytics/resampling.py` | 1 |
| 9 | Build time alignment (align irradiance to power timestamps) | `analytics/resampling.py` | 1 |
| 10 | Build formula version registry | `analytics/formula_registry.py` | 0.5 |
| 11 | Build temperature-corrected power estimate | `analytics/metrics.py` | 0.5 |
| 12 | Build POST /analytics/runs endpoint | `routers/analytics.py` | 0.5 |
| 13 | Build GET /analytics/runs/{id} endpoint | `routers/analytics.py` | 0.5 |
| 14 | Persist analysis_run to MongoDB | `repositories/analysis_runs.py` | 0.5 |
| 15 | Write golden dataset unit tests | `tests/test_analytics.py` | 2 |

---

## Files to Create

```
backend/app/
├── analytics/
│   ├── __init__.py
│   ├── metrics.py                 ← energy, power, yield, temperature, coverage
│   ├── performance_ratio.py       ← PR formula with prerequisites check
│   ├── resampling.py              ← time-series resampling + alignment
│   └── formula_registry.py        ← formula version tracking
├── api/v1/routers/
│   └── analytics.py
├── repositories/
│   └── analysis_runs.py
├── schemas/
│   └── analytics.py
tests/
├── test_analytics.py              ← golden dataset tests
└── fixtures/
    └── golden_dataset.csv         ← hand-calculated reference data
```

---

## Formula Specifications

### 1. Energy (kWh)
```python
def calculate_energy(readings: list[Reading]) -> MetricResult:
    """
    If interval_energy_kwh available: sum it.
    If only power_kw: integrate using trapezoidal rule × interval hours.
    """
    if readings[0].interval_energy_kwh is not None:
        value = sum(r.interval_energy_kwh for r in readings if r.quality == "valid")
        method = "interval_energy_sum"
    else:
        # Power integration: kW × hours
        value = sum(r.power_kw * (interval_minutes / 60) for r in readings)
        method = "power_integration"
    
    return MetricResult(
        value=round(value, 3),
        unit="kWh",
        method=method,
        formula_version="v1.0",
        sample_count=len(readings),
        coverage_pct=coverage,
        warnings=[] if method == "interval_energy_sum" else ["Energy estimated from power integration"]
    )
```

### 2. Specific Yield (kWh/kWp)
```python
def calculate_specific_yield(energy_kwh: float, dc_capacity_kwp: float) -> MetricResult:
    """
    specific_yield = total_energy_kWh / dc_capacity_kWp
    Requires: DC capacity configured on the system
    """
    if dc_capacity_kwp <= 0:
        raise CalculationError("DC capacity not configured")
    
    return MetricResult(
        value=round(energy_kwh / dc_capacity_kwp, 2),
        unit="kWh/kWp",
        method="energy_divided_by_dc_capacity",
        formula_version="v1.0"
    )
```

### 3. Irradiation (kWh/m²)
```python
def calculate_irradiation(readings: list[Reading], interval_minutes: int) -> MetricResult:
    """
    H_POA = Σ (G_i × Δt_hours)   where G_i is in W/m²
    Convert W/m² × hours → Wh/m² → divide by 1000 → kWh/m²
    """
    interval_hours = interval_minutes / 60
    irradiation_wh = sum(r.irradiance_w_m2 * interval_hours for r in readings if r.irradiance_w_m2)
    
    return MetricResult(
        value=round(irradiation_wh / 1000, 3),
        unit="kWh/m²",
        method="irradiance_time_integration",
        formula_version="v1.0"
    )
```

### 4. Performance Ratio (PR)
```python
def calculate_performance_ratio(
    ac_energy_kwh: float,
    dc_capacity_kwp: float,
    h_poa_kwh_m2: float,
    g_ref_kw_m2: float = 1.0
) -> MetricResult:
    """
    Reference energy = P_STC × H_POA / G_ref
    PR = AC_energy / Reference_energy
    
    Prerequisites:
    - AC energy must be measured (not estimated)
    - Irradiance must be POA (plane of array), not GHI
    - Same time period for both
    """
    prerequisites_met = []
    warnings = []
    
    if h_poa_kwh_m2 <= 0:
        raise CalculationError("No irradiation data — PR cannot be calculated")
    
    reference_energy = dc_capacity_kwp * h_poa_kwh_m2 / g_ref_kw_m2
    pr = ac_energy_kwh / reference_energy
    
    if pr > 1.0:
        warnings.append("PR > 100% — verify irradiance sensor is POA, not GHI")
    if pr < 0.5:
        warnings.append("PR < 50% — check for data quality or system issues")
    
    return MetricResult(
        value=round(pr * 100, 1),    # as percentage
        unit="%",
        method="iec_61724_performance_ratio",
        formula_version="v1.0",
        warnings=warnings
    )
```

### 5. Temperature-Corrected Power
```python
def estimate_temperature_corrected_power(
    p_stc: float,
    irradiance: float,
    module_temp: float,
    temp_coefficient: float   # e.g. -0.004 per °C
) -> float:
    """
    P_estimated = P_STC × (G/1000) × [1 + γ × (T_module - 25)]
    
    This is INDICATIVE only — not certified PV simulation.
    """
    return p_stc * (irradiance / 1000) * (1 + temp_coefficient * (module_temp - 25))
```

---

## Resampling Rules

```python
# analytics/resampling.py
AGGREGATION_RULES = {
    "power_kw":        "time_weighted_mean",    # NOT simple average
    "energy_kwh":      "sum",                   # Always sum interval energy
    "irradiance_w_m2": "mean",                  # Mean within window
    "ambient_temp_c":  "mean",
    "module_temp_c":   "mean",
}

# CRITICAL: Never fill long gaps with fabricated values
# Interpolation allowed ONLY for visualization, marked as "interpolated"
# Official totals exclude interpolated values
```

---

## MetricResult Data Class

```python
@dataclass
class MetricResult:
    value: float | None
    unit: str
    method: str
    formula_version: str
    sample_count: int
    coverage_pct: float
    warnings: list[str] = field(default_factory=list)
    is_estimated: bool = False
    prerequisites_met: bool = True
```

---

## Golden Dataset Tests

```python
# tests/test_analytics.py
# Hand-calculated reference values for 1 day × 15-minute intervals

GOLDEN_DATASET = {
    "interval_minutes": 15,
    "dc_capacity_kwp": 10.0,
    "readings": [
        # (timestamp, power_kw, energy_kwh, irradiance_w_m2, module_temp_c)
        ("09:00", 2.5, 0.625, 250, 35),
        ("09:15", 4.0, 1.000, 400, 38),
        ("09:30", 6.0, 1.500, 600, 42),
        # ... full day
    ],
    "expected": {
        "total_energy_kwh": 45.75,         # ± 0.01
        "specific_yield_kwh_kwp": 4.575,   # ± 0.01
        "irradiation_kwh_m2": 5.2,         # ± 0.05
        "performance_ratio_pct": 87.9,     # ± 0.5
        "peak_power_kw": 9.8,
        "coverage_pct": 96.0,
    }
}
```

---

## Exit Gate — All Must Pass

- [ ] Energy calculation matches golden dataset within ±0.01 kWh
- [ ] Specific yield matches golden dataset within ±0.01 kWh/kWp
- [ ] PR formula implemented per IEC 61724 standard
- [ ] PR > 1.0 triggers warning (not error)
- [ ] All metrics return unit, method, formula_version, coverage, warnings
- [ ] Resampling aggregates power as time-weighted mean
- [ ] Resampling sums energy (never averages energy)
- [ ] Analysis run saved to MongoDB with filter snapshot
- [ ] GET /analytics/runs/{id} returns persisted result
- [ ] Zero data: returns null value with explanation, not 0
