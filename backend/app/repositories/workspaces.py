from datetime import datetime, timezone
from app.repositories.base import BaseRepository, to_str_id, to_object_id
from app.core.database import get_db


class WorkspacesRepository(BaseRepository):
    collection_name = "workspaces"

    async def create(self, name: str, timezone_default: str = "Asia/Kolkata") -> str:
        doc = {
            "name": name,
            "timezone_default": timezone_default,
            "settings": {},
            "created_at": datetime.now(timezone.utc),
        }
        return await self.insert_one(doc)

    async def find_by_id(self, workspace_id: str) -> dict | None:
        doc = await self.col.find_one({"_id": to_object_id(workspace_id)})
        return to_str_id(doc) if doc else None

    async def find_by_name(self, name: str) -> dict | None:
        doc = await self.col.find_one({"name": name})
        return to_str_id(doc) if doc else None


class MembershipsRepository(BaseRepository):
    collection_name = "memberships"

    async def create(self, workspace_id: str, user_id: str, role: str) -> str:
        doc = {
            "workspace_id": workspace_id,
            "user_id": user_id,
            "role": role,
            "workspace_id_ref": workspace_id,  # for workspace-scoped queries
            "created_at": datetime.now(timezone.utc),
        }
        return await self.insert_one(doc)

    async def find_membership(self, workspace_id: str, user_id: str) -> dict | None:
        doc = await self.col.find_one(
            {"workspace_id": workspace_id, "user_id": user_id}
        )
        return to_str_id(doc) if doc else None

    async def get_user_workspaces(self, user_id: str) -> list[dict]:
        cursor = self.col.find({"user_id": user_id})
        docs = await cursor.to_list(length=100)
        return [to_str_id(d) for d in docs]
