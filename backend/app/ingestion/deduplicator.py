"""
Deduplicator — detects duplicate readings before writing to MongoDB.

Strategies:
  - File-level: SHA-256 checksum check (already in imports service)
  - Row-level: (system_id, timestamp_utc) uniqueness per duplicate policy
"""
from __future__ import annotations
from datetime import datetime


class InMemoryDupeTracker:
    """
    Tracks (system_id, timestamp_utc) pairs seen within the CURRENT import batch.
    Used to detect intra-file duplicates before hitting the database.
    """

    def __init__(self):
        self._seen: set[tuple[str, datetime]] = set()

    def is_duplicate(self, system_id: str, timestamp_utc: datetime) -> bool:
        key = (system_id, timestamp_utc)
        return key in self._seen

    def mark_seen(self, system_id: str, timestamp_utc: datetime) -> None:
        self._seen.add((system_id, timestamp_utc))

    def __len__(self) -> int:
        return len(self._seen)


def apply_duplicate_policy(
    policy: str,
    is_intra_file_dup: bool,
    is_db_dup: bool,
) -> str:
    """
    Given duplicate state and policy, return the action for this row.
    Returns: 'write' | 'skip' | 'reject'
    """
    if not is_intra_file_dup and not is_db_dup:
        return "write"

    if policy == "skip":
        return "skip"
    elif policy == "replace":
        return "write"   # upsert replaces the existing document
    elif policy == "reject":
        return "reject"
    else:
        return "write"   # allow_multi: keep both (different source_import_id)
