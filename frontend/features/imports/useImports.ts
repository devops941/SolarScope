"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, extractError } from "@/lib/api-client";

export interface ImportRecord {
  id: string;
  filename: string;
  checksum: string;
  status: string;
  counts: {
    total: number;
    accepted: number;
    rejected: number;
    skipped: number;
    flagged: number;
  };
  site_id: string;
  system_id: string;
  actor: string;
  created_at: string;
  completed_at?: string;
}

export interface PreviewResult {
  import_id: string;
  filename: string;
  checksum: string;
  total_rows: number;
  headers: string[];
  suggested_mapping: Array<{ source_column: string; canonical_column: string }>;
  column_types: Record<string, string>;
  sample_rows: Array<{
    row_number: number;
    timestamp?: string;
    power_kw?: string;
    energy_kwh?: string;
    irradiance_w_m2?: string;
    ambient_temp_c?: string;
    module_temp_c?: string;
    status: "accepted" | "rejected" | "flagged";
    error_message?: string;
  }>;
  counts: { total_sampled: number; accepted: number; rejected: number; flagged: number };
  status: string;
}

// ── Queries ─────────────────────────────────────────────────────────
export function useImportsList(page = 1) {
  return useQuery({
    queryKey: ["imports", "list", page],
    queryFn: async () => {
      const { data } = await apiClient.get("/imports", { params: { page, page_size: 50 } });
      return data;
    },
  });
}

export function useImport(importId: string) {
  return useQuery<ImportRecord>({
    queryKey: ["imports", importId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/imports/${importId}`);
      return data;
    },
    enabled: !!importId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────
export function useUploadPreview() {
  return useMutation<PreviewResult, Error, {
    file: File;
    siteId: string;
    systemId: string;
    sourceTimezone: string;
  }>({
    mutationFn: async ({ file, siteId, systemId, sourceTimezone }) => {
      const form = new FormData();
      form.append("file", file);
      const { data } = await apiClient.post("/imports/preview", form, {
        params: { site_id: siteId, system_id: systemId, source_timezone: sourceTimezone },
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
  });
}

export function useConfirmImport() {
  const qc = useQueryClient();
  return useMutation<void, Error, {
    importId: string;
    duplicatePolicy: string;
    sourceTimezone: string;
    energyMode: string;
  }>({
    mutationFn: async ({ importId, duplicatePolicy, sourceTimezone, energyMode }) => {
      await apiClient.post(`/imports/${importId}/confirm`, null, {
        params: {
          duplicate_policy: duplicatePolicy,
          source_timezone: sourceTimezone,
          energy_mode: energyMode,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["imports"] });
    },
  });
}

export function useRollbackImport() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (importId) => {
      await apiClient.post(`/imports/${importId}/rollback`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["imports"] });
    },
  });
}
