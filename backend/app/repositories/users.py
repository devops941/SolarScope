from datetime import datetime, timezone
from app.repositories.base import BaseRepository, to_str_id
from app.core.database import get_db


class UsersRepository(BaseRepository):
    collection_name = "users"

    async def find_by_email(self, email: str) -> dict | None:
        doc = await self.col.find_one({"email": email.lower().strip()})
        return to_str_id(doc) if doc else None

    async def create(self, email: str, name: str, password_hash: str) -> str:
        doc = {
            "email": email.lower().strip(),
            "name": name,
            "password_hash": password_hash,
            "status": "active",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        return await self.insert_one(doc)

    async def find_by_id(self, user_id: str) -> dict | None:
        from app.repositories.base import to_object_id
        doc = await self.col.find_one({"_id": to_object_id(user_id)})
        return to_str_id(doc) if doc else None

    async def update_last_login(self, user_id: str) -> None:
        from app.repositories.base import to_object_id
        await self.col.update_one(
            {"_id": to_object_id(user_id)},
            {"$set": {"last_login_at": datetime.now(timezone.utc)}},
        )

    async def update_password_hash(self, user_id: str, password_hash: str) -> None:
        from app.repositories.base import to_object_id
        await self.col.update_one(
            {"_id": to_object_id(user_id)},
            {"$set": {"password_hash": password_hash, "updated_at": datetime.now(timezone.utc)}},
        )
