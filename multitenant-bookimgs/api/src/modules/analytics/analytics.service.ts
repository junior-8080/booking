import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../core/BaseRepository';

export class AnalyticsService extends BaseRepository {
  constructor(db: PrismaClient) {
    super(db);
  }

  async getSummary(from: Date, to: Date) {
    const [
      totalBookings,
      bookedBookings,
      rejectedBookings,
      revenue,
      repeatCustomers,
    ] = await Promise.all([
      this.db.booking.count({ where: { created_at: { gte: from, lte: to } } }),
      this.db.booking.count({ where: { status: 'BOOKED', created_at: { gte: from, lte: to } } }),
      this.db.booking.count({ where: { status: 'REJECTED', created_at: { gte: from, lte: to } } }),
      this.db.payment.aggregate({
        where: { status: 'CONFIRMED', created_at: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
      this.db.booking.groupBy({
        by: ['customer_id'],
        where: { created_at: { gte: from, lte: to } },
        having: { customer_id: { _count: { gt: 1 } } },
      }),
    ]);

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      total_bookings: totalBookings,
      booked_bookings: bookedBookings,
      rejection_rate: totalBookings > 0 ? (rejectedBookings / totalBookings) : 0,
      total_revenue: revenue._sum.amount ?? 0,
      repeat_customer_count: repeatCustomers.length,
    };
  }

  async getRevenueByService(from: Date, to: Date) {
    const results = await this.db.payment.groupBy({
      by: ['booking_id'],
      where: { status: 'CONFIRMED', created_at: { gte: from, lte: to } },
      _sum: { amount: true },
    });

    // Join with services via booking
    const bookingIds = results.map(r => r.booking_id);
    const bookings = await this.db.booking.findMany({
      where: { id: { in: bookingIds } },
      include: { service: true },
    });

    const byService: Record<string, { service_name: string; revenue: number; count: number }> = {};
    for (const booking of bookings) {
      const payment = results.find(r => r.booking_id === booking.id);
      const serviceId = booking.service_id;
      if (!byService[serviceId]) {
        byService[serviceId] = { service_name: booking.service.name, revenue: 0, count: 0 };
      }
      byService[serviceId]!.revenue += payment?._sum.amount ?? 0;
      byService[serviceId]!.count += 1;
    }

    return Object.values(byService);
  }

  async getBookingsByPeriod(from: Date, to: Date, groupBy: 'day' | 'week' | 'month' = 'day') {
    // Raw query for time-series bucketing
    const interval = groupBy === 'day' ? '1 day' : groupBy === 'week' ? '1 week' : '1 month';
    const rows = await this.db.$queryRawUnsafe<Array<{ period: Date; count: bigint }>>(
      `SELECT date_trunc($1, slot_start) AS period, COUNT(*) AS count
       FROM bookings
       WHERE slot_start >= $2 AND slot_start <= $3
       GROUP BY period
       ORDER BY period`,
      groupBy,
      from,
      to,
    );
    return rows.map(r => ({ period: r.period.toISOString(), count: Number(r.count) }));
  }
}
