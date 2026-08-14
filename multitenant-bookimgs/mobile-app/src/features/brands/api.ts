import { apiRequest, apiRequestPublic } from '@/lib/api-client';
import { Brand, CountryOption, TenantSettings } from '@/features/brands/types';

export function listBrands(): Promise<Brand[]> {
  return apiRequest<Brand[]>('/brands');
}

type BrandFields = Pick<Brand, 'name' | 'description' | 'logo_url' | 'terms_conditions' | 'whatsapp_number'>;

export function updateBrand(id: string, data: Partial<BrandFields>): Promise<Brand> {
  return apiRequest<Brand>(`/brands/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function createBrand(data: Partial<BrandFields> & { name: string; is_primary?: boolean }): Promise<Brand> {
  return apiRequest<Brand>('/brands', { method: 'POST', body: JSON.stringify(data) });
}

export function listCountries(): Promise<CountryOption[]> {
  return apiRequestPublic<CountryOption[]>('/countries');
}

export function getTenantSettings(): Promise<TenantSettings> {
  return apiRequest<TenantSettings>('/tenant/settings');
}

export interface TenantSettingsUpdate {
  country?: string;
  timezone?: string;
  slot_hold_minutes?: number;
  booking_confirmation_sla_hours?: number;
}

export function updateTenantSettings(data: TenantSettingsUpdate): Promise<TenantSettings> {
  return apiRequest<TenantSettings>('/tenant/settings', { method: 'PATCH', body: JSON.stringify(data) });
}
