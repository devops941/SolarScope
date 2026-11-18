# Phase 0 — Data Discovery & Scope Freeze
**Duration:** 1 Week | **Difficulty:** Easy | **Week:** 1

---

## Objectives
Before writing a single line of code, lock down all data decisions. This phase prevents rework later.

- Gather all source CSV files from solar sites
- Decide: interval energy vs cumulative meter readings
- Confirm irradiance sensor plane, units, and sampling interval
- Lock timezone handling strategy
- Document Performance Ratio (PR) formula
- Create UI wireframes for all screens

---

## Key Decisions to Make

| Decision | Option A | Option B | Impact |
|----------|----------|----------|--------|
| Energy type | Interval kWh (per 15 min) | Cumulative meter (ever-increasing) | Changes entire validation logic |
| Irradiance plane | Horizontal (GHI) | Tilted (POA) | Changes PR formula |
| Timezone storage | UTC always | Local time | Affects all queries |
| Sampling interval | 15 minutes | 30 min / 1 hour | Affects aggregation |
| PR formula | Standard IEC | Custom derating | Affects analytics engine |

---

## Detailed Tasks

| # | Task | Artifact to Create | Days |
|---|------|--------------------|------|
| 1 | Collect all CSV samples from solar sites | `docs/data-sources.md` | 1 |
| 2 | Document CSV headers, data types, units per source | `docs/csv-schema-reference.md` | 1 |
| 3 | Decide interval vs cumulative energy | `docs/requirements/energy-calculation.md` | 1 |
| 4 | Lock irradiance sensor specs (plane, units, interval) | `docs/requirements/sensor-specs.md` | 0.5 |
| 5 | Define timezone handling (UTC storage, site-local display) | `docs/requirements/timezone-handling.md` | 0.5 |
| 6 | Document PR formula and formula versioning strategy | `docs/requirements/pr-formula.md` | 1 |
| 7 | Create wireframes: login, dashboard, import, analytics, alerts | `docs/wireframes/` | 1 |
| 8 | Write decision log for all major choices | `docs/decisions/DECISION_LOG.md` | 0.5 |
| 9 | Define canonical CSV column names (v1 schema) | `docs/canonical-csv-v1.md` | 0.5 |

---

## Canonical CSV Schema (v1)

```csv
timestamp,power_kw,energy_kwh,irradiance_w_m2,ambient_temp_c,module_temp_c,voltage_v,current_a,inverter_status
2026-11-18T09:00:00+05:30,4.20,1.05,420,29.0,38.5,410.2,10.24,NORMAL
```

| Column | Required | Unit | Notes |
|--------|----------|------|-------|
| timestamp | YES | ISO-8601 with timezone | e.g. `2026-11-18T09:00:00+05:30` |
| power_kw | One of these two | kW | Instantaneous power |
| energy_kwh | One of these two | kWh per interval | Interval OR cumulative |
| irradiance_w_m2 | Recommended | W/m² | Confirm sensor plane |
| ambient_temp_c | Optional | °C | Air temperature |
| module_temp_c | Optional | °C | Panel surface temp |
| voltage_v | Optional | V | DC voltage |
| current_a | Optional | A | DC current |
| inverter_status | Optional | Text | NORMAL, FAULT, etc. |

---

## Folder Structure After Phase 0

```
docs/
├── data-sources.md
├── csv-schema-reference.md
├── canonical-csv-v1.md
├── requirements/
│   ├── energy-calculation.md
│   ├── sensor-specs.md
│   ├── timezone-handling.md
│   └── pr-formula.md
├── decisions/
│   └── DECISION_LOG.md
└── wireframes/
    ├── 01_login.png
    ├── 02_dashboard.png
    ├── 03_import_flow.png
    ├── 04_analytics.png
    └── 05_alerts.png
```

---

## Exit Gate — All Must Pass

- [ ] Canonical CSV v1 schema locked and documented
- [ ] Energy model decided: interval OR cumulative (documented)
- [ ] Irradiance sensor plane confirmed (GHI or POA)
- [ ] Timezone strategy confirmed (UTC storage)
- [ ] PR formula documented with formula version number
- [ ] DECISION_LOG.md complete with all major choices
- [ ] Wireframes cover all 10+ screens
- [ ] Team has reviewed and agreed on all decisions
- [ ] No ambiguity in units, timezone, or sampling interval

---

## Notes
> This phase has no code. Its only output is documentation and decisions.
> Skipping this phase is the #1 cause of rework in data analytics projects.
> The PR formula decision affects Phase 8 and 9 significantly.
