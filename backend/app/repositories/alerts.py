from datetime import datetime, timezone
from app.repositories.base import BaseRepository, to_str_id, to_object_id
from app.domain.enums import AlertStatus
from pymongo import DESCENDING


class AlertsRepository(BaseRepository):
    collection_name = "alerts"

    async def create(self, workspace_id: str, data: dict) -> str:
        doc = {
            "workspace_id": workspace_id,
            "status": AlertStatus.OPEN.value,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            **data,
        }
        return await self.insert_one(doc)

    async def get(self, workspace_id: str, alert_id: str) -> dict | None:
        return await self.find_one_scoped(workspace_id, alert_id)

    async def find_open(self, workspace_id: str, system_id: str, rule_code: str) -> dict | None:
        """Find an existing open alert for this system + rule (for deduplication)."""
        doc = await self.col.find_one({
            "workspace_id": workspace_id,
            "system_id": system_id,
            "rule_code": rule_code,
            "status": AlertStatus.OPEN.value,
        })
        return to_str_id(doc) if doc else None

    async def update_status(
        self, workspace_id: str, alert_id: str,
        status: AlertStatus, actor_id: str = "", note: str | None = None,
    ) -> bool:
        update: dict = {
            "status": status.value,
            "updated_at": datetime.now(timezone.utc),
        }
        if status == AlertStatus.ACKNOWLEDGED:
            update["acknowledged_by"] = actor_id
            update["acknowledged_at"] = datetime.now(timezone.utc)
        if status == AlertStatus.RESOLVED:
            update["resolved_at"] = datetime.now(timezone.utc)
            update["resolved_by"] = actor_id
        if note:
            update["last_note"] = note

        result = await self.col.update_one(
            {"_id": to_object_id(alert_id), "workspace_id": workspace_id},
            {"$set": update, "$push": {"notes": note} if note else {}},
        )
        return result.modified_count > 0

    async def list_for_workspace(
        self,
        workspace_id: str,
        severity: str | None = None,
        status: str | None = None,
        system_id: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[dict], int]:
        extra: dict = {}
        if severity:
            extra["severity"] = severity
        if status:
            extra["status"] = status
        if system_id:
            extra["system_id"] = system_id

        total = await self.count_scoped(workspace_id, extra or None)
        items = await self.find_many_scoped(
            workspace_id, extra or None, skip=skip, limit=limit,
            sort=[("created_at", DESCENDING)],
        )
        return items, total

    async def count_open(self, workspace_id: str) -> dict:
        """Return counts by severity for open alerts."""
        pipeline = [
            {"$match": {"workspace_id": workspace_id, "status": AlertStatus.OPEN.value}},
            {"$group": {"_id": "$severity", "count": {"$sum": 1}}},
        ]
        result = await self.col.aggregate(pipeline).to_list(10)
        counts = {"total": 0, "critical": 0, "warning": 0, "info": 0}
        for item in result:
            sev = item["_id"]
            cnt = item["count"]
            counts[sev] = cnt
            counts["total"] += cnt
        return counts
