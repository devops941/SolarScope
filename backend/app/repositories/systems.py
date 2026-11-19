from datetime import datetime, timezone
from app.repositories.base import BaseRepository, to_str_id, to_object_id


class SystemsRepository(BaseRepository):
    collection_name = "solar_systems"

    async def create(self, workspace_id: str, site_id: str, data: dict) -> str:
        now = datetime.now(timezone.utc)
        doc = {
            "workspace_id": workspace_id,
            "site_id": site_id,
            "created_at": now,
            "updated_at": now,
            **data,
        }
        return await self.insert_one(doc)

    async def list_for_site(self, workspace_id: str, site_id: str) -> list[dict]:
        return await self.find_many_scoped(
            workspace_id, {"site_id": site_id}, limit=200, sort=[("name", 1)]
        )

    async def list_all(self, workspace_id: str, site_id: str | None = None) -> list[dict]:
        query = {"site_id": site_id} if site_id else {}
        return await self.find_many_scoped(
            workspace_id, query, limit=500, sort=[("name", 1)]
        )

    async def get(self, workspace_id: str, system_id: str) -> dict | None:
        return await self.find_one_scoped(workspace_id, system_id)

    async def get_by_id_unscoped(self, system_id: str) -> dict | None:
        """Used internally when workspace context already verified."""
        doc = await self.col.find_one({"_id": to_object_id(system_id)})
        return to_str_id(doc) if doc else None

    async def update(self, workspace_id: str, system_id: str, data: dict) -> bool:
        data["updated_at"] = datetime.now(timezone.utc)
        return await self.update_one_scoped(workspace_id, system_id, data)
