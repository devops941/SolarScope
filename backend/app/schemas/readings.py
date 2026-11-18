from pydantic import BaseModel, Field
from datetime import datetime
from app.domain.enums import QualityFlag


class ReadingResponse(BaseModel):
    id: str
    system_id: str
    site_id: str
    workspace_id: str
    timestamp_utc: datetime
    timestamp_local: str
    power_kw: float | None
    energy_kwh: float | None
    irradiance_w_m2: float | None
    ambient_temp_c: float | None
    module_temp_c: float | None
    voltage_v: float | None
    current_a: float | None
    quality: list[QualityFlag]
    source_import_id: str


class ReadingsFilter(BaseModel):
    site_id: str
    system_id: str
    start: datetime
    end: datetime
    quality: str = "all"  # all | valid | flagged | missing
    import_id: str | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)
    sort_by: str = "timestamp_utc"
    sort_order: str = "asc"


class ReadingsListResponse(BaseModel):
    items: list[ReadingResponse]
    total: int
    page: int
    page_size: int
    coverage_pct: float
    missing_intervals: int


class ManualReadingCreate(BaseModel):
    system_id: str
    timestamp_local: str
    source_timezone: str = "Asia/Kolkata"
    power_kw: float | None = Field(default=None, ge=0)
    energy_kwh: float | None = Field(default=None, ge=0)
    irradiance_w_m2: float | None = Field(default=None, ge=0)
    ambient_temp_c: float | None = None
    module_temp_c: float | None = None
    notes: str | None = None
