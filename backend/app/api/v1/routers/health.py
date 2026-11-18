from fastapi import APIRouter
from app.core.database import get_db
from app.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health", summary="Health check")
async def health():
    settings = get_settings()
    try:
        await get_db().command("ping")
        db_status = "ok"
    except Exception:
        db_status = "unreachable"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "env": settings.APP_ENV,
        "database": db_status,
    }
