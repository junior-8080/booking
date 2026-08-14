import { API_BASE } from '@/lib/config';
import { clearStoredAuth, getStoredAuth } from '@/lib/storage';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

let unauthorizedHandler: (() => void) | null = null;

// Registered once by AuthProvider on mount so a 401 anywhere can force a
// return to the login screen — mirrors admin-app's lib/api.ts redirect.
export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const auth = await getStoredAuth();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(auth ? { Authorization: `Bearer ${auth.token}`, 'X-Tenant-Subdomain': auth.subdomain } : {}),
    ...(options?.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    await clearStoredAuth();
    unauthorizedHandler?.();
    throw new ApiError('Session expired', 401);
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json();
  if (!res.ok) throw new ApiError(json.error ?? 'Request failed', res.status);
  return json.data as T;
}

// For the one pre-auth call (global-login) — no stored token to attach yet.
export async function apiRequestPublic<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers as Record<string, string> | undefined) },
  });
  const json = await res.json();
  if (!res.ok) throw new ApiError(json.error ?? 'Request failed', res.status);
  return json.data as T;
}
