// Public booking API — passes subdomain header so the API can resolve the tenant.
// Relative path: requests go through the Next.js /api rewrite so LAN devices
// (e.g. phone testing via 192.168.x.x) reach the API through the Next server.
const API_BASE = '/api';

async function request<T>(path: string, subdomain: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-Subdomain': subdomain,
    ...(options?.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json();

  if (!res.ok) throw new Error(json.error ?? 'Request failed');
  return json.data as T;
}

import type { Brand, Service, Slot, PaymentSource, Booking, Customer, Payment } from '@/types';

export const bookingApi = {
  getTenantStatus: (subdomain: string) =>
    request<{ is_accepting_bookings: boolean }>('/tenant/public-status', subdomain),

  getBrands: (subdomain: string) =>
    request<Brand[]>('/brands', subdomain),

  getServices: (subdomain: string) =>
    request<Service[]>('/services', subdomain),

  getService: (subdomain: string, serviceId: string) =>
    request<Service>(`/services/${serviceId}`, subdomain),

  getSlots: (subdomain: string, serviceId: string, date: string) =>
    request<Slot[]>(`/availability/slots?service_id=${serviceId}&date=${date}`, subdomain),

  getPaymentSources: (subdomain: string) =>
    request<PaymentSource[]>('/payment-sources/public', subdomain),

  createBooking: (
    subdomain: string,
    body: {
      service_id: string;
      slot_start: string;
      customer: { full_name: string; phone: string; email?: string };
      client_notes?: string;
    },
  ) =>
    request<{ booking: Booking; customer: Customer }>('/bookings', subdomain, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getBookingByRef: (subdomain: string, code: string) =>
    request<Booking>(`/bookings/ref/${code}`, subdomain),

  submitProof: (
    subdomain: string,
    bookingId: string,
    body: {
      payment_source_id: string;
      amount: number;
      currency: string;
      client_reference?: string;
      proof_url?: string;
    },
  ) =>
    request<Payment>(`/bookings/${bookingId}/proof`, subdomain, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
