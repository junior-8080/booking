import { apiRequest } from '@/lib/api-client';

export function registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void> {
  return apiRequest<void>('/tenant-users/me/push-token', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  });
}
