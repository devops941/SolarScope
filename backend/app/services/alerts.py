"""
Alerts service — creates, deduplicates, and manages alert lifecycle.

Alert creation rules:
  - Only one open alert per (workspace, system, rule_code) at a time
  - New evidence for the same rule updates the existing open alert
  - Closed alerts (acknowledged/resolved) allow new alerts for the same rule
"""
import logging
from app.core.errors import NotFoundError, ForbiddenError
from app.repositories.alerts import AlertsRepository
from app.domain.enums import AlertStatus, AlertSeverity
from app.analytics.anomalies import TriggeredAnomaly

logger = logging.getLogger(__name__)

_alerts = AlertsRepository()


async def process_anomalies(
    workspace_id: str,
    system_id: str,
    site_id: str,
    analysis_run_id: str,
    anomalies: list[TriggeredAnomaly],
) -> list[str]:
    """
    For each triggered anomaly:
    - If an open alert for the same rule already exists → update evidence
    - Otherwise → create a new alert
    Returns list of alert IDs created or updated.
    """
    alert_ids: list[str] = []
    for anomaly in anomalies:
        existing = await _alerts.find_open(workspace_id, system_id, anomaly.rule_code)
        if existing:
            # Update evidence on the existing open alert
            await _alerts.col.update_one(
                {"_id": __oid(existing["id"])},
                {"$set": {
                    "evidence": anomaly.evidence,
                    "affected_intervals": anomaly.affected_intervals[:20],
                    "latest_analysis_run_id": analysis_run_id,
                }},
            )
            alert_ids.append(existing["id"])
        else:
            alert_id = await _alerts.create(workspace_id, {
                "system_id": system_id,
                "site_id": site_id,
                "analysis_run_id": analysis_run_id,
                "rule_code": anomaly.rule_code,
                "severity": anomaly.severity,
                "trigger_description": anomaly.trigger_description,
                "evidence": anomaly.evidence,
                "affected_intervals": anomaly.affected_intervals[:20],
                "notes": [],
            })
            alert_ids.append(alert_id)
            logger.info("Alert created: rule=%s system=%s id=%s", anomaly.rule_code, system_id, alert_id)

    return alert_ids


async def list_alerts(
    workspace_id: str,
    severity: str | None = None,
    status: str | None = None,
    system_id: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> dict:
    skip = (page - 1) * page_size
    items, total = await _alerts.list_for_workspace(
        workspace_id, severity=severity, status=status,
        system_id=system_id, skip=skip, limit=page_size,
    )
    return {
        "items": [_serialize(a) for a in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, -(-total // page_size)),
    }


async def get_alert(workspace_id: str, alert_id: str) -> dict:
    alert = await _alerts.get(workspace_id, alert_id)
    if not alert:
        raise NotFoundError("Alert")
    return _serialize(alert)


async def update_alert_status(
    workspace_id: str,
    alert_id: str,
    new_status: str,
    actor: dict,
    note: str | None = None,
) -> dict:
    alert = await _alerts.get(workspace_id, alert_id)
    if not alert:
        raise NotFoundError("Alert")

    # Validate transition
    current = alert.get("status", "open")
    valid_transitions = {
        "open": ["acknowledged", "resolved"],
        "acknowledged": ["resolved"],
        "resolved": [],
    }
    if new_status not in valid_transitions.get(current, []):
        from app.core.errors import ValidationError
        raise ValidationError(
            f"Cannot transition from '{current}' to '{new_status}'."
        )

    await _alerts.update_status(
        workspace_id, alert_id,
        AlertStatus(new_status),
        actor_id=actor.get("sub", ""),
        note=note,
    )
    return await get_alert(workspace_id, alert_id)


async def get_alert_counts(workspace_id: str) -> dict:
    return await _alerts.count_open(workspace_id)


def _serialize(a: dict) -> dict:
    created = a.get("created_at")
    return {
        "id": str(a.get("id", a.get("_id", ""))),
        "workspace_id": a.get("workspace_id", ""),
        "system_id": a.get("system_id", ""),
        "site_id": a.get("site_id", ""),
        "analysis_run_id": a.get("analysis_run_id", ""),
        "rule_code": a.get("rule_code", ""),
        "severity": a.get("severity", "info"),
        "status": a.get("status", "open"),
        "trigger_description": a.get("trigger_description", ""),
        "evidence": a.get("evidence", {}),
        "affected_intervals": a.get("affected_intervals", []),
        "notes": a.get("notes", []),
        "acknowledged_by": a.get("acknowledged_by"),
        "resolved_at": str(a.get("resolved_at")) if a.get("resolved_at") else None,
        "created_at": str(created) if created else None,
    }


def __oid(id_str: str):
    from bson import ObjectId
    try:
        return ObjectId(id_str)
    except Exception:
        return None
