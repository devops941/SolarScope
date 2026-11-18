"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface MetricResult {
  value: number | null;
  unit: string;
  method: string;
  formula_version: string;
  sample_count: number;
  coverage_pct: number;
  warnings: string[];
  is_estimated: boolean;
}

export interface AnalysisMetrics {
  energy_kwh?: MetricResult;
  specific_yield?: MetricResult;
  performance_ratio?: MetricResult;
  irradiation?: MetricResult;
  peak_power_kw?: MetricResult;
  avg_power_kw?: MetricResult;
  data_coverage?: MetricResult;
  avg_ambient_temp_c?: MetricResult;
  avg_module_temp_c?: MetricResult;
}

export interface AnalysisRun {
  id: string;
  system_id: string;
  site_id: string;
  workspace_id: string;
  filter_snapshot: Record<string, string>;
  metrics: AnalysisMetrics;
  formula_version: string;
  warnings: string[];
  sample_count: number;
  created_at: string;
}

export function useAnalysisRuns(systemId: string) {
  return useQuery<AnalysisRun[]>({
    queryKey: ["analytics", "runs", systemId],
    queryFn: async () => {
      const { data } = await apiClient.get("/analytics/runs", { params: { system_id: systemId } });
      return data;
    },
    enabled: !!systemId,
  });
}

export function useAnalysisRun(runId: string) {
  return useQuery<AnalysisRun>({
    queryKey: ["analytics", "runs", runId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/analytics/runs/${runId}`);
      return data;
    },
    enabled: !!runId,
  });
}

export function useCreateAnalysisRun() {
  const qc = useQueryClient();
  return useMutation<AnalysisRun, Error, {
    systemId: string;
    start: string;
    end: string;
    interval?: string;
    quality?: string;
  }>({
    mutationFn: async ({ systemId, start, end, interval = "15m", quality = "valid" }) => {
      const { data } = await apiClient.post("/analytics/runs", null, {
        params: { system_id: systemId, start, end, interval, quality },
      });
      return data;
    },
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ["analytics", "runs", run.system_id] });
    },
  });
}
