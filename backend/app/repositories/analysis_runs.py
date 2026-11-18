from datetime import datetime, timezone
from app.repositories.base import BaseRepository, to_str_id, to_object_id
from pymongo import DESCENDING


class AnalysisRunsRepository(BaseRepository):
    collection_name = "analysis_runs"

    async def create(self, workspace_id: str, data: dict) -> str:
        doc = {
            "workspace_id": workspace_id,
            "created_at": datetime.now(timezone.utc),
            **data,
        }
        return await self.insert_one(doc)

    async def get(self, workspace_id: str, run_id: str) -> dict | None:
        return await self.find_one_scoped(workspace_id, run_id)

    async def list_for_system(
        self, workspace_id: str, system_id: str, limit: int = 20
    ) -> list[dict]:
        return await self.find_many_scoped(
            workspace_id,
            extra_filter={"system_id": system_id},
            limit=limit,
            sort=[("created_at", DESCENDING)],
        )
