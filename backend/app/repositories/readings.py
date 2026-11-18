from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorCollection
from app.repositories.base import BaseRepository, to_str_id, to_object_id
from app.core.database import get_db
from pymongo import ASCENDING, DESCENDING, UpdateOne


class ReadingsRepository(BaseRepository):
    collection_name = "readings"

    async def bulk_upsert(self, readings: list[dict], import_id: str, policy: str = "replace") -> dict:
        """
        Upsert readings in bulk.
        policy="replace": $set — always overwrite existing (default for new imports)
        policy="skip":    $setOnInsert — only write if no existing doc for that timestamp
        """
        if not readings:
            return {"inserted": 0, "updated": 0}

        ops = []
        for r in readings:
            doc = {**r, "source_import_id": import_id}
            filter_ = {"system_id": r["system_id"], "timestamp_utc": r["timestamp_utc"]}
            if policy == "skip":
                # Only insert if the key doesn't exist — never overwrite
                update = {"$setOnInsert": doc}
            else:
                # Always replace (replace policy)
                update = {"$set": doc}
            ops.append(UpdateOne(filter_, update, upsert=True))

        result = await self.col.bulk_write(ops, ordered=False)
        return {
            "inserted": result.upserted_count,
            "updated": result.modified_count,
        }

    async def query(
        self,
        workspace_id: str,
        system_id: str,
        start_utc: datetime,
        end_utc: datetime,
        quality_filter: str = "all",
        import_id: str | None = None,
        skip: int = 0,
        limit: int = 50,
        sort_order: int = ASCENDING,
    ) -> tuple[list[dict], int]:
        q: dict = {
            "workspace_id": workspace_id,
            "system_id": system_id,
            "timestamp_utc": {"$gte": start_utc, "$lte": end_utc},
        }
        if quality_filter == "valid":
            q["quality"] = {"$not": {"$elemMatch": {"$in": ["flagged_irradiance", "flagged_temp", "flagged_power", "missing"]}}}
        elif quality_filter == "flagged":
            q["quality"] = {"$elemMatch": {"$in": ["flagged_irradiance", "flagged_temp", "flagged_power"]}}
        elif quality_filter == "missing":
            q["quality"] = {"$elemMatch": {"$eq": "missing"}}
        if import_id:
            q["source_import_id"] = import_id

        total = await self.col.count_documents(q)
        cursor = self.col.find(q).sort("timestamp_utc", sort_order).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [to_str_id(d) for d in docs], total

    async def delete_by_import(self, import_id: str) -> int:
        result = await self.col.delete_many({"source_import_id": import_id})
        return result.deleted_count

    async def count_in_range(
        self, workspace_id: str, system_id: str, start_utc: datetime, end_utc: datetime
    ) -> int:
        return await self.col.count_documents({
            "workspace_id": workspace_id,
            "system_id": system_id,
            "timestamp_utc": {"$gte": start_utc, "$lte": end_utc},
        })

    async def fetch_for_analytics(
        self,
        workspace_id: str,
        system_id: str,
        start_utc: datetime,
        end_utc: datetime,
        quality: str = "valid",
    ) -> list[dict]:
        """Fetch all readings for analytics (no pagination)."""
        docs, _ = await self.query(
            workspace_id, system_id, start_utc, end_utc,
            quality_filter=quality, limit=100_000
        )
        return docs
