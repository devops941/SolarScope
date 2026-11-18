# Phase 2 — Backend & Database Foundation
**Duration:** 1 Week | **Difficulty:** Medium | **Week:** 3

---

## Objectives
Set up the entire Python + FastAPI + MongoDB backend skeleton. By end of this phase, the local development stack runs with Docker Compose and API docs are accessible.

---

## Detailed Tasks

| # | Task | File to Create | Days |
|---|------|---------------|------|
| 1 | Initialize Python project with FastAPI + Pydantic v2 | `backend/` root | 0.5 |
| 2 | Setup project config (env vars, settings class) | `backend/app/core/config.py` | 0.5 |
| 3 | Connect MongoDB with async motor driver | `backend/app/core/database.py` | 0.5 |
| 4 | Setup structured logging with request ID | `backend/app/core/logging.py` | 0.5 |
| 5 | Create global error handler with standard contract | `backend/app/core/errors.py` | 0.5 |
| 6 | Create all MongoDB collections + indexes | `backend/scripts/create_indexes.py` | 1 |
| 7 | Create base repository class with workspace scoping | `backend/app/repositories/base.py` | 1 |
| 8 | Create all Pydantic schemas (request/response DTOs) | `backend/app/schemas/` | 1 |
| 9 | Build Docker Compose with all services | `docker-compose.yml` | 0.5 |
| 10 | Create health check endpoint | `backend/app/api/v1/routers/health.py` | 0.5 |
| 11 | Setup API router structure (all routes empty) | `backend/app/api/v1/` | 0.5 |
| 12 | Create requirements.txt / pyproject.toml | `backend/pyproject.toml` | 0.5 |

---

## Backend Folder Structure

```
backend/
├── app/
│   ├── main.py                       ← FastAPI app entry point
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py             ← includes all sub-routers
│   │       └── routers/
│   │           ├── health.py
│   │           ├── auth.py
│   │           ├── sites.py
│   │           ├── systems.py
│   │           ├── imports.py
│   │           ├── readings.py
│   │           ├── dashboard.py
│   │           ├── analytics.py
│   │           ├── alerts.py
│   │           └── reports.py
│   ├── core/
│   │   ├── config.py                 ← env vars, Settings class
│   │   ├── database.py               ← MongoDB connection
│   │   ├── security.py               ← JWT, password hashing
│   │   ├── logging.py                ← structured logger
│   │   ├── errors.py                 ← error handlers
│   │   └── permissions.py            ← RBAC helpers
│   ├── schemas/
│   │   ├── common.py                 ← pagination, filters, errors
│   │   ├── auth.py
│   │   ├── sites.py
│   │   ├── systems.py
│   │   ├── imports.py
│   │   ├── readings.py
│   │   ├── dashboard.py
│   │   ├── analytics.py
│   │   ├── alerts.py
│   │   └── reports.py
│   ├── domain/
│   │   ├── entities.py               ← Python dataclasses
│   │   ├── enums.py                  ← ImportStatus, Role, Severity etc.
│   │   └── units.py                  ← unit conversion helpers
│   ├── repositories/
│   │   ├── base.py                   ← BaseRepository with workspace scope
│   │   ├── users.py
│   │   ├── workspaces.py
│   │   ├── sites.py
│   │   ├── systems.py
│   │   ├── imports.py
│   │   └── readings.py
│   ├── services/           (empty stubs in this phase)
│   ├── ingestion/          (empty stubs in this phase)
│   ├── analytics/          (empty stubs in this phase)
│   ├── reports/            (empty stubs in this phase)
│   └── workers/            (empty stubs in this phase)
├── tests/
│   └── conftest.py
├── scripts/
│   ├── create_indexes.py
│   └── seed_demo.py
├── pyproject.toml
├── requirements.txt
└── Dockerfile
```

---

## MongoDB Collections & Indexes

```python
# scripts/create_indexes.py

collections = {
    "workspaces": [
        {"keys": [("name", 1)], "unique": True}
    ],
    "users": [
        {"keys": [("email", 1)], "unique": True}
    ],
    "memberships": [
        {"keys": [("workspace_id", 1), ("user_id", 1)], "unique": True}
    ],
    "sites": [
        {"keys": [("workspace_id", 1), ("name", 1)]}
    ],
    "solar_systems": [
        {"keys": [("site_id", 1), ("status", 1)]}
    ],
    "imports": [
        {"keys": [("workspace_id", 1), ("checksum", 1)]},
        {"keys": [("status", 1)]}
    ],
    "readings": [
        {"keys": [("system_id", 1), ("timestamp_utc", 1)], "unique": True},
        {"keys": [("workspace_id", 1), ("site_id", 1)]}
    ],
    "analysis_runs": [
        {"keys": [("system_id", 1), ("created_at", -1)]}
    ],
    "alerts": [
        {"keys": [("workspace_id", 1), ("status", 1), ("created_at", -1)]}
    ],
    "audit_logs": [
        {"keys": [("workspace_id", 1), ("created_at", -1)]}
    ]
}
```

---

## Docker Compose Setup

```yaml
# docker-compose.yml
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      NEXT_PUBLIC_API_BASE_URL: http://localhost:8000

  api:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      MONGODB_URI: mongodb://mongo:27017
      MONGODB_DATABASE: solarscope
      APP_ENV: development
    depends_on: [mongo]

  worker:
    build: ./backend
    command: python -m app.workers.main
    environment:
      MONGODB_URI: mongodb://mongo:27017
    depends_on: [mongo]

  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

---

## Standard Error Contract

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some rows need correction.",
    "details": [
      {"row": 18, "field": "irradiance_w_m2", "reason": "Value exceeds configured limit."}
    ]
  }
}
```

---

## Shared Filter DTO

```python
class FilterParams(BaseModel):
    site_id: str
    system_id: str
    start: datetime
    end: datetime
    interval: Literal["5m", "15m", "30m", "1h", "1d"] = "15m"
    quality: Literal["all", "valid", "flagged"] = "valid"
```

---

## Install Commands

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install fastapi uvicorn[standard] motor pydantic[email] pydantic-settings
pip install python-jose[cryptography] passlib[argon2]
pip install pandas numpy scipy scikit-learn statsmodels
pip install python-multipart aiofiles
pip install pytest pytest-asyncio httpx
```

---

## Exit Gate — All Must Pass

- [ ] `docker-compose up` starts all services without errors
- [ ] FastAPI running at `http://localhost:8000`
- [ ] API docs accessible at `http://localhost:8000/docs`
- [ ] `/health` endpoint returns `{"status": "ok"}`
- [ ] MongoDB connected and all collections created with indexes
- [ ] All routers registered (even if endpoints return 501 Not Implemented)
- [ ] Pydantic schemas defined for all major models
- [ ] `.env.example` file with all required variables documented
