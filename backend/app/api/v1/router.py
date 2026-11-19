from fastapi import APIRouter
from app.api.v1.routers import (
    health, auth, sites, systems, imports, readings,
    dashboard, analytics, alerts, reports, demo,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(sites.router)
api_router.include_router(systems.router)
api_router.include_router(imports.router)
api_router.include_router(readings.router)
api_router.include_router(dashboard.router)
api_router.include_router(analytics.router)
api_router.include_router(alerts.router)
api_router.include_router(reports.router)
api_router.include_router(demo.router)
