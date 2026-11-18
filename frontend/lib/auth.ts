/**
 * Client-side auth helpers.
 * Tokens are stored in localStorage (dev-safe).
 * Next.js middleware also reads the cookie `auth_token` for SSR protection.
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthWorkspace {
  id: string;
  name: string;
  timezone: string;
}

export interface AuthState {
  token: string;
  user: AuthUser;
  workspace: AuthWorkspace;
}

const TOKEN_KEY = "solarscope_token";
const USER_KEY  = "solarscope_user";
const WS_KEY    = "solarscope_workspace";

// ── Storage ───────────────────────────────────────────────────────────
export function saveAuth(state: AuthState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, state.token);
  localStorage.setItem(USER_KEY, JSON.stringify(state.user));
  localStorage.setItem(WS_KEY, JSON.stringify(state.workspace));
  // Also set a cookie so Next.js middleware can read it
  document.cookie = `auth_token=${state.token}; path=/; SameSite=Lax`;
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(WS_KEY);
  document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function getWorkspace(): AuthWorkspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WS_KEY);
    return raw ? (JSON.parse(raw) as AuthWorkspace) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ── JWT expiry check (client-side only) ────────────────────────────────
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}
