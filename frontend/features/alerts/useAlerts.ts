"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Alert {
  id: string;
  workspace_id: string;
  system_id: string;
  site_id: string;
  analysis_run_id: string;
  rule_code: string;
  severity: "info" | "warning" | "critical";
  status: "open" | "acknowledged" | "resolved";
  trigger_description: string;
  evidence: Record<string, unknown>;
  affected_intervals: string[];
  notes: string[];
  acknowledged_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface AlertsPage {
  items: Alert[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface AlertCounts {
  total: number;
  critical: number;
  warning: number;
  info: number;
}

export function useAlerts(params?: {
  severity?: string;
  status?: string;
  systemId?: string;
  page?: number;
}) {
  return useQuery<AlertsPage>({
    queryKey: ["alerts", "list", params],
    queryFn: async () => {
      const { data } = await apiClient.get("/alerts", {
        params: {
          severity: params?.severity,
          status: params?.status,
          system_id: params?.systemId,
          page: params?.page ?? 1,
          page_size: 50,
        },
      });
      return data;
    },
  });
}

export function useAlertCounts() {
  return useQuery<AlertCounts>({
    queryKey: ["alerts", "counts"],
    queryFn: async () => {
      const { data } = await apiClient.get("/alerts/counts");
      return data;
    },
  });
}

export function useUpdateAlertStatus() {
  const qc = useQueryClient();
  return useMutation<Alert, Error, { alertId: string; status: string; note?: string }>({
    mutationFn: async ({ alertId, status, note }) => {
      const { data } = await apiClient.patch(`/alerts/${alertId}`, { status, note });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}
