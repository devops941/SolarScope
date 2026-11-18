from pydantic import BaseModel
from datetime import datetime
from app.domain.enums import AlertSeverity, AlertStatus, AlertRuleCode


class AlertResponse(BaseModel):
    id: str
    workspace_id: str
    system_id: str
    analysis_run_id: str | None
    rule_code: AlertRuleCode
    severity: AlertSeverity
    status: AlertStatus
    triggered_at: datetime
    evidence: dict
    notes: list[str] = []
    acknowledged_by: str | None = None
    resolved_at: datetime | None = None
    site_name: str | None = None
    system_name: str | None = None


class AlertUpdate(BaseModel):
    status: AlertStatus | None = None
    note: str | None = None


class AlertsFilter(BaseModel):
    severity: AlertSeverity | None = None
    status: AlertStatus | None = None
    rule_code: AlertRuleCode | None = None
    system_id: str | None = None
    page: int = 1
    page_size: int = 50
