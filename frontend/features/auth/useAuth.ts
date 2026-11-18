"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiClient, extractError } from "@/lib/api-client";
import { saveAuth, clearAuth, getUser, getWorkspace, getToken, type AuthUser, type AuthWorkspace } from "@/lib/auth";

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  email: string;
  name: string;
  password: string;
  workspace_name: string;
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [workspace, setWorkspace] = useState<AuthWorkspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setUser(getUser());
    setWorkspace(getWorkspace());
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post("/auth/login", payload);
      saveAuth({ token: data.access_token, user: data.user, workspace: data.workspace });
      setUser(data.user);
      setWorkspace(data.workspace);
      router.push("/dashboard");
    } catch (err) {
      setError(extractError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const register = useCallback(async (payload: RegisterPayload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post("/auth/register", payload);
      saveAuth({ token: data.access_token, user: data.user, workspace: data.workspace });
      setUser(data.user);
      setWorkspace(data.workspace);
      router.push("/dashboard");
    } catch (err) {
      setError(extractError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    try {
      const token = getToken();
      if (token) await apiClient.post("/auth/logout");
    } catch {
      // Best-effort — always clear local state
    } finally {
      clearAuth();
      setUser(null);
      setWorkspace(null);
      router.push("/login");
    }
  }, [router]);

  return { user, workspace, loading, error, login, register, logout, isAuthenticated: !!user };
}
