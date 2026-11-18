from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING
from app.core.config import get_settings
import logging

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    if _client is None:
        raise RuntimeError("MongoDB client not initialized. Call connect_db() first.")
    return _client


def get_db() -> AsyncIOMotorDatabase:
    settings = get_settings()
    return get_client()[settings.mongodb_database]


async def connect_db() -> None:
    global _client
    settings = get_settings()
    logger.info("Connecting to MongoDB: %s", settings.MONGODB_URI)
    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    # Verify connection
    await _client.admin.command("ping")
    logger.info("MongoDB connected successfully.")


async def disconnect_db() -> None:
    global _client
    if _client:
        _client.close()
        _client = None
        logger.info("MongoDB disconnected.")


async def create_indexes() -> None:
    """Create all required indexes. Safe to call multiple times (idempotent)."""
    db = get_db()

    index_specs = {
        "workspaces": [
            {"keys": [("name", ASCENDING)], "unique": True},
        ],
        "users": [
            {"keys": [("email", ASCENDING)], "unique": True},
        ],
        "memberships": [
            {"keys": [("workspace_id", ASCENDING), ("user_id", ASCENDING)], "unique": True},
        ],
        "sites": [
            {"keys": [("workspace_id", ASCENDING), ("name", ASCENDING)]},
            {"keys": [("workspace_id", ASCENDING), ("status", ASCENDING)]},
        ],
        "solar_systems": [
            {"keys": [("site_id", ASCENDING), ("status", ASCENDING)]},
            {"keys": [("workspace_id", ASCENDING)]},
        ],
        "imports": [
            {"keys": [("workspace_id", ASCENDING), ("checksum", ASCENDING)]},
            {"keys": [("workspace_id", ASCENDING), ("status", ASCENDING)]},
            {"keys": [("system_id", ASCENDING), ("created_at", DESCENDING)]},
        ],
        "readings": [
            {"keys": [("system_id", ASCENDING), ("timestamp_utc", ASCENDING)], "unique": True},
            {"keys": [("workspace_id", ASCENDING), ("site_id", ASCENDING)]},
            {"keys": [("system_id", ASCENDING), ("timestamp_utc", ASCENDING), ("quality", ASCENDING)]},
        ],
        "analysis_runs": [
            {"keys": [("system_id", ASCENDING), ("created_at", DESCENDING)]},
            {"keys": [("workspace_id", ASCENDING), ("created_at", DESCENDING)]},
        ],
        "alerts": [
            {"keys": [("workspace_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)]},
            {"keys": [("system_id", ASCENDING), ("status", ASCENDING)]},
        ],
        "reports": [
            {"keys": [("workspace_id", ASCENDING), ("created_at", DESCENDING)]},
            {"keys": [("analysis_run_id", ASCENDING)]},
        ],
        "audit_logs": [
            {"keys": [("workspace_id", ASCENDING), ("created_at", DESCENDING)]},
            {"keys": [("actor_id", ASCENDING), ("created_at", DESCENDING)]},
        ],
    }

    for collection_name, indexes in index_specs.items():
        collection = db[collection_name]
        for spec in indexes:
            await collection.create_index(
                spec["keys"],
                unique=spec.get("unique", False),
                background=True,
            )
    logger.info("All MongoDB indexes created/verified.")
