from __future__ import annotations
from typing import Any, Generic, TypeVar
from pydantic import BaseModel, Field
from datetime import datetime
from app.domain.enums import Interval

T = TypeVar("T")


# ── Pagination ──────────────────────────────────────────────────────
class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)


# ── Shared filter DTO (single source of truth across all modules) ───
class FilterParams(BaseModel):
    site_id: str
    system_id: str
    start: datetime
    end: datetime
    interval: Interval = Interval.MIN_15
    quality: str = "valid"  # all | valid | flagged

    model_config = {"use_enum_values": True}


# ── Standard error body ─────────────────────────────────────────────
class ErrorDetail(BaseModel):
    field: str | None = None
    row: int | None = None
    reason: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] = []


class ErrorResponse(BaseModel):
    error: ErrorBody


# ── Metric result ────────────────────────────────────────────────────
class MetricResultSchema(BaseModel):
    value: float | None
    unit: str
    method: str
    formula_version: str
    sample_count: int = 0
    coverage_pct: float = 0.0
    warnings: list[str] = []
    is_estimated: bool = False


# ── ObjectId serialization helper ───────────────────────────────────
def oid(doc: dict, key: str = "_id") -> str:
    """Safely convert MongoDB ObjectId to string."""
    v = doc.get(key)
    return str(v) if v else ""
