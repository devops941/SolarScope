"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, extractError } from "@/lib/api-client";
import { qk } from "@/lib/query-client";

export interface Site {
  id: string;
  workspace_id: string;
  name: string;
  timezone: string;
  status: "active" | "inactive" | "archived";
  address?: string;
  location?: { lat: number; lng: number };
  system_count: number;
  created_at: string;
  updated_at: string;
}

export interface SitesPage {
  items: Site[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface SiteCreate {
  name: string;
  timezone: string;
  address?: string;
  location?: { lat: number; lng: number };
}

// ── Queries ─────────────────────────────────────────────────────────
export function useSites(page = 1, status?: string) {
  return useQuery<SitesPage>({
    queryKey: qk.sites.list({ page, status }),
    queryFn: async () => {
      const params: Record<string, unknown> = { page, page_size: 50 };
      if (status) params.status = status;
      const { data } = await apiClient.get("/sites", { params });
      return data;
    },
  });
}

export function useSite(siteId: string) {
  return useQuery<Site>({
    queryKey: qk.sites.detail(siteId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/sites/${siteId}`);
      return data;
    },
    enabled: !!siteId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────
export function useCreateSite() {
  const qc = useQueryClient();
  return useMutation<Site, Error, SiteCreate>({
    mutationFn: async (body) => {
      const { data } = await apiClient.post("/sites", body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.sites.all });
    },
  });
}

export function useUpdateSite(siteId: string) {
  const qc = useQueryClient();
  return useMutation<Site, Error, Partial<SiteCreate> & { status?: string }>({
    mutationFn: async (body) => {
      const { data } = await apiClient.patch(`/sites/${siteId}`, body);
      return data;
    },
    onSuccess: (updated) => {
      qc.setQueryData(qk.sites.detail(siteId), updated);
      qc.invalidateQueries({ queryKey: qk.sites.all });
    },
  });
}

export function useArchiveSite() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (siteId) => {
      await apiClient.delete(`/sites/${siteId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.sites.all });
    },
  });
}
