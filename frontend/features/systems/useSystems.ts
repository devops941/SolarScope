"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { qk } from "@/lib/query-client";

export interface SolarSystem {
  id: string;
  site_id: string;
  workspace_id: string;
  name: string;
  dc_capacity_kwp: number;
  ac_capacity_kw: number;
  panel_count: number;
  panel_rating_w: number;
  tilt_degrees: number;
  azimuth_degrees: number;
  temp_coefficient_per_c?: number;
  inverter_make?: string;
  commissioning_date?: string;
  status: "active" | "inactive";
  created_at: string;
}

export interface SystemCreate {
  name: string;
  dc_capacity_kwp: number;
  ac_capacity_kw: number;
  panel_count?: number;
  panel_rating_w?: number;
  tilt_degrees?: number;
  azimuth_degrees?: number;
  temp_coefficient_per_c?: number;
  inverter_make?: string;
  commissioning_date?: string;
}

// ── Queries ─────────────────────────────────────────────────────────
export function useSystemsBySite(siteId: string) {
  return useQuery<SolarSystem[]>({
    queryKey: qk.systems.bySite(siteId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/sites/${siteId}/systems`);
      return data;
    },
    enabled: !!siteId,
  });
}

export function useSystem(systemId: string) {
  return useQuery<SolarSystem>({
    queryKey: qk.systems.detail(systemId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/systems/${systemId}`);
      return data;
    },
    enabled: !!systemId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────
export function useCreateSystem(siteId: string) {
  const qc = useQueryClient();
  return useMutation<SolarSystem, Error, SystemCreate>({
    mutationFn: async (body) => {
      const { data } = await apiClient.post(`/sites/${siteId}/systems`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.systems.bySite(siteId) });
      qc.invalidateQueries({ queryKey: qk.sites.detail(siteId) });
    },
  });
}

export function useUpdateSystem(systemId: string) {
  const qc = useQueryClient();
  return useMutation<SolarSystem, Error, Partial<SystemCreate>>({
    mutationFn: async (body) => {
      const { data } = await apiClient.patch(`/systems/${systemId}`, body);
      return data;
    },
    onSuccess: (updated) => {
      qc.setQueryData(qk.systems.detail(systemId), updated);
    },
  });
}

// ── Re-export qk.sites for use in SystemForm
import { qk as _qk } from "@/lib/query-client";
export { _qk as qk };
