import { apiRequest } from '@/lib/api-client';
import { Booking } from '@/features/bookings/types';
import { Customer } from '@/features/customers/types';

export function listCustomers(search?: string): Promise<Customer[]> {
  return apiRequest<Customer[]>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`);
}

export function getCustomerHistory(id: string): Promise<Booking[]> {
  return apiRequest<Booking[]>(`/customers/${id}/history`);
}
