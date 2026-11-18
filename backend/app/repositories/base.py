from __future__ import annotations
from typing import Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection
from app.core.database import get_db


def to_str_id(doc: dict) -> dict:
    """Convert _id ObjectId → 'id' string in-place."""
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


def to_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        # Return a deliberately-unmatched ObjectId so queries return None/empty
        # rather than propagating a ValueError to callers
        from bson.objectid import ObjectId as _OID
        return _OID("000000000000000000000000")


class BaseRepository:
    """
    Base repository with mandatory workspace scoping.

    CRITICAL: Every query that returns tenant data MUST include
    workspace_id. Subclasses should not expose raw find() without scope.
    """

    collection_name: str = ""

    @property
    def col(self) -> AsyncIOMotorCollection:
        return get_db()[self.collection_name]

    # ── Scoped helpers ──────────────────────────────────────────────
    def _scope(self, workspace_id: str, extra: dict | None = None) -> dict:
        """Build a filter that always includes workspace scope."""
        q: dict[str, Any] = {"workspace_id": workspace_id}
        if extra:
            q.update(extra)
        return q

    # ── CRUD ────────────────────────────────────────────────────────
    async def find_one_scoped(self, workspace_id: str, doc_id: str) -> dict | None:
        doc = await self.col.find_one(
            {"_id": to_object_id(doc_id), "workspace_id": workspace_id}
        )
        return to_str_id(doc) if doc else None

    async def find_many_scoped(
        self,
        workspace_id: str,
        extra_filter: dict | None = None,
        skip: int = 0,
        limit: int = 50,
        sort: list[tuple] | None = None,
    ) -> list[dict]:
        q = self._scope(workspace_id, extra_filter)
        cursor = self.col.find(q)
        if sort:
            cursor = cursor.sort(sort)
        cursor = cursor.skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [to_str_id(d) for d in docs]

    async def count_scoped(self, workspace_id: str, extra_filter: dict | None = None) -> int:
        q = self._scope(workspace_id, extra_filter)
        return await self.col.count_documents(q)

    async def insert_one(self, doc: dict) -> str:
        result = await self.col.insert_one(doc)
        return str(result.inserted_id)

    async def update_one_scoped(
        self, workspace_id: str, doc_id: str, update: dict
    ) -> bool:
        result = await self.col.update_one(
            {"_id": to_object_id(doc_id), "workspace_id": workspace_id},
            {"$set": update},
        )
        return result.modified_count > 0

    async def delete_one_scoped(self, workspace_id: str, doc_id: str) -> bool:
        result = await self.col.delete_one(
            {"_id": to_object_id(doc_id), "workspace_id": workspace_id}
        )
        return result.deleted_count > 0
