# Phase 11 — Export & Report Engine
**Duration:** 1 Week | **Difficulty:** Medium | **Week:** 15

---

## Objectives
Build CSV and PDF exports that exactly match what the user sees on screen. No export should ever disagree with dashboard totals. All exports reference the same filter snapshot or analysis run.

---

## Core Rule
> Every export uses a **filter snapshot or analysis_run_id** as source of truth.
> Never recalculate with different defaults in the export function.

---

## Detailed Tasks

| # | Task | File | Days |
|---|------|------|------|
| 1 | Build filtered readings CSV exporter | `reports/csv_exporter.py` | 0.5 |
| 2 | Build analysis metrics CSV exporter | `reports/csv_exporter.py` | 0.5 |
| 3 | Build time-series CSV exporter | `reports/csv_exporter.py` | 0.5 |
| 4 | Build PDF performance report generator | `reports/pdf_generator.py` | 2 |
| 5 | Build report background worker | `workers/report_worker.py` | 1 |
| 6 | Build POST /reports endpoint | `routers/reports.py` | 0.5 |
| 7 | Build GET /reports/{id}/download endpoint | `routers/reports.py` | 0.5 |
| 8 | Frontend: Export menu component | `components/ui/ExportMenu.tsx` | 0.5 |
| 9 | Frontend: Report builder page | `app/(app)/reports/page.tsx` | 0.5 |
| 10 | Frontend: Download status indicator | `features/reports/DownloadStatus.tsx` | 0.5 |

---

## Files to Create

```
backend/app/
├── reports/
│   ├── __init__.py
│   ├── csv_exporter.py            ← all CSV export types
│   ├── pdf_generator.py           ← WeasyPrint / ReportLab PDF
│   └── templates/
│       └── report.html            ← Jinja2 HTML template for PDF
├── workers/
│   └── report_worker.py
├── api/v1/routers/
│   └── reports.py

frontend/
├── app/(app)/reports/
│   └── page.tsx
├── features/reports/
│   ├── ReportBuilder.tsx
│   ├── ReportPreview.tsx
│   ├── DownloadStatus.tsx
│   └── useReports.ts
├── components/ui/
│   └── ExportMenu.tsx
```

---

## Export Types

### 1. Filtered Readings CSV
```csv
timestamp_local,timestamp_utc,power_kw,energy_kwh,irradiance_w_m2,ambient_temp_c,module_temp_c,quality,source_import
2026-11-18T09:00:00+05:30,2026-11-18T03:30:00Z,4.20,1.05,420,29.0,38.5,valid,import_abc123
```
Source: Same query as Readings Explorer. Filters must match exactly.

### 2. Analysis Metrics CSV
```csv
metric,value,unit,method,formula_version,sample_count,coverage_pct,warnings
total_energy,128.4,kWh,interval_energy_sum,v1.0,1152,96.2,
specific_yield,5.14,kWh/kWp,energy_divided_by_dc_capacity,v1.0,,,
performance_ratio,82.6,%,iec_61724_performance_ratio,v1.0,1152,96.2,
```
Source: Persisted analysis_run document.

### 3. Time-Series CSV
```csv
timestamp_local,generation_kw,energy_kwh,irradiance_w_m2,ambient_temp_c,module_temp_c,quality_flags
2026-11-18T09:00:00+05:30,4.20,1.05,420,29.0,38.5,valid
```
Source: Same aggregation as dashboard chart series.

### 4. Rejected Rows CSV (from Import)
```csv
source_row_number,timestamp,power_kw,energy_kwh,error_code,error_message
18,2026-11-18T09:00:00+05:30,-5.2,,NEGATIVE_POWER,power_kw value -5.2 is negative
```

### 5. PDF Performance Report
```
Sections:
1. Executive Summary (site, system, period, generated time, KPIs)
2. System Profile (DC/AC capacity, panels, configuration completeness)
3. Performance Metrics (energy, yield, PR, peak power, coverage)
4. Trend Charts (generation/irradiance, temperature)
5. Insights & Anomalies (severity, evidence, status)
6. Data Quality (accepted/missing/flagged, import references)
7. Methodology (formula version, assumptions, timezone, units, limitations)
```

---

## PDF Report Consistency Rule

```python
# pdf_generator.py

def generate_report(analysis_run_id: str) -> bytes:
    # 1. Load analysis_run from MongoDB (never recalculate)
    run = analysis_runs_repo.get(analysis_run_id)
    
    # 2. Use run.filter_snapshot for all queries
    readings = readings_repo.get(run.filter_snapshot)
    
    # 3. KPIs come from run.metrics (pre-calculated, versioned)
    kpis = run.metrics
    
    # 4. Charts use same data as dashboard series endpoint
    series = dashboard_service.get_series(run.filter_snapshot)
    
    # NEVER recalculate KPIs here — use saved run
    # PDF values MUST match what user saw on screen when they ran analysis
```

---

## PDF Headers (Always Include)

```
Generated: 2026-11-18 14:30 IST
Site: Chennai Rooftop Plant
System: Rooftop Array A
Period: 2026-11-01 to 2026-11-18 (Asia/Kolkata)
Filters: 15-minute interval, valid readings only
Formula Version: v1.0
Analysis Run ID: run_abc123
Units: kWh, kWp, W/m², °C
Coverage: 96.2% (15 missing intervals)
```

---

## Report Worker Status

```
queued → generating → ready / failed

Frontend polls GET /reports/{id} every 2s until terminal state.
Stop polling after "ready" or "failed".
Show file size + generated timestamp when ready.
```

---

## Export UX Rules

- Show export menu on Readings, Analytics, and Dashboard pages
- After clicking export → show "Preparing..." state
- When ready → show download button with file size
- Include filter summary in export header/filename
- Filename format: `solarscope_readings_site-name_2026-11-01_2026-11-18.csv`

---

## Exit Gate — All Must Pass

- [ ] Filtered readings CSV contains exactly the same rows as the table
- [ ] Analysis metrics CSV values match dashboard KPI numbers
- [ ] PDF report KPIs come from saved analysis run (not recalculated)
- [ ] PDF includes methodology section with formula version
- [ ] PDF includes data quality section (coverage, missing intervals)
- [ ] Download requires authentication (no public URLs)
- [ ] Report generation is non-blocking (background worker)
- [ ] Frontend shows generating/ready/failed status
- [ ] Regenerating report from same analysis run gives identical values
- [ ] Export filename includes site name + date range
