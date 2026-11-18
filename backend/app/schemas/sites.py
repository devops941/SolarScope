from pydantic import BaseModel, Field
from datetime import datetime
from app.domain.enums import SiteStatus


class LocationSchema(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class SiteCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    timezone: str
    address: str | None = None
    location: LocationSchema | None = None


class SiteUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    timezone: str | None = None
    address: str | None = None
    location: LocationSchema | None = None
    status: SiteStatus | None = None


class SiteResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    timezone: str
    status: SiteStatus
    address: str | None = None
    location: LocationSchema | None = None
    system_count: int = 0
    created_at: datetime
    updated_at: datetime
