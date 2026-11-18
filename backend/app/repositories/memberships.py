from datetime import datetime, timezone
from app.repositories.base import BaseRepository, to_str_id, to_object_id
from app.domain.enums import Role


class MembershipsRepository(BaseRepository):
    collection_name = "memberships"

    async def create(self, workspace_id: str, user_id: str, role: Role) -> str:
        doc = {
            "workspace_id": workspace_id,
            "user_id": user_id,
            "role": role.value,
            "created_at": datetime.now(timezone.utc),
        }
        return await self.insert_one(doc)

    async def find(self, workspace_id: str, user_id: str) -> dict | None:
        doc = await self.col.find_one(
            {"workspace_id": workspace_id, "user_id": user_id}
        )
        return to_str_id(doc) if doc else None

    async def get_user_workspaces(self, user_id: str) -> list[dict]:
        """Return all workspace memberships for a user."""
        cursor = self.col.find({"user_id": user_id})
        docs = await cursor.to_list(length=50)
        return [to_str_id(d) for d in docs]

    async def update_role(self, workspace_id: str, user_id: str, role: Role) -> bool:
        result = await self.col.update_one(
            {"workspace_id": workspace_id, "user_id": user_id},
            {"$set": {"role": role.value, "updated_at": datetime.now(timezone.utc)}},
        )
        return result.modified_count > 0

    async def remove(self, workspace_id: str, user_id: str) -> bool:
        result = await self.col.delete_one(
            {"workspace_id": workspace_id, "user_id": user_id}
        )
        return result.deleted_count > 0

    async def list_members(self, workspace_id: str) -> list[dict]:
        cursor = self.col.find({"workspace_id": workspace_id})
        docs = await cursor.to_list(length=200)
        return [to_str_id(d) for d in docs]
