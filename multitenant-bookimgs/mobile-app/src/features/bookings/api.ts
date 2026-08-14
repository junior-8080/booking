import { apiRequest } from '@/lib/api-client';
import { Booking, BookingStatus } from '@/features/bookings/types';

export function listBookings(status?: BookingStatus): Promise<Booking[]> {
  return apiRequest<Booking[]>(`/bookings${status ? `?status=${status}` : ''}`);
}

export function getBooking(id: string): Promise<Booking> {
  return apiRequest<Booking>(`/bookings/${id}`);
}

export function confirmBooking(id: string, paymentId: string): Promise<void> {
  return apiRequest<void>(`/bookings/${id}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ payment_id: paymentId }),
  });
}

export function rejectBooking(id: string, paymentId: string, reason: string): Promise<void> {
  return apiRequest<void>(`/bookings/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ payment_id: paymentId, rejection_reason: reason }),
  });
}
