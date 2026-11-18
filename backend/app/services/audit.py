"""Audit log service — records every significant mutation for traceability."""
from datetime import datetime, timezone
from app.core.database import get_db
import logging

logger = logging.getLogger(__name__)


async def log_event(
    workspace_id: str,
    actor_id: str,
    actor_email: str,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    metadata: dict | None = None,
) -> None:
    """
    Persist an audit event. Never raises — failures are logged, not propagated.
    metadata must NOT contain passwords, tokens or secrets.
    """
    doc = {
        "workspace_id": workspace_id,
        "actor_id": actor_id,
        "actor_email": actor_email,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "safe_metadata": metadata or {},
        "created_at": datetime.now(timezone.utc),
    }
    try:
        await get_db()["audit_logs"].insert_one(doc)
    except Exception:
        logger.exception("Audit log write failed for action=%s actor=%s", action, actor_id)
