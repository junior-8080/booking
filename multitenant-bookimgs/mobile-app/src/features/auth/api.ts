import { apiRequest, apiRequestPublic } from '@/lib/api-client';

export interface CurrentUser {
  id: string;
  full_name: string;
  email: string;
  role: 'TENANT_OWNER' | 'TENANT_STAFF';
}

interface LoginResponse {
  token: string;
  subdomain: string;
  user: CurrentUser;
}

// Mirrors admin-app/src/app/login/page.tsx exactly — global-login resolves
// the tenant by email, no tenant header needed for this one call.
export function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequestPublic<LoginResponse>('/auth/global-login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getMe(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>('/auth/me');
}

// TENANT_OWNER accounts also suspend the whole business — see auth.service.ts.
export function deleteAccount(): Promise<void> {
  return apiRequest<void>('/auth/me', { method: 'DELETE' });
}
