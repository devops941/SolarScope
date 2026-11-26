"""
Clear the SolarScope MongoDB database properly.
Deletes all documents across all application collections and rebuilds indexes.

Run: python -m scripts.clear_db
"""
import asyncio
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings
from app.core.database import connect_db, disconnect_db, get_db, create_indexes


async def clear_database():
    settings = get_settings()
    print("=" * 60)
    print(f"SolarScope Database Wipe & Reset Tool")
    print(f"Target DB: {settings.MONGODB_DATABASE}")
    print("=" * 60)

    print("\n[1/4] Connecting to MongoDB...")
    await connect_db()
    db = get_db()
    print(" Connected.")

    print("\n[2/4] Inspecting current collections and document counts...")
    collections = await db.list_collection_names()
    if not collections:
        print("  Database is already empty (no collections found).")
    else:
        for col_name in sorted(collections):
            count = await db[col_name].count_documents({})
            print(f"  • {col_name:20s}: {count:5d} documents")

    print("\n[3/4] Clearing all application collections...")
    target_collections = [
        "users",
        "workspaces",
        "memberships",
        "sites",
        "solar_systems",
        "imports",
        "readings",
        "analysis_runs",
        "alerts",
        "reports",
        "audit_logs",
    ]

    # Combine with any existing collections in DB (excluding system collections)
    all_to_clear = set(target_collections) | {c for c in collections if not c.startswith("system.")}

    for col_name in sorted(all_to_clear):
        res = await db[col_name].delete_many({})
        print(f"  ✓ Cleared '{col_name}' ({res.deleted_count} removed)")

    print("\n[4/4] Re-creating all required MongoDB indexes...")
    await create_indexes()
    print("  ✓ Indexes verified and built.")

    print("\n" + "=" * 60)
    print("Final Verification:")
    for col_name in sorted(all_to_clear):
        count = await db[col_name].count_documents({})
        print(f"  • {col_name:20s}: {count:5d} documents")
    print("=" * 60)
    print("Database properly cleared and ready for fresh ingestion.")

    await disconnect_db()


if __name__ == "__main__":
    asyncio.run(clear_database())
