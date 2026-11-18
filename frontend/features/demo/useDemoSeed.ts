"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, extractError } from "@/lib/api-client";
import { useState } from "react";

export function useDemoSeed() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ success: boolean; message: string; site_id: string; system_id: string }>(
        "/demo/seed"
      );
      return res.data;
    },
    onSuccess: (data) => {
      setSuccessMessage(data.message);
      // Invalidate all related caches to trigger instant UI refresh
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      queryClient.invalidateQueries({ queryKey: ["systems"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["readings"] });
      queryClient.invalidateQueries({ queryKey: ["imports"] });
    },
  });

  return {
    seedDemo: mutation.mutate,
    seedDemoAsync: mutation.mutateAsync,
    isSeeding: mutation.isPending,
    error: mutation.error ? extractError(mutation.error) : null,
    successMessage,
  };
}
