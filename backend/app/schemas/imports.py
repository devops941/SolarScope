from pydantic import BaseModel, Field
from datetime import datetime
from app.domain.enums import ImportStatus, DuplicatePolicy


class ColumnMapping(BaseModel):
    source_column: str
    canonical_column: str
    unit_override: str | None = None


class ImportPreviewRequest(BaseModel):
    site_id: str
    system_id: str
    source_timezone: str = "Asia/Kolkata"
    energy_mode: str = "interval"  # interval | cumulative
    interval_minutes: int = 15


class PreviewRow(BaseModel):
    row_number: int
    timestamp: str | None
    power_kw: float | None
    energy_kwh: float | None
    irradiance_w_m2: float | None
    ambient_temp_c: float | None
    module_temp_c: float | None
    status: str  # accepted | rejected | flagged
    error_code: str | None = None
    error_message: str | None = None


class ImportPreviewResponse(BaseModel):
    import_id: str
    filename: str
    checksum: str
    total_rows: int
    sample_rows: list[PreviewRow]
    detected_columns: dict[str, str]
    suggested_mapping: list[ColumnMapping]
    status: ImportStatus


class ImportConfirmRequest(BaseModel):
    duplicate_policy: DuplicatePolicy = DuplicatePolicy.SKIP
    column_mapping: list[ColumnMapping] = []
    source_timezone: str = "Asia/Kolkata"
    energy_mode: str = "interval"
    interval_minutes: int = 15


class ImportCounts(BaseModel):
    total: int = 0
    accepted: int = 0
    rejected: int = 0
    skipped: int = 0
    flagged: int = 0


class ImportResponse(BaseModel):
    id: str
    filename: str
    checksum: str
    status: ImportStatus
    counts: ImportCounts
    site_id: str
    system_id: str
    actor: str
    created_at: datetime
    completed_at: datetime | None = None
    error_file_available: bool = False
