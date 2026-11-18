from datetime import datetime, timezone
from app.repositories.base import BaseRepository, to_str_id, to_object_id
from app.domain.enums import ImportStatus


class ImportsRepository(BaseRepository):
    collection_name = "imports"

    async def create(self, workspace_id: str, data: dict) -> str:
        now = datetime.now(timezone.utc)
        doc = {
            "workspace_id": workspace_id,
            "status": ImportStatus.UPLOADED.value,
            "counts": {"total": 0, "accepted": 0, "rejected": 0, "skipped": 0, "flagged": 0},
            "created_at": now,
            "updated_at": now,
            **data,
        }
        return await self.insert_one(doc)

    async def find_by_checksum(self, workspace_id: str, checksum: str) -> dict | None:
        doc = await self.col.find_one(
            {"workspace_id": workspace_id, "checksum": checksum}
        )
        return to_str_id(doc) if doc else None

    async def get(self, workspace_id: str, import_id: str) -> dict | None:
        return await self.find_one_scoped(workspace_id, import_id)

    async def update_status(self, import_id: str, status: ImportStatus) -> None:
        update: dict = {
            "status": status.value,
            "updated_at": datetime.now(timezone.utc),
        }
        if status in (ImportStatus.COMPLETED, ImportStatus.COMPLETED_WITH_WARNINGS, ImportStatus.FAILED):
            update["completed_at"] = datetime.now(timezone.utc)
        await self.col.update_one(
            {"_id": to_object_id(import_id)}, {"$set": update}
        )

    async def update_counts(self, import_id: str, counts: dict) -> None:
        await self.col.update_one(
            {"_id": to_object_id(import_id)},
            {"$set": {"counts": counts, "updated_at": datetime.now(timezone.utc)}},
        )

    async def update_error_file(self, import_id: str, error_file_path: str) -> None:
        await self.col.update_one(
            {"_id": to_object_id(import_id)},
            {"$set": {"error_file_path": error_file_path, "updated_at": datetime.now(timezone.utc)}},
        )

    async def update_mapping(self, import_id: str, mapping: list, duplicate_policy: str,
                             source_timezone: str, energy_mode: str) -> None:
        await self.col.update_one(
            {"_id": to_object_id(import_id)},
            {"$set": {
                "mapping": mapping,
                "duplicate_policy": duplicate_policy,
                "source_timezone": source_timezone,
                "energy_mode": energy_mode,
                "updated_at": datetime.now(timezone.utc),
            }},
        )

    async def list_for_workspace(
        self, workspace_id: str, skip: int = 0, limit: int = 50
    ) -> list[dict]:
        return await self.find_many_scoped(
            workspace_id, skip=skip, limit=limit, sort=[("created_at", -1)]
        )
