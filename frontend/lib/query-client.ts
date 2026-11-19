import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,        // 1 minute
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// ── Cache key factories ─────────────────────────────────────────────
export const qk = {
  sites: {
    all: ["sites"] as const,
    list: (params?: Record<string, unknown>) => ["sites", "list", params] as const,
    detail: (id: string) => ["sites", id] as const,
  },
  systems: {
    all: (siteId?: string) => ["systems", "all", siteId] as const,
    bySite: (siteId: string) => ["systems", "site", siteId] as const,
    detail: (id: string) => ["systems", id] as const,
  },
  dashboard: {
    summary: (filter: Record<string, unknown>) => ["dashboard", "summary", filter] as const,
    series: (filter: Record<string, unknown>) => ["dashboard", "series", filter] as const,
  },
};
