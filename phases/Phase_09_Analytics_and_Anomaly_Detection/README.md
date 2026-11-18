# Phase 9 — Analytics & Anomaly Detection
**Duration:** 2 Weeks | **Difficulty:** HARD | **Weeks:** 12-13

---

## Objectives
Build the analytics workspace (period comparison, correlation, baseline) and the anomaly detection engine with 6 explainable rules. Alerts must show evidence, not just flags.

---

## Detailed Tasks

| # | Task | File | Days |
|---|------|------|------|
| 1 | Build period comparison (compare 2 date ranges) | `analytics/comparison.py` | 1 |
| 2 | Build Pearson/Spearman correlation engine | `analytics/comparison.py` | 1 |
| 3 | Build baseline calculation (expected vs actual) | `analytics/comparison.py` | 1 |
| 4 | Build all 6 anomaly detection rules | `analytics/anomalies.py` | 2 |
| 5 | Build alert creation service | `services/alerts.py` | 0.5 |
| 6 | Build alert lifecycle (open → acknowledged → resolved) | `services/alerts.py` | 0.5 |
| 7 | Build GET/PATCH /alerts endpoints | `routers/alerts.py` | 0.5 |
| 8 | Frontend: Analytics workspace page | `app/(app)/analytics/page.tsx` | 1 |
| 9 | Frontend: Period comparison chart | `features/analytics/ComparisonChart.tsx` | 1 |
| 10 | Frontend: Correlation scatter plot | `features/analytics/CorrelationChart.tsx` | 1 |
| 11 | Frontend: Run analysis button + result display | `features/analytics/AnalysisRunner.tsx` | 0.5 |
| 12 | Frontend: Alerts page with evidence panel | `app/(app)/alerts/page.tsx` | 1 |
| 13 | Frontend: Alert detail + acknowledge button | `features/alerts/AlertDetail.tsx` | 0.5 |
| 14 | Write anomaly detection tests | `tests/test_anomalies.py` | 1 |

---

## Files to Create

```
backend/app/
├── analytics/
│   ├── comparison.py              ← period comparison, correlation, baseline
│   └── anomalies.py               ← all 6 anomaly rules
├── services/
│   └── alerts.py                  ← alert CRUD and lifecycle
├── api/v1/routers/
│   └── alerts.py

frontend/
├── app/(app)/
│   ├── analytics/page.tsx
│   └── alerts/page.tsx
├── features/
│   ├── analytics/
│   │   ├── AnalyticsWorkspace.tsx
│   │   ├── PeriodSelector.tsx
│   │   ├── ComparisonChart.tsx
│   │   ├── CorrelationChart.tsx
│   │   ├── AnalysisRunner.tsx
│   │   ├── MetricsPanel.tsx
│   │   └── useAnalytics.ts
│   └── alerts/
│       ├── AlertsList.tsx
│       ├── AlertDetail.tsx
│       ├── AlertEvidencePanel.tsx
│       ├── AlertStatusBadge.tsx
│       └── useAlerts.ts
```

---

## 6 Anomaly Detection Rules

```python
# analytics/anomalies.py

class AnomalyRule:
    code: str
    severity: Literal["info", "warning", "critical"]
    trigger: str
    evidence_fields: list[str]

ANOMALY_RULES = [
    AnomalyRule(
        code="OUTPUT_DROP",
        severity="warning",
        trigger="Output below irradiance-adjusted baseline for ≥3 consecutive intervals",
        evidence_fields=["actual_power_kw", "baseline_power_kw", "deviation_pct", "duration_minutes"]
    ),
    AnomalyRule(
        code="DAYLIGHT_FLATLINE",
        severity="critical",
        trigger="Power near-zero while irradiance exceeds 50 W/m² for ≥2 intervals",
        evidence_fields=["power_kw", "irradiance_w_m2", "start_time", "duration_minutes"]
    ),
    AnomalyRule(
        code="HIGH_MODULE_TEMP",
        severity="warning",
        trigger="Module temperature exceeds configured threshold (default 75°C)",
        evidence_fields=["module_temp_c", "threshold_c", "duration_minutes", "peak_temp_c"]
    ),
    AnomalyRule(
        code="DATA_GAP",
        severity="info",
        trigger="Missing intervals exceed configured tolerance (default 5% per day)",
        evidence_fields=["missing_count", "expected_count", "coverage_pct", "gap_start", "gap_end"]
    ),
    AnomalyRule(
        code="IRRADIANCE_MISMATCH",
        severity="warning",
        trigger="Irradiance high (>400 W/m²) but generation low (<30% of expected)",
        evidence_fields=["irradiance_w_m2", "actual_power_kw", "expected_power_kw", "ratio_pct"]
    ),
    AnomalyRule(
        code="SENSOR_OUTLIER",
        severity="info",
        trigger="Sensor value outside configured plausibility range",
        evidence_fields=["field", "value", "min_expected", "max_expected"]
    ),
]
```

