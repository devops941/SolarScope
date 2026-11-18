from pydantic import BaseModel
from datetime import datetime
from app.schemas.common import MetricResultSchema, FilterParams


class AnalysisRunCreate(BaseModel):
    system_id: str
    start: datetime
    end: datetime
    interval: str = "15m"
    quality: str = "valid"
    baseline_period_start: datetime | None = None
    baseline_period_end: datetime | None = None


class AnalysisMetrics(BaseModel):
    energy_kwh: MetricResultSchema | None = None
    specific_yield: MetricResultSchema | None = None
    performance_ratio: MetricResultSchema | None = None
    irradiation: MetricResultSchema | None = None
    peak_power_kw: MetricResultSchema | None = None
    data_coverage: MetricResultSchema | None = None
    avg_ambient_temp_c: MetricResultSchema | None = None
    avg_module_temp_c: MetricResultSchema | None = None
    generation_irradiance_correlation: MetricResultSchema | None = None


class AnalysisRunResponse(BaseModel):
    id: str
    system_id: str
    workspace_id: str
    filter_snapshot: FilterParams
    metrics: AnalysisMetrics
    formula_version: str
    warnings: list[str] = []
    created_at: datetime


class CorrelationResult(BaseModel):
    pearson_r: float
    spearman_r: float
    sample_count: int
    interpretation: str  # strong | moderate | weak
    caveat: str
