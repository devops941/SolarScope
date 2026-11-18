from pydantic import BaseModel
from datetime import datetime
from app.schemas.common import MetricResultSchema, FilterParams


class KPIBlock(BaseModel):
    energy_kwh: MetricResultSchema | None = None
    specific_yield: MetricResultSchema | None = None
    performance_ratio: MetricResultSchema | None = None
    data_coverage: MetricResultSchema | None = None
    peak_power_kw: MetricResultSchema | None = None


class AlertSummary(BaseModel):
    open_count: int = 0
    critical_count: int = 0
    warning_count: int = 0


class PeriodMeta(BaseModel):
    start: datetime
    end: datetime
    timezone: str
    interval_minutes: int


class DashboardSummaryResponse(BaseModel):
    period: PeriodMeta
    kpis: KPIBlock
    alerts: AlertSummary
    filter_snapshot: FilterParams


class ChartPoint(BaseModel):
    timestamp_local: str
    generation_kw: float | None = None
    energy_kwh: float | None = None
    irradiance_w_m2: float | None = None
    ambient_temp_c: float | None = None
    module_temp_c: float | None = None


class DashboardSeriesResponse(BaseModel):
    series: list[ChartPoint]
    interval_minutes: int
    total_points: int
