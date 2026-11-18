from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from app.domain.enums import (
    Role, ImportStatus, QualityFlag, AlertSeverity,
    AlertStatus, AlertRuleCode, DuplicatePolicy,
    ReportFormat, ReportStatus, SiteStatus, SystemStatus,
)


@dataclass
class User:
    id: str
    email: str
    name: str
    password_hash: str
    status: str = "active"
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Workspace:
    id: str
    name: str
    timezone_default: str = "Asia/Kolkata"
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Membership:
    id: str
    workspace_id: str
    user_id: str
    role: Role = Role.ANALYST


@dataclass
class Site:
    id: str
    workspace_id: str
    name: str
    timezone: str
    status: SiteStatus = SiteStatus.ACTIVE
    address: str | None = None
    location: dict | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class SolarSystem:
    id: str
    site_id: str
    workspace_id: str
    name: str
    dc_capacity_kwp: float
    ac_capacity_kw: float
    panel_count: int = 0
    panel_rating_w: float = 0.0
    tilt_degrees: float = 0.0
    azimuth_degrees: float = 180.0
    temp_coefficient_per_c: float | None = None
    inverter_make: str | None = None
    commissioning_date: str | None = None
    status: SystemStatus = SystemStatus.ACTIVE
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class MetricResult:
    value: float | None
    unit: str
    method: str
    formula_version: str
    sample_count: int = 0
    coverage_pct: float = 0.0
    warnings: list[str] = field(default_factory=list)
    is_estimated: bool = False
