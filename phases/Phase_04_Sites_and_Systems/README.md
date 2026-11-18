# Phase 4 — Sites & Solar Systems
**Duration:** 1 Week | **Difficulty:** Medium | **Week:** 5

---

## Objectives
Full CRUD for solar sites and solar systems, with capacity metadata, timezone, and audit trail. After this phase, users can configure their solar installation.

---

## Data Models

### Site
```json
{
  "_id": "ObjectId",
  "workspace_id": "ObjectId",
  "name": "Chennai Rooftop Plant",
  "timezone": "Asia/Kolkata",
  "location": { "lat": 13.0827, "lng": 80.2707 },
  "address": "No.12, Anna Nagar, Chennai",
  "status": "active",
  "created_at": "2026-11-18T00:00:00Z",
  "updated_at": "2026-11-18T00:00:00Z"
}
```

### Solar System
```json
{
  "_id": "ObjectId",
  "site_id": "ObjectId",
  "workspace_id": "ObjectId",
  "name": "Rooftop Array A",
  "dc_capacity_kwp": 25.0,
  "ac_capacity_kw": 20.0,
  "panel_count": 100,
  "panel_rating_w": 250,
  "inverter_make": "SMA",
  "tilt_degrees": 15,
  "azimuth_degrees": 180,
  "temp_coefficient_per_c": -0.004,
  "commissioning_date": "2024-01-15",
  "status": "active"
}
```

---

## Detailed Tasks

| # | Task | File | Days |
|---|------|------|------|
| 1 | Build sites repository (CRUD) | `repositories/sites.py` | 0.5 |
| 2 | Build systems repository (CRUD) | `repositories/systems.py` | 0.5 |
| 3 | Build sites service (validation, audit) | `services/sites.py` | 0.5 |
| 4 | Build systems service | `services/systems.py` | 0.5 |
| 5 | Implement GET/POST /sites endpoints | `routers/sites.py` | 0.5 |
| 6 | Implement GET/PATCH /sites/{id} endpoints | `routers/sites.py` | 0.5 |
| 7 | Implement GET/POST /sites/{id}/systems endpoints | `routers/systems.py` | 0.5 |
| 8 | Implement GET/PATCH /systems/{id} endpoints | `routers/systems.py` | 0.5 |
| 9 | Add audit log on every site/system mutation | `services/audit.py` | 0.5 |
| 10 | Frontend: Sites list page with table + create drawer | `app/(app)/sites/page.tsx` | 1 |
| 11 | Frontend: Site detail page | `app/(app)/sites/[siteId]/page.tsx` | 0.5 |
| 12 | Frontend: Create/Edit site drawer form | `features/sites/SiteForm.tsx` | 0.5 |
| 13 | Frontend: Systems list inside site detail | `features/systems/SystemsList.tsx` | 0.5 |
| 14 | Frontend: Create/Edit system form | `features/systems/SystemForm.tsx` | 0.5 |
| 15 | Write sites/systems API tests | `tests/test_sites.py` | 0.5 |

---

## Files to Create

```
backend/app/
├── api/v1/routers/
│   ├── sites.py
│   └── systems.py
├── services/
│   ├── sites.py
│   ├── systems.py
│   └── audit.py
├── repositories/
│   ├── sites.py
│   └── systems.py
├── schemas/
│   ├── sites.py
│   └── systems.py

frontend/
├── app/(app)/
│   ├── sites/
│   │   ├── page.tsx
│   │   └── [siteId]/
│   │       └── page.tsx
│   └── systems/
│       └── [systemId]/
│           └── page.tsx
├── features/
│   ├── sites/
│   │   ├── SitesList.tsx
│   │   ├── SiteForm.tsx
│   │   ├── SiteDetail.tsx
│   │   └── useSites.ts
│   └── systems/
│       ├── SystemsList.tsx
│       ├── SystemForm.tsx
│       ├── SystemDetail.tsx
│       └── useSystems.ts
```

---

## API Endpoints

```
GET    /api/v1/sites                    → paginated sites list
POST   /api/v1/sites                    → create site
GET    /api/v1/sites/{id}              → site detail
PATCH  /api/v1/sites/{id}              → update site
DELETE /api/v1/sites/{id}              → archive (soft delete)

GET    /api/v1/sites/{id}/systems       → systems for a site
POST   /api/v1/sites/{id}/systems       → create system
GET    /api/v1/systems/{id}            → system detail
PATCH  /api/v1/systems/{id}            → update system
```

---

## Validation Rules

```python
# Site validation
- name: 1-100 chars, unique within workspace
- timezone: valid IANA timezone string (e.g. "Asia/Kolkata")
- lat: -90 to 90, lng: -180 to 180

# System validation
- dc_capacity_kwp: > 0, required
- ac_capacity_kw: > 0, <= dc_capacity_kwp * 1.2 (clipping ratio)
- tilt_degrees: 0 to 90
- azimuth_degrees: 0 to 360
- temp_coefficient_per_c: typically -0.005 to -0.001 (negative)
- panel_count * panel_rating_w / 1000 ≈ dc_capacity_kwp (warn if mismatch)
```

---

## Exit Gate — All Must Pass

- [ ] Site can be created, read, updated, archived
- [ ] Solar system can be created, linked to a site, updated
- [ ] Capacity validation works (negative values rejected)
- [ ] Timezone validation works (invalid TZ string rejected)
- [ ] Audit log entry created on every mutation
- [ ] Site from Workspace A not visible to Workspace B user
- [ ] Frontend: Sites list loads from API
- [ ] Frontend: Create site form submits and refreshes list
- [ ] Frontend: System form validates capacity fields
- [ ] API tests pass for all CRUD operations
