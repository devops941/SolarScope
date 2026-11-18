/* ─── Auth ──────────────────────────────────────────────────────────── */
export type Role = "platform_admin" | "workspace_admin" | "site_manager" | "analyst" | "viewer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Workspace {
  id: string;
  name: string;
  timezone: string;
}

/* ─── Sites & Systems ───────────────────────────────────────────────── */
export interface Site {
  id: string;
  name: string;
  timezone: string;
  location?: { lat: number; lng: number };
  address?: string;
  status: "active" | "inactive" | "archived";
  systemCount: number;
  createdAt: string;
}

export interface SolarSystem {
  id: string;
  siteId: string;
  name: string;
  dcCapacityKwp: number;
  acCapacityKw: number;
  panelCount: number;
  tiltDegrees: number;
  azimuthDegrees: number;
  tempCoefficient?: number;
  status: "active" | "inactive";
  commissioningDate?: string;
}

/* ─── Imports ───────────────────────────────────────────────────────── */
export type ImportStatus =
  | "uploaded"
  | "preview_ready"
  | "validation_failed"
  | "awaiting_confirmation"
  | "queued"
  | "processing"
  | "completed"
  | "completed_with_warnings"
  | "failed"
  | "rolled_back";

export interface Import {
  id: string;
  filename: string;
  status: ImportStatus;
  rowsAccepted: number;
  rowsRejected: number;
  rowsSkipped: number;
  createdAt: string;
  completedAt?: string;
  actor: string;
}

/* ─── Readings ──────────────────────────────────────────────────────── */
export type QualityFlag = "valid" | "flagged" | "missing" | "interpolated";

export interface Reading {
  id: string;
  timestampLocal: string;
  timestampUtc: string;
  powerKw?: number;
  energyKwh?: number;
  irradianceWm2?: number;
  ambientTempC?: number;
  moduleTempC?: number;
  quality: QualityFlag;
  sourceImportId: string;
}

/* ─── Analytics ─────────────────────────────────────────────────────── */
export interface MetricResult {
  value: number | null;
  unit: string;
  method: string;
  formulaVersion: string;
  sampleCount: number;
  coveragePct: number;
  warnings: string[];
  isEstimated?: boolean;
}

export interface AnalysisRun {
  id: string;
  systemId: string;
  filterSnapshot: FilterParams;
  metrics: Record<string, MetricResult>;
  createdAt: string;
  formulaVersion: string;
}

/* ─── Alerts ────────────────────────────────────────────────────────── */
export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "open" | "acknowledged" | "resolved";

export interface Alert {
  id: string;
  ruleCode: string;
  severity: AlertSeverity;
  status: AlertStatus;
  triggeredAt: string;
  evidence: Record<string, unknown>;
  systemId: string;
  siteName?: string;
  systemName?: string;
}

/* ─── Filter ────────────────────────────────────────────────────────── */
export interface FilterParams {
  siteId: string;
  systemId: string;
  start: string;
  end: string;
  interval: "5m" | "15m" | "30m" | "1h" | "1d";
  quality: "all" | "valid" | "flagged";
}

/* ─── Dashboard ─────────────────────────────────────────────────────── */
export interface DashboardKPIs {
  energyKwh: MetricResult;
  specificYield: MetricResult;
  performanceRatio: MetricResult;
  dataCoverage: MetricResult;
}

export interface ChartSeries {
  timestamps: string[];
  generationKw: number[];
  irradianceWm2: number[];
  ambientTempC: number[];
  moduleTempC: number[];
}
