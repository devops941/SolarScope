from datetime import datetime, timezone
from app.repositories.base import BaseRepository, to_str_id, to_object_id
from app.domain.enums import ReportStatus
from pymongo import DESCENDING


class ReportsRepository(BaseRepository):
    collection_name = "reports"

    async def create(self, workspace_id: str, data: dict) -> str:
        doc = {
            "workspace_id": workspace_id,
            "status": ReportStatus.QUEUED.value,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            **data,
        }
        return await self.insert_one(doc)

    async def get(self, workspace_id: str, report_id: str) -> dict | None:
        return await self.find_one_scoped(workspace_id, report_id)

    async def update_status(
        self,
        report_id: str,
        status: ReportStatus,
        file_path: str | None = None,
        file_size_bytes: int | None = None,
        error_message: str | None = None,
    ) -> None:
        update: dict = {
            "status": status.value,
            "updated_at": datetime.now(timezone.utc),
        }
        if file_path:
            update["file_path"] = file_path
        if file_size_bytes is not None:
            update["file_size_bytes"] = file_size_bytes
        if status == ReportStatus.READY:
            update["generated_at"] = datetime.now(timezone.utc)
        if error_message:
            update["error_message"] = error_message

        await self.col.update_one(
            {"_id": to_object_id(report_id)},
            {"$set": update},
        )

    async def list_for_workspace(
        self, workspace_id: str, skip: int = 0, limit: int = 50
    ) -> list[dict]:
        return await self.find_many_scoped(
            workspace_id, skip=skip, limit=limit,
            sort=[("created_at", DESCENDING)],
        )