---

## Alert Structure (MongoDB)

```json
{
  "_id": "ObjectId",
  "workspace_id": "ObjectId",
  "system_id": "ObjectId",
  "analysis_run_id": "ObjectId",
  "rule_code": "OUTPUT_DROP",
  "severity": "warning",
  "status": "open",
  "triggered_at": "2026-11-18T09:30:00Z",
  "evidence": {
    "actual_power_kw": 1.2,
    "baseline_power_kw": 8.5,
    "deviation_pct": -85.9,
    "duration_minutes": 45,
    "affected_intervals": ["09:30", "09:45", "10:00"]
  },
  "notes": [],
  "acknowledged_by": null,
  "resolved_at": null
}
```

---

## Period Comparison

```python
# analytics/comparison.py
def compare_periods(
    period_a: tuple[datetime, datetime],
    period_b: tuple[datetime, datetime],
    system_id: str,
    metrics: list[str]
) -> ComparisonResult:
    """
    Compare two time periods for the same system.
    Returns: metrics for both periods + delta + delta_pct
    """
    result_a = calculate_all_metrics(system_id, *period_a)
    result_b = calculate_all_metrics(system_id, *period_b)
    
    return ComparisonResult(
        period_a=result_a,
        period_b=result_b,
        deltas={m: result_b[m].value - result_a[m].value for m in metrics},
        delta_pcts={m: (result_b[m].value - result_a[m].value) / result_a[m].value * 100 for m in metrics}
    )
```

---

## Correlation Analysis

```python
def calculate_correlation(readings: list[Reading]) -> CorrelationResult:
    """
    Pearson correlation: generation vs irradiance
    Spearman rank correlation for robustness to outliers
    
    r > 0.95 → Strong correlation (normal behavior)
    r < 0.80 → Weak correlation (investigate)
    """
    from scipy.stats import pearsonr, spearmanr
    
    power = [r.power_kw for r in readings if r.irradiance_w_m2 and r.power_kw]
    irr = [r.irradiance_w_m2 for r in readings if r.irradiance_w_m2 and r.power_kw]
    
    pearson_r, pearson_p = pearsonr(power, irr)
    spearman_r, spearman_p = spearmanr(power, irr)
    
    return CorrelationResult(
        pearson_r=round(pearson_r, 3),
        spearman_r=round(spearman_r, 3),
        sample_count=len(power),
        interpretation="strong" if pearson_r > 0.95 else "moderate" if pearson_r > 0.80 else "weak",
        caveat="Correlation is not causation. Investigate weak correlation further."
    )
```

---

## Alert Disclaimer
> An anomaly is an **investigation signal**, not proof of equipment failure.
> Always show severity, trigger explanation, evidence, and suggested checks.
> Never auto-create work orders or send external alerts in MVP.

---

## Exit Gate — All Must Pass

- [ ] Period comparison returns metrics for both periods with delta
- [ ] Correlation returns Pearson + Spearman + interpretation
- [ ] All 6 anomaly rules implemented and testable
- [ ] OUTPUT_DROP: triggers only after 3+ consecutive intervals (not 1)
- [ ] DAYLIGHT_FLATLINE: threshold configurable, not hardcoded
- [ ] Alert evidence contains actual values (not just flag codes)
- [ ] Alert status lifecycle: open → acknowledged → resolved
- [ ] Analyst/Viewer cannot change alert status to resolved (only Site Manager+)
- [ ] Analysis run saved with filter snapshot for reproducibility
- [ ] Frontend analytics page loads and runs analysis via API
