import { apiRequest } from '@/lib/api-client';
import { Service, ServiceInput } from '@/features/services/types';

export function listServices(includeInactive = true): Promise<Service[]> {
  return apiRequest<Service[]>(`/services${includeInactive ? '?include_inactive=true' : ''}`);
}

export function createService(data: ServiceInput): Promise<Service> {
  return apiRequest<Service>('/services', { method: 'POST', body: JSON.stringify(data) });
}

export function updateService(id: string, data: Partial<ServiceInput>): Promise<Service> {
  return apiRequest<Service>(`/services/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteService(id: string): Promise<void> {
  return apiRequest<void>(`/services/${id}`, { method: 'DELETE' });
}
