import { apiRequestPublic } from '@/lib/api-client';
import { CurrentUser } from '@/features/auth/api';
import { RegisterInput } from '@/features/onboarding/types';

interface RegisterResponse {
  token: string;
  subdomain: string;
  user: CurrentUser;
}

// Mirrors admin-app/src/app/onboarding/page.tsx — no tenant header needed,
// the backend creates the tenant and resolves everything from the body.
export function register(data: RegisterInput): Promise<RegisterResponse> {
  return apiRequestPublic<RegisterResponse>('/onboarding/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
