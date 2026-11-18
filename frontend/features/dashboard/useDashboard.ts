"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { MetricResult } from "@/features/analytics/useAnalytics";

export interface DashboardKPIs {
  energy_kwh: MetricResult;
  specific_yield: MetricResult;
  performance_ratio: MetricResult;
  data_coverage: MetricResult;
  peak_power_kw: MetricResult;
}

export interface DashboardSummary {
  period: {
    start: string;
    end: string;
    interval: string;
    quality: string;
    system_id: string;
    site_id: string;
  };
  kpis: DashboardKPIs;
  temperatures: {
    avg_ambient_temp_c: MetricResult;
    avg_module_temp_c: MetricResult;
  };
  alerts: { total: number; critical: number; warning: number; info: number };
  formula_version: string;
  sample_count: number;
}

export interface ChartPoint {
  timestamp_utc: string;
  generation_kw?: number;
  energy_kwh?: number;
  irradiance_w_m2?: number;
  ambient_temp_c?: number;
  module_temp_c?: number;
}

export interface DashboardSeries {
  series: ChartPoint[];
  total_points: number;
  interval: string;
  system_id: string;
}

export interface DashboardFilter {
  systemId: string;
  siteId: string;
  start: string;
  end: string;
  interval?: string;
  quality?: string;
}

export function useDashboardSummary(filter: DashboardFilter | null) {
  return useQuery<DashboardSummary>({
    queryKey: ["dashboard", "summary", filter],
    queryFn: async () => {
      if (!filter) throw new Error("No filter");
      const { data } = await apiClient.get("/dashboard/summary", {
        params: {
          system_id: filter.systemId,
          site_id: filter.siteId,
          start: filter.start,
          end: filter.end,
          interval: filter.interval ?? "15m",
          quality: filter.quality ?? "valid",
        },
      });
      return data;
    },
    enabled: !!(filter?.systemId && filter?.siteId),
    staleTime: 60_000,
  });
}

export function useDashboardSeries(filter: DashboardFilter | null) {
  return useQuery<DashboardSeries>({
    queryKey: ["dashboard", "series", filter],
    queryFn: async () => {
      if (!filter) throw new Error("No filter");
      const { data } = await apiClient.get("/dashboard/series", {
        params: {
          system_id: filter.systemId,
          site_id: filter.siteId,
          start: filter.start,
          end: filter.end,
          interval: filter.interval ?? "15m",
        },
      });
      return data;
    },
    enabled: !!(filter?.systemId && filter?.siteId),
    staleTime: 60_000,
  });
}
