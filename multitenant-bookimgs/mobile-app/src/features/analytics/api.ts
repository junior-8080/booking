import { apiRequest } from '@/lib/api-client';
import { AnalyticsSummary, BookingsTimePoint, GroupBy, ServiceRevenue } from '@/features/analytics/types';

export function getSummary(): Promise<AnalyticsSummary> {
  return apiRequest<AnalyticsSummary>('/analytics/summary');
}

export function getRevenueByService(): Promise<ServiceRevenue[]> {
  return apiRequest<ServiceRevenue[]>('/analytics/revenue-by-service');
}

export function getBookingsOverTime(groupBy: GroupBy): Promise<BookingsTimePoint[]> {
  return apiRequest<BookingsTimePoint[]>(`/analytics/bookings-over-time?group_by=${groupBy}`);
}
