import { apiRequest } from '@/lib/api-client';
import { PaymentSource, PaymentSourceInput } from '@/features/payment-sources/types';

export function listPaymentSources(): Promise<PaymentSource[]> {
  return apiRequest<PaymentSource[]>('/payment-sources');
}

export function createPaymentSource(data: PaymentSourceInput): Promise<PaymentSource> {
  return apiRequest<PaymentSource>('/payment-sources', { method: 'POST', body: JSON.stringify(data) });
}

export function updatePaymentSource(id: string, data: Partial<PaymentSourceInput>): Promise<PaymentSource> {
  return apiRequest<PaymentSource>(`/payment-sources/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deletePaymentSource(id: string): Promise<void> {
  return apiRequest<void>(`/payment-sources/${id}`, { method: 'DELETE' });
}

export function togglePaymentSource(id: string): Promise<PaymentSource> {
  return apiRequest<PaymentSource>(`/payment-sources/${id}/toggle`, { method: 'POST' });
}
