# SolarScope — Phase-by-Phase Development Plan
**Total Duration:** 15–18 Weeks | **Stack:** Next.js + FastAPI + MongoDB

---

## All 14 Phases

| # | Phase Folder | Duration | Difficulty | Weeks |
|---|-------------|----------|-----------|-------|
| 0 | [Phase_00_Data_Discovery_Scope_Freeze](./Phase_00_Data_Discovery_Scope_Freeze/README.md) | 1 week | Easy | 1 |
| 1 | [Phase_01_UI_System_Clickable_Shell](./Phase_01_UI_System_Clickable_Shell/README.md) | 1 week | Medium | 2 |
| 2 | [Phase_02_Backend_Database_Foundation](./Phase_02_Backend_Database_Foundation/README.md) | 1 week | Medium | 3 |
| 3 | [Phase_03_Auth_Workspace_RBAC](./Phase_03_Auth_Workspace_RBAC/README.md) | 1 week | Hard | 4 |
| 4 | [Phase_04_Sites_and_Systems](./Phase_04_Sites_and_Systems/README.md) | 1 week | Medium | 5 |
| 5 | [Phase_05_CSV_Template_and_Preview](./Phase_05_CSV_Template_and_Preview/README.md) | 1 week | Medium | 6 |
| 6 | [Phase_06_Validation_and_Import_Worker](./Phase_06_Validation_and_Import_Worker/README.md) | 2 weeks | HARD | 7-8 |
| 7 | [Phase_07_Readings_Explorer](./Phase_07_Readings_Explorer/README.md) | 1 week | Medium | 9 |
| 8 | [Phase_08_Calculation_Engine](./Phase_08_Calculation_Engine/README.md) | 2 weeks | HARD | 10-11 |
| 9 | [Phase_09_Analytics_and_Anomaly_Detection](./Phase_09_Analytics_and_Anomaly_Detection/README.md) | 2 weeks | HARD | 12-13 |
| 10 | [Phase_10_Connected_Dashboard](./Phase_10_Connected_Dashboard/README.md) | 1 week | Medium | 14 |
| 11 | [Phase_11_Export_and_Report_Engine](./Phase_11_Export_and_Report_Engine/README.md) | 1 week | Medium | 15 |
| 12 | [Phase_12_QA_and_Security_Hardening](./Phase_12_QA_and_Security_Hardening/README.md) | 1-2 weeks | Hard | 16-17 |
| 13 | [Phase_13_Deployment_and_Handover](./Phase_13_Deployment_and_Handover/README.md) | 1 week | Medium | 18 |

---

## Critical Path (Must Follow This Order)

```
Phase 0 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
                                                        ↓
                                               Phase 7 (Readings)
                                                        ↓
                                               Phase 8 (Calculations)
                                                        ↓
                                               Phase 9 (Analytics)
                                                        ↓
Phase 1 (UI) ──────────────────────────────→ Phase 10 (Dashboard)
                                                        ↓
                                               Phase 11 (Exports)
                                                        ↓
                                               Phase 12 (QA)
                                                        ↓
                                               Phase 13 (Deploy)
```

> Phase 1 (UI) can be built in parallel with Phases 2-6.

---

## 3 Hardest Phases (Spend Extra Time Here)

| Phase | Why It's Hard |
|-------|--------------|
| Phase 6 — Import Worker | Background jobs, batch writes, idempotency, rollback, all 10 validation rules |
| Phase 8 — Calculation Engine | PR formula, time alignment, formula versioning, golden dataset tests |
| Phase 9 — Anomaly Detection | 6 rules with evidence, alert lifecycle, correlation analysis |

---

## Quick Start Checklist (First 2 Weeks)

**Week 1 (Phase 0):**
- [ ] Get sample CSV files from solar site (or use the demo generator)
- [ ] Decide: interval energy OR cumulative meter?
- [ ] Confirm: irradiance sensor is GHI (horizontal) or POA (tilted)?
- [ ] Write formula decision log
- [ ] Create wireframes for all screens

**Week 2 (Phase 1 + setup):**
- [ ] `npx create-next-app@latest frontend --typescript --tailwind --app`
- [ ] Install shadcn/ui, TanStack Query, Plotly
- [ ] Build Sidebar + Topbar
- [ ] Create all 11 page routes
- [ ] Set up Docker Compose with MongoDB

---

## Technology Quick Reference

```
Frontend:  Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query
Backend:   Python 3.12, FastAPI, Pydantic v2, Motor (async MongoDB)
Database:  MongoDB 7
Analytics: Pandas, NumPy, SciPy, scikit-learn
Charts:    Plotly / Recharts
Auth:      JWT + Argon2id
Deploy:    Docker Compose + Nginx
```
