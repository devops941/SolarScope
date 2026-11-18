"""
Standalone script to create/verify all MongoDB indexes.
Run: python -m scripts.create_indexes
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import connect_db, create_indexes, disconnect_db


async def main():
    print("Connecting to MongoDB...")
    await connect_db()
    print("Creating indexes...")
    await create_indexes()
    print("All indexes created successfully.")
    await disconnect_db()


if __name__ == "__main__":
    asyncio.run(main())
