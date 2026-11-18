from pydantic import BaseModel
from datetime import datetime
from app.domain.enums import ReportFormat, ReportStatus


class ReportCreate(BaseModel):
    analysis_run_id: str
    format: ReportFormat = ReportFormat.PDF
    title: str | None = None


class ReportResponse(BaseModel):
    id: str
    workspace_id: str
    analysis_run_id: str
    format: ReportFormat
    status: ReportStatus
    title: str | None
    storage_key: str | None = None
    file_size_bytes: int | None = None
    generated_at: datetime | None = None
    created_at: datetime
    error_message: str | None = None
