export interface AnalyticsSummary {
  total_bookings: number;
  booked_bookings: number;
  rejection_rate: number;
  total_revenue: number;
  repeat_customer_count: number;
}

export interface ServiceRevenue {
  service_name: string;
  revenue: number;
  count: number;
}

export interface BookingsTimePoint {
  period: string;
  count: number;
}

export type GroupBy = 'day' | 'week' | 'month';
