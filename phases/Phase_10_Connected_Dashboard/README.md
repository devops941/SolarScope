# Phase 10 — Connected Dashboard
**Duration:** 1 Week | **Difficulty:** Medium | **Week:** 14

---

## Objectives
Connect the dashboard KPI cards and charts to real API data using the shared filter contract. The dashboard must reconcile exactly with readings and analysis pages — same filters, same numbers.

---

## Critical Rule
> Do NOT calculate KPIs in React/TypeScript.
> ALL numbers come from backend API.
> Dashboard, Readings, Analytics must use the **same filter DTO and same query builder**.

---

## Detailed Tasks

| # | Task | File | Days |
|---|------|------|------|
| 1 | Build GET /dashboard/summary endpoint | `routers/dashboard.py` | 1 |
| 2 | Build GET /dashboard/series endpoint (chart data) | `routers/dashboard.py` | 1 |
| 3 | Build dashboard service using shared analytics functions | `services/dashboard.py` | 0.5 |
| 4 | Connect all 4 KPI cards to API | `features/dashboard/KpiCards.tsx` | 0.5 |
| 5 | Connect generation vs irradiance chart | `features/dashboard/GenerationChart.tsx` | 0.5 |
| 6 | Connect temperature chart | `features/dashboard/TemperatureChart.tsx` | 0.5 |
| 7 | Connect active alerts panel | `features/dashboard/AlertsPanel.tsx` | 0.5 |
| 8 | Implement filter bar (site/system/date range) | `features/dashboard/DashboardFilter.tsx` | 0.5 |
| 9 | Add filter state to URL params (shareable links) | `app/(app)/dashboard/page.tsx` | 0.5 |
| 10 | Add loading skeletons and error states to all widgets | All dashboard components | 0.5 |
| 11 | Verify dashboard numbers match readings + analytics | Manual reconciliation test | 0.5 |

---

## Files to Create

```
backend/app/
├── api/v1/routers/
│   └── dashboard.py
├── services/
│   └── dashboard.py              ← calls shared analytics functions

frontend/
├── app/(app)/dashboard/
│   └── page.tsx
├── features/dashboard/
│   ├── DashboardFilter.tsx       ← site/system/date filter bar
│   ├── KpiCards.tsx              ← 4 metric cards
│   ├── GenerationChart.tsx       ← generation vs irradiance
│   ├── TemperatureChart.tsx      ← ambient + module temp
│   ├── AlertsPanel.tsx           ← active alerts list
│   ├── DataCoverageBar.tsx       ← coverage progress bar
│   └── useDashboard.ts           ← TanStack Query hooks
```

---

## 4 KPI Cards

| KPI | Formula | Show Only When | Color |
|-----|---------|---------------|-------|
| Energy Today | Σ interval_energy_kwh | Valid energy readings exist | Solar Green |
| Specific Yield | Energy ÷ DC capacity kWp | DC capacity configured | Solar Green |
| Performance Ratio | AC energy ÷ reference energy | POA irradiance available | Solar Green / Warning |
| Data Coverage | valid intervals ÷ expected | Sampling interval known | depends on % |

---

## Dashboard API

```
GET /api/v1/dashboard/summary
Query: site_id, system_id, start, end, interval, quality

Response:
{
  "period": { "start": "...", "end": "...", "timezone": "Asia/Kolkata" },
  "kpis": {
    "energy_kwh": { "value": 128.4, "unit": "kWh", "coverage_pct": 96.2 },
    "specific_yield": { "value": 5.14, "unit": "kWh/kWp", "dc_capacity_kwp": 25 },
    "performance_ratio": { "value": 82.6, "unit": "%", "is_indicative": false },
    "data_coverage": { "value": 96.2, "unit": "%", "missing_intervals": 15 }
  },
  "alerts": { "open_count": 2, "critical_count": 0 }
}

GET /api/v1/dashboard/series
Query: same filter params

Response:
{
  "timestamps": ["2026-11-18T09:00:00+05:30", ...],
  "generation_kw": [4.2, 6.8, 9.1, ...],
  "irradiance_w_m2": [420, 610, 790, ...],
  "ambient_temp_c": [29.0, 30.1, 31.0, ...],
  "module_temp_c": [38.5, 42.0, 47.2, ...],
  "interval_minutes": 15
}
```

---

## Chart Color Rules

```
Generation / Power → Solar Green (#2BA784)
Irradiance         → Blue (#2563EB)
Ambient Temp       → Amber (#D99136)
Module Temp        → Red/Orange (#C84F55)

Always label axes with units.
Every chart must have: loading state, empty state, error state.
```

---

## Shareable Filter URL

```
/dashboard?site_id=abc&system_id=xyz&start=2026-11-01&end=2026-11-18&interval=15m

When user changes filter:
1. Update URL params
2. TanStack Query re-fetches with new params
3. All widgets refresh simultaneously
4. User can share URL — same filters load for other users
```

---

## Reconciliation Requirement

After connecting dashboard:
1. Set filter: Site A, System 1, Nov 1-18
2. Note dashboard "Energy Today": 128.4 kWh
3. Go to Readings page → same filter → export CSV
4. Sum energy column: must equal 128.4 kWh ± 0.01
5. Run analytics → energy metric: must equal 128.4 kWh ± 0.01
6. If any mismatch → bug in Phase 8/9/10 service layer

---

## Exit Gate — All Must Pass

- [ ] Dashboard loads real data from API (no hardcoded numbers)
- [ ] All 4 KPI cards show correct values with units
- [ ] KPI cards show tooltip with formula description
- [ ] Generation + irradiance chart renders correctly
- [ ] Temperature chart renders correctly
- [ ] Active alerts panel shows real alert count
- [ ] Changing site/system/date filter refreshes all widgets
- [ ] Loading skeletons appear while data fetches
- [ ] Empty state shown when no data for selected period
- [ ] Dashboard energy total matches readings CSV export total
