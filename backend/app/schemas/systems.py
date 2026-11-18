from pydantic import BaseModel, Field, model_validator
from datetime import datetime
from app.domain.enums import SystemStatus


class SystemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    dc_capacity_kwp: float = Field(gt=0)
    ac_capacity_kw: float = Field(gt=0)
    panel_count: int = Field(default=0, ge=0)
    panel_rating_w: float = Field(default=0.0, ge=0)
    tilt_degrees: float = Field(default=0.0, ge=0, le=90)
    azimuth_degrees: float = Field(default=180.0, ge=0, le=360)
    temp_coefficient_per_c: float | None = Field(default=None, ge=-0.01, le=0)
    inverter_make: str | None = None
    commissioning_date: str | None = None

    @model_validator(mode="after")
    def validate_capacity_ratio(self) -> "SystemCreate":
        if self.ac_capacity_kw > self.dc_capacity_kwp * 1.25:
            raise ValueError("AC capacity cannot exceed DC capacity × 1.25 (clipping ratio limit)")
        return self


class SystemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    dc_capacity_kwp: float | None = Field(default=None, gt=0)
    ac_capacity_kw: float | None = Field(default=None, gt=0)
    panel_count: int | None = Field(default=None, ge=0)
    panel_rating_w: float | None = Field(default=None, ge=0)
    tilt_degrees: float | None = Field(default=None, ge=0, le=90)
    azimuth_degrees: float | None = Field(default=None, ge=0, le=360)
    temp_coefficient_per_c: float | None = None
    inverter_make: str | None = None
    status: SystemStatus | None = None


class SystemResponse(BaseModel):
    id: str
    site_id: str
    workspace_id: str
    name: str
    dc_capacity_kwp: float
    ac_capacity_kw: float
    panel_count: int
    panel_rating_w: float
    tilt_degrees: float
    azimuth_degrees: float
    temp_coefficient_per_c: float | None
    inverter_make: str | None
    commissioning_date: str | None
    status: SystemStatus
    created_at: datetime
