"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Reading {
  id: string;
  system_id: string;
  site_id: string;
  workspace_id: string;
  timestamp_utc: string;
  power_kw?: number;
  interval_energy_kwh?: number;
  irradiance_w_m2?: number;
  ambient_temp_c?: number;
  module_temp_c?: number;
  voltage_v?: number;
  current_a?: number;
  inverter_status?: string;
  quality: string[];
  source_import_id: string;
  source_filename?: string;
}

export interface ReadingsPage {
  items: Reading[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  coverage_pct: number;
  missing_intervals: number;
}

export interface ReadingsFilter {
  systemId: string;
  siteId: string;
  start: string;
  end: string;
  quality?: string;
  importId?: string;
  interval?: string;
  page?: number;
  pageSize?: number;
  sortOrder?: "asc" | "desc";
}

export function useReadings(filter: ReadingsFilter | null) {
  return useQuery<ReadingsPage>({
    queryKey: ["readings", filter],
    queryFn: async () => {
      if (!filter) return { items: [], total: 0, page: 1, page_size: 50, pages: 0, coverage_pct: 0, missing_intervals: 0 };
      const { data } = await apiClient.get("/readings", {
        params: {
          system_id: filter.systemId,
          site_id: filter.siteId,
          start: filter.start,
          end: filter.end,
          quality: filter.quality ?? "all",
          import_id: filter.importId,
          interval: filter.interval ?? "15m",
          page: filter.page ?? 1,
          page_size: filter.pageSize ?? 50,
          sort_order: filter.sortOrder ?? "asc",
        },
      });
      return data;
    },
    enabled: !!(filter?.systemId && filter?.siteId && filter?.start && filter?.end),
  });
}

export function buildExportUrl(filter: ReadingsFilter): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  const params = new URLSearchParams({
    system_id: filter.systemId,
    site_id: filter.siteId,
    start: filter.start,
    end: filter.end,
    quality: filter.quality ?? "all",
    export: "csv",
  });
  if (filter.importId) params.set("import_id", filter.importId);
  return `${base}/api/v1/readings?${params.toString()}`;
}
