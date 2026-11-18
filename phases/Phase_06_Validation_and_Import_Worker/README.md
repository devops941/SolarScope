# Phase 6 — Validation & Import Worker
**Duration:** 2 Weeks | **Difficulty:** HARD | **Weeks:** 7-8

---

## Objectives
The hardest phase. Build the full import pipeline: row validation, duplicate handling, background worker that writes normalized readings to MongoDB in batches, progress tracking, error CSV download, and rollback.

---

## Import Lifecycle States

```
uploaded → preview_ready → awaiting_confirmation → queued 
       → processing → completed / completed_with_warnings / failed
                    → rolled_back
```

---

## Detailed Tasks

| # | Task | File | Days |
|---|------|------|------|
| 1 | Build row-level validator with all 10 rules | `ingestion/validators.py` | 2 |
| 2 | Build deduplicator (checksum + row-level uniqueness) | `ingestion/deduplicator.py` | 1 |
| 3 | Build POST /imports/{id}/confirm endpoint | `routers/imports.py` | 0.5 |
| 4 | Build import background worker | `workers/import_worker.py` | 2 |
| 5 | Implement batch write (500 rows per batch) to readings | `repositories/readings.py` | 1 |
| 6 | Implement idempotency (re-run safe) | `workers/import_worker.py` | 0.5 |
| 7 | Build GET /imports/{id} (status + counts) | `routers/imports.py` | 0.5 |
| 8 | Build GET /imports/{id}/errors.csv download | `routers/imports.py` | 0.5 |
| 9 | Implement rollback: revert import-created readings | `services/imports.py` | 1 |
| 10 | Frontend: Import progress screen | `features/imports/ImportProgress.tsx` | 1 |
| 11 | Frontend: Import history with status badges | `features/imports/ImportHistory.tsx` | 0.5 |
| 12 | Frontend: Error CSV download button | `features/imports/ImportDetail.tsx` | 0.5 |
| 13 | Frontend: Rollback confirmation dialog | `features/imports/RollbackDialog.tsx` | 0.5 |
| 14 | Write import integration tests | `tests/test_imports.py` | 2 |

---

## Files to Create

```
backend/app/
├── ingestion/
│   ├── validators.py              ← all row validation rules
│   └── deduplicator.py            ← duplicate detection logic
├── workers/
│   ├── __init__.py
│   └── import_worker.py           ← background import processing
├── repositories/
│   └── readings.py                ← bulk insert, upsert, delete by import
├── services/
│   └── imports.py                 ← orchestrate import lifecycle

frontend/features/imports/
├── ImportProgress.tsx             ← live progress bar + counts
├── ImportHistory.tsx              ← table of all past imports
├── ImportDetail.tsx               ← single import detail + errors
└── RollbackDialog.tsx             ← confirm rollback action
```

---

## Validation Rules (All 10)

```python
# ingestion/validators.py

VALIDATION_RULES = {
    "MISSING_TIMESTAMP": "timestamp column missing or empty",
    "INVALID_TIMESTAMP": "timestamp cannot be parsed",
    "MISSING_TIMEZONE": "timestamp has no timezone offset",
    "NO_MEASUREMENT": "both power_kw and energy_kwh are absent",
    "NEGATIVE_POWER": "power_kw is negative (use meter config for reverse flow)",
    "IRRADIANCE_OUTLIER": "irradiance_w_m2 exceeds 1500 W/m² — physical limit",
    "TEMPERATURE_OUTLIER": "module_temp_c exceeds 100°C or below -40°C",
    "NON_NUMERIC": "numeric field contains non-numeric value",
    "DUPLICATE_TIMESTAMP": "same system + timestamp already exists (apply policy)",
    "FUTURE_TIMESTAMP": "timestamp is more than 1 hour in the future",
}

# Row result
{
  "row_number": 18,
  "status": "rejected",          # accepted | rejected | flagged | skipped
  "error_code": "NEGATIVE_POWER",
  "error_message": "power_kw value -5.2 is negative",
  "original_values": { ... }     # preserved for error CSV
}
```

---

## Duplicate Policies

| Policy | Behavior |
|--------|----------|
| `skip` | Keep old row, count incoming as skipped (safe default) |
| `replace` | Update matching row, record old value in audit |
| `reject` | Add to rejected rows CSV; block that row |
| `allow_multi` | Keep both with different source_import_id |

---

## Worker Logic

```python
# workers/import_worker.py
async def process_import(import_id: str):
    import_record = await imports_repo.get(import_id)
    
    # 1. Update status → processing
    await imports_repo.update_status(import_id, "processing")
    
    # 2. Read file from storage
    rows = parse_csv(import_record.file_path)
    
    # 3. Process in batches of 500
    batch_size = 500
    accepted, rejected, skipped = [], [], []
    
    for batch in chunked(rows, batch_size):
        for row in batch:
            result = validate_row(row)
            if result.status == "accepted":
                accepted.append(normalize_row(row, import_record.mapping))
            else:
                rejected.append(result)
        
        # Bulk upsert batch to readings collection
        await readings_repo.bulk_upsert(accepted, import_id, policy)
        
        # Update progress counts
        await imports_repo.update_counts(import_id, len(accepted), len(rejected))
    
    # 4. Save rejected rows CSV to storage
    if rejected:
        await save_error_csv(rejected, import_id)
    
    # 5. Update status → completed or completed_with_warnings
    final_status = "completed" if not rejected else "completed_with_warnings"
    await imports_repo.update_status(import_id, final_status)
    
    # 6. Invalidate dashboard/readings caches
    await cache.invalidate_for_system(import_record.system_id)
```

---

## Rejected Rows CSV Format

```csv
source_row_number,timestamp,power_kw,energy_kwh,irradiance_w_m2,ambient_temp_c,module_temp_c,import_status,error_code,error_message
18,2026-11-18T09:00:00+05:30,-5.2,,420,29.0,38.5,rejected,NEGATIVE_POWER,"power_kw value -5.2 is negative"
42,,4.2,1.05,420,29.0,38.5,rejected,MISSING_TIMESTAMP,"timestamp column is empty"
```

---

## Rollback Specification

```python
# Rollback deletes all readings where source_import_id == import_id
# Creates audit entry: actor, action="rollback", import_id, count_deleted
# Updates import status to "rolled_back"
# Does NOT affect readings from other imports, even if same timestamp
# After rollback, dashboard/analytics invalidated for affected system
```

---

## Exit Gate — All Must Pass

- [ ] Valid CSV: all rows accepted and written to readings
- [ ] Invalid row: exact row + field + error message in rejected CSV
- [ ] Same file uploaded twice: duplicate file warning (checksum match)
- [ ] Overlapping file: duplicate policy applied and counts correct
- [ ] Import status updates live as worker processes batches
- [ ] Error CSV downloadable with original values preserved
- [ ] Rollback removes only that import's readings
- [ ] Re-running same import is idempotent (no double-writes)
- [ ] 10,000-row CSV imports without timeout or memory error
- [ ] All validation rules tested (unit tests for each rule)
