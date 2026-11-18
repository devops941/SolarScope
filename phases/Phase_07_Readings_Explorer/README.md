# Phase 7 — Readings Explorer
**Duration:** 1 Week | **Difficulty:** Medium | **Week:** 9

---

## Objectives
Build the readings explorer: a filterable, sortable, paginated table that shows all normalized sensor readings. Users can trace each row back to its source import and export filtered data.

---

## Detailed Tasks

| # | Task | File | Days |
|---|------|------|------|
| 1 | Build readings repository with filter/pagination | `repositories/readings.py` | 1 |
| 2 | Build GET /readings endpoint with shared filter DTO | `routers/readings.py` | 0.5 |
| 3 | Build POST /readings/manual (manual observation) | `routers/readings.py` | 0.5 |
| 4 | Add quality flag filtering | `repositories/readings.py` | 0.5 |
| 5 | Add data gap detection (missing expected intervals) | `services/readings.py` | 1 |
| 6 | Frontend: Readings page with filter bar | `app/(app)/readings/page.tsx` | 1 |
| 7 | Frontend: Sortable paginated table | `features/readings/ReadingsTable.tsx` | 1 |
| 8 | Frontend: Row detail drawer (source tracing) | `features/readings/ReadingDetail.tsx` | 0.5 |
| 9 | Frontend: Quality flag chips/badges | `features/readings/QualityBadge.tsx` | 0.5 |
| 10 | Frontend: Export filtered readings CSV button | `features/readings/ExportButton.tsx` | 0.5 |

---

## Files to Create

```
backend/app/
├── api/v1/routers/
│   └── readings.py
├── services/
│   └── readings.py                ← gap detection, coverage calc
├── repositories/
│   └── readings.py                ← filter, paginate, sort

frontend/
├── app/(app)/readings/
│   └── page.tsx
├── features/readings/
│   ├── ReadingsTable.tsx
│   ├── ReadingsFilterBar.tsx
│   ├── ReadingDetail.tsx          ← drawer showing source import
│   ├── QualityBadge.tsx
│   ├── ExportButton.tsx
│   └── useReadings.ts
```

---

## Readings Table Columns

| Column | Type | Sortable | Description |
|--------|------|----------|-------------|
| Timestamp | datetime | YES | Local timezone display |
| Power (kW) | number | YES | Instantaneous power |
| Energy (kWh) | number | YES | Interval energy |
| Irradiance (W/m²) | number | YES | Solar irradiance |
| Ambient Temp (°C) | number | NO | Air temperature |
| Module Temp (°C) | number | NO | Panel temperature |
| Quality | badge | YES | valid / flagged / missing |
| Source | link | NO | Import that created this row |

---

## Filter Options

```
- Site (dropdown)
- System (dropdown, filtered by site)
- Date range (date range picker)
- Interval (15m / 30m / 1h / 1d)
- Quality status (all / valid / flagged / missing)
- Import source (optional — trace specific import)
```

---

## Quality Flags

```python
QUALITY_FLAGS = {
    "valid":              "Passed all validation rules",
    "flagged_irradiance": "Irradiance value outside normal range",
    "flagged_temp":       "Temperature value outside normal range",
    "flagged_power":      "Power value suspicious (low during daylight)",
    "interpolated":       "Value interpolated for visualization (excluded from totals)",
    "missing":            "Expected interval with no observation",
    "duplicate_skipped":  "Row matched existing; original kept",
    "duplicate_replaced": "Row replaced an existing reading",
}
```

---

## Data Gap Detection

```python
# services/readings.py
def detect_gaps(readings, expected_interval_minutes, system_id, start, end):
    """
    Compare actual timestamps against expected grid.
    Return list of missing intervals with count and coverage %.
    """
    expected_times = generate_time_grid(start, end, expected_interval_minutes)
    actual_times = set(r.timestamp_utc for r in readings)
    missing = [t for t in expected_times if t not in actual_times]
    coverage = (len(actual_times) / len(expected_times)) * 100
    return {"missing_count": len(missing), "coverage_pct": coverage, "gaps": missing}
```

---

## Row Detail Drawer

When user clicks a row, show:
- Full reading values (all columns)
- Quality flags with explanation
- Source import: filename, import date, actor, import status
- Link: "View this import" → takes to imports page filtered to that import

---

## API Endpoint

```
GET /api/v1/readings
Query params: site_id, system_id, start, end, interval, quality, 
              import_id, page, page_size, sort_by, sort_order

Response:
{
  "items": [ { reading objects } ],
  "total": 2847,
  "page": 1,
  "page_size": 50,
  "coverage_pct": 96.2,
  "missing_intervals": 112
}
```

---

## Exit Gate — All Must Pass

- [ ] Readings API returns paginated results with correct filters
- [ ] Date range filter correctly converts local → UTC
- [ ] Quality flag filter works (valid/flagged/all)
- [ ] Row detail shows source import correctly
- [ ] Data gap count shown in filter summary
- [ ] Export filtered readings returns exact same rows as table
- [ ] Empty state shown when no readings match filters
- [ ] Sorting by timestamp, power, energy works
- [ ] Pagination works (page 1, 2, 3 …)
- [ ] Readings from other workspaces never appear
