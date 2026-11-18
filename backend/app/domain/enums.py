from enum import Enum


class Role(str, Enum):
    PLATFORM_ADMIN = "platform_admin"
    WORKSPACE_ADMIN = "workspace_admin"
    SITE_MANAGER = "site_manager"
    ANALYST = "analyst"
    VIEWER = "viewer"


class ImportStatus(str, Enum):
    UPLOADED = "uploaded"
    PREVIEW_READY = "preview_ready"
    VALIDATION_FAILED = "validation_failed"
    AWAITING_CONFIRMATION = "awaiting_confirmation"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    COMPLETED_WITH_WARNINGS = "completed_with_warnings"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


class QualityFlag(str, Enum):
    VALID = "valid"
    FLAGGED_IRRADIANCE = "flagged_irradiance"
    FLAGGED_TEMP = "flagged_temp"
    FLAGGED_POWER = "flagged_power"
    INTERPOLATED = "interpolated"
    MISSING = "missing"
    DUPLICATE_SKIPPED = "duplicate_skipped"
    DUPLICATE_REPLACED = "duplicate_replaced"


class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertStatus(str, Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class AlertRuleCode(str, Enum):
    OUTPUT_DROP = "OUTPUT_DROP"
    DAYLIGHT_FLATLINE = "DAYLIGHT_FLATLINE"
    HIGH_MODULE_TEMP = "HIGH_MODULE_TEMP"
    DATA_GAP = "DATA_GAP"
    IRRADIANCE_MISMATCH = "IRRADIANCE_MISMATCH"
    SENSOR_OUTLIER = "SENSOR_OUTLIER"


class DuplicatePolicy(str, Enum):
    SKIP = "skip"
    REPLACE = "replace"
    REJECT = "reject"


class ReportFormat(str, Enum):
    PDF = "pdf"
    CSV = "csv"
    METRICS_CSV = "metrics_csv"
    READINGS_CSV = "readings_csv"


class ReportStatus(str, Enum):
    QUEUED = "queued"
    GENERATING = "generating"
    READY = "ready"
    FAILED = "failed"


class SiteStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class SystemStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class Interval(str, Enum):
    MIN_5 = "5m"
    MIN_15 = "15m"
    MIN_30 = "30m"
    HOUR_1 = "1h"
    DAY_1 = "1d"
