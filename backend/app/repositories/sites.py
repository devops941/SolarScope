from datetime import datetime, timezone
from app.repositories.base import BaseRepository, to_str_id, to_object_id
from app.core.database import get_db


class SitesRepository(BaseRepository):
    collection_name = "sites"

    async def create(self, workspace_id: str, data: dict) -> str:
        now = datetime.now(timezone.utc)
        doc = {
            "workspace_id": workspace_id,
            "created_at": now,
            "updated_at": now,
            **data,
        }
        return await self.insert_one(doc)

    async def list_for_workspace(
        self, workspace_id: str, status: str | None = None,
        skip: int = 0, limit: int = 100
    ) -> list[dict]:
        extra = {"status": status} if status else None
        return await self.find_many_scoped(workspace_id, extra, skip, limit, [("name", 1)])

    async def get(self, workspace_id: str, site_id: str) -> dict | None:
        return await self.find_one_scoped(workspace_id, site_id)

    async def update(self, workspace_id: str, site_id: str, data: dict) -> bool:
        data["updated_at"] = datetime.now(timezone.utc)
        return await self.update_one_scoped(workspace_id, site_id, data)

    async def count_systems(self, site_id: str) -> int:
        db = get_db()
        return await db["solar_systems"].count_documents(
            {"site_id": site_id, "status": "active"}
        )
