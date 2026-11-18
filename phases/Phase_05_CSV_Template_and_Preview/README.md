# Phase 5 — CSV Template & Upload Preview
**Duration:** 1 Week | **Difficulty:** Medium | **Week:** 6

---

## Objectives
Users can download a blank CSV template and a sample file, upload their own CSV, map columns, select units/timezone, and **preview rows without saving anything to the database yet**.

---

## Wizard Steps (8 Steps)

```
Step 1: Choose Site/System
Step 2: Upload CSV file (drag/drop)
Step 3: Map columns to canonical names
Step 4: Choose units, timezone, energy mode
Step 5: Preview 20-50 rows with type inference
Step 6: See accepted/rejected/suspicious counts
Step 7: Choose duplicate policy
Step 8: Confirm → queues import job (Phase 6)
```

---

## Detailed Tasks

| # | Task | File | Days |
|---|------|------|------|
| 1 | Create blank template CSV generator | `ingestion/template_generator.py` | 0.5 |
| 2 | Create demo/sample CSV generator (synthetic data) | `scripts/seed_demo.py` | 1 |
| 3 | Build GET /imports/template endpoint | `routers/imports.py` | 0.5 |
| 4 | Build GET /imports/sample endpoint | `routers/imports.py` | 0.5 |
| 5 | Build POST /imports/preview (upload + parse headers) | `routers/imports.py` | 0.5 |
| 6 | Build CSV header parser (auto-detect + alias mapping) | `ingestion/parser.py` | 1 |
| 7 | Build column mapper with alias dictionary | `ingestion/mapper.py` | 0.5 |
| 8 | Build unit normalizer (kW→W, etc.) | `ingestion/normalizer.py` | 0.5 |
| 9 | Build timestamp parser with timezone handling | `ingestion/normalizer.py` | 0.5 |
| 10 | Store uploaded file with SHA-256 checksum | `services/imports.py` | 0.5 |
| 11 | Frontend: Import wizard multi-step form | `app/(app)/imports/new/page.tsx` | 2 |
| 12 | Frontend: File dropzone component | `components/ui/FileDropzone.tsx` | 0.5 |
| 13 | Frontend: CSV mapping table component | `components/imports/CsvMappingTable.tsx` | 0.5 |
| 14 | Frontend: Preview table component | `components/imports/ImportPreviewTable.tsx` | 0.5 |

---

## Files to Create

```
backend/app/
├── api/v1/routers/
│   └── imports.py                 ← template, sample, preview endpoints
├── ingestion/
│   ├── __init__.py
│   ├── parser.py                  ← parse CSV headers and rows
│   ├── mapper.py                  ← map user columns to canonical names
│   ├── normalizer.py              ← unit conversion, timestamp parsing
│   └── template_generator.py     ← generate blank template + sample CSV
├── services/
│   └── imports.py                 ← file storage, checksum, import record

frontend/
├── app/(app)/imports/
│   ├── page.tsx                   ← import history list
│   └── new/
│       └── page.tsx               ← import wizard
├── components/
│   ├── ui/
│   │   └── FileDropzone.tsx
│   └── imports/
│       ├── CsvMappingTable.tsx
│       ├── ImportPreviewTable.tsx
│       └── ValidationSummary.tsx
├── features/imports/
│   ├── ImportWizard.tsx           ← multi-step wizard container
│   ├── steps/
│   │   ├── Step1_ScopeSelect.tsx
│   │   ├── Step2_Upload.tsx
│   │   ├── Step3_Mapping.tsx
│   │   ├── Step4_Units.tsx
│   │   ├── Step5_Preview.tsx
│   │   ├── Step6_Review.tsx
│   │   ├── Step7_Policy.tsx
│   │   └── Step8_Confirm.tsx
│   └── useImportWizard.ts
```

---

## Column Alias Dictionary

```python
# ingestion/mapper.py
COLUMN_ALIASES = {
    "timestamp": ["ts", "datetime", "time", "date_time", "recorded_at", "timestamp_local"],
    "power_kw": ["power", "pwr", "generation_kw", "active_power", "p_kw", "watts_kw"],
    "energy_kwh": ["energy", "kwh", "generation_kwh", "energy_wh", "e_kwh"],
    "irradiance_w_m2": ["irradiance", "solar_irradiance", "ghi", "poa", "irr", "w_m2"],
    "ambient_temp_c": ["ambient_temp", "air_temp", "temp_c", "temperature", "amb_temp"],
    "module_temp_c": ["module_temp", "panel_temp", "cell_temp", "mod_temp"],
    "voltage_v": ["voltage", "dc_voltage", "vdc", "v"],
    "current_a": ["current", "dc_current", "idc", "i", "amps"],
    "inverter_status": ["status", "inv_status", "state", "inverter_state"],
}
```

---

## Timestamp Parsing Rules

```python
# normalizer.py
# Always store timestamps in UTC
# Display in site's local timezone

SUPPORTED_FORMATS = [
    "%Y-%m-%dT%H:%M:%S%z",          # ISO-8601 with TZ
    "%Y-%m-%d %H:%M:%S",            # No TZ → require source_timezone
    "%d/%m/%Y %H:%M",               # Indian date format
    "%Y-%m-%dT%H:%M:%SZ",           # UTC explicit
    "%d-%m-%Y %H:%M:%S",
]

# Cumulative energy detection:
# If values are always increasing → cumulative meter
# Convert to interval: interval_kwh[i] = cumulative[i] - cumulative[i-1]
# Handle rollover: if delta < 0 → meter reset detected
```

---

## Demo CSV Generator Specification

```python
# scripts/seed_demo.py
Generator parameters:
- timezone: "Asia/Kolkata"
- start: "2026-10-01"
- days: 30
- interval_minutes: 15
- dc_capacity_kwp: 25
- peak_irradiance: 850  # W/m²
- ambient_range: (25, 38)  # °C
- missing_rate: 1%
- duplicate_rate: 0.2%
- invalid_rate: 0.1%

Output files:
- solarscope_readings_template_v1.csv      (blank template)
- solarscope_demo_30_days_clean.csv        (clean 30-day data)
- solarscope_demo_validation_cases.csv     (intentional errors)
- solarscope_demo_two_systems.csv          (two-system comparison)
- solarscope_rejected_rows_example.csv     (rejected rows format)
```

---

## Exit Gate — All Must Pass

- [ ] `/imports/template` returns downloadable blank CSV
- [ ] `/imports/sample` returns 30-day synthetic CSV
- [ ] File upload saves file and returns SHA-256 checksum
- [ ] Header auto-detection suggests correct mapping for common aliases
- [ ] Preview returns first 20-50 rows with type inference
- [ ] Duplicate file (same checksum) shows warning, not silent duplicate
- [ ] Timestamps normalized to UTC correctly
- [ ] Energy mode selection (interval vs cumulative) works
- [ ] Frontend wizard: all 8 steps navigable
- [ ] No data written to readings collection yet in this phase
