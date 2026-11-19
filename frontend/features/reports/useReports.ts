"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { getToken } from "@/lib/auth";

export interface Report {
  id: string;
  workspace_id: string;
  analysis_run_id: string;
  format: "pdf" | "metrics_csv" | "readings_csv";
  title: string;
  status: "queued" | "generating" | "ready" | "failed";
  file_size_bytes?: number;
  error_message?: string;
  filter_snapshot: Record<string, string>;
  created_at: string;
  generated_at?: string;
}

export interface ReportsPage {
  items: Report[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export function useReports(page = 1) {
  return useQuery<ReportsPage>({
    queryKey: ["reports", "list", page],
    queryFn: async () => {
      const { data } = await apiClient.get("/reports", { params: { page, page_size: 50 } });
      return data;
    },
    refetchInterval: (query) => {
      const reports = query.state.data?.items ?? [];
      const hasActive = reports.some(
        (r) => r.status === "queued" || r.status === "generating"
      );
      return hasActive ? 2500 : false;
    },
  });
}

export function useReport(reportId: string) {
  return useQuery<Report>({
    queryKey: ["reports", reportId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/reports/${reportId}`);
      return data;
    },
    enabled: !!reportId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      if (data.status === "queued" || data.status === "generating") return 2000;
      return false;
    },
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation<Report, Error, {
    analysisRunId: string;
    format: string;
    title?: string;
  }>({
    mutationFn: async ({ analysisRunId, format, title }) => {
      const { data } = await apiClient.post("/reports", null, {
        params: { analysis_run_id: analysisRunId, format, title },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export async function downloadReportFile(reportId: string, filename: string): Promise<void> {
  const { data } = await apiClient.get(`/reports/${reportId}/download`, {
    responseType: "blob",
  });
  const blob = new Blob([data]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function getDownloadUrl(reportId: string): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  const token = typeof window !== "undefined" ? getToken() : null;
  return `${base}/api/v1/reports/${reportId}/download${token ? `?token=${token}` : ""}`;
}
