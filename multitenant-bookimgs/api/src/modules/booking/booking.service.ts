import { PrismaClient, BookingStatus } from '@prisma/client';
import { BaseRepository } from '../../core/BaseRepository';
import { ConflictError, NotFoundError, ValidationError } from '../../core/AppError';
import { bookingExpiryQueue, notificationsQueue, NotificationJob } from '../../infrastructure/queue';
import { CustomerService } from '../customer/customer.service';
import { ServiceService } from '../service/service.service';
import { prisma as globalPrisma } from '../../db/prisma';

function generateReferenceCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BK-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Uses the global (non-tenant-scoped) client because reference_code is globally unique
async function generateUniqueRef(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateReferenceCode();
    const exists = await globalPrisma.booking.findFirst({ where: { reference_code: code } });
    if (!exists) return code;
  }
  throw new Error('Failed to generate unique reference code');
}

function slotDayAndTime(slotStart: Date, timezone: string): { dayOfWeek: number; timeStr: string } {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  const parts = fmt.formatToParts(slotStart);
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = parts.find(p => p.type === 'weekday')?.value ?? 'Sun';
  const hour = parts.find(p => p.type === 'hour')?.value ?? '00';
  const minute = parts.find(p => p.type === 'minute')?.value ?? '00';
  return { dayOfWeek: weekdayMap[weekday] ?? 0, timeStr: `${hour}:${minute}` };
}

export class BookingService extends BaseRepository {
  private readonly customerService: CustomerService;
  private readonly serviceService: ServiceService;

  constructor(db: PrismaClient) {
    super(db);
    this.customerService = new CustomerService(db);
    this.serviceService = new ServiceService(db);
  }

  async createBooking(params: {
    tenantId: string;
    timezone: string;
    slotHoldMinutes: number;
    serviceId: string;
    slotStart: Date;
    customer: { full_name: string; phone: string; email?: string };
    clientNotes?: string;
  }) {
    const service = await this.serviceService.getService(params.serviceId);
    const slotEnd = new Date(params.slotStart.getTime() + service.duration_minutes * 60_000);
    const holdExpiresAt = new Date(Date.now() + params.slotHoldMinutes * 60_000);

    // Resolve slot capacity from the matching availability range
    const { dayOfWeek, timeStr } = slotDayAndTime(params.slotStart, params.timezone);
    const range = await this.db.availability.findFirst({
      where: {
        service_id: params.serviceId,
        day_of_week: dayOfWeek,
        start_time: { lte: timeStr },
        end_time: { gt: timeStr },
      },
    });
    const capacity = range?.capacity ?? 1;

    // Count active bookings overlapping this slot and enforce capacity
    const overlapCount = await this.db.booking.count({
      where: {
        service_id: params.serviceId,
        status: { in: ['PENDING', 'BOOKED'] },
        slot_start: { lt: slotEnd },
        slot_end: { gt: params.slotStart },
      },
    });
    if (overlapCount >= capacity) {
      throw new ConflictError('This slot is fully booked. Please choose another time.');
    }

    const customer = await this.customerService.findOrCreate(params.customer);

    const requiredAmount = this.serviceService.computeDepositAmount(
      service.price_amount,
      service.deposit_type,
      service.deposit_value,
    );

    const referenceCode = await generateUniqueRef();

    const booking = await this.db.booking.create({
      data: {
        customer_id: customer.id,
        service_id: params.serviceId,
        slot_start: params.slotStart,
        slot_end: slotEnd,
        status: 'PENDING',
        required_amount: requiredAmount,
        required_currency: service.price_currency,
        reference_code: referenceCode,
        hold_expires_at: holdExpiresAt,
        client_notes: params.clientNotes ?? null,
      },
    } as Parameters<typeof this.db.booking.create>[0]);

    // Schedule expiry job
    await bookingExpiryQueue.add(
      'expire',
      { bookingId: booking.id, tenantId: params.tenantId },
      { delay: params.slotHoldMinutes * 60_000, jobId: `expire-${booking.id}` },
    );

    // Enqueue hold notification
    const notifJob: NotificationJob = {
      tenantId: params.tenantId,
      bookingId: booking.id,
      template: 'booking_hold_created',
      recipientType: 'CLIENT',
      channels: ['EMAIL', 'SMS'],
      to: { email: customer.email ?? undefined, phone: customer.phone, name: customer.full_name },
      data: {
        referenceCode,
        holdExpiresAt: holdExpiresAt.toISOString(),
        requiredAmount,
        requiredCurrency: service.price_currency,
      },
    };
    await notificationsQueue.add('send', notifJob);

    // Schedule 50% reminder
    await notificationsQueue.add(
      'send',
      {
        ...notifJob,
        template: 'payment_proof_reminder',
        channels: ['SMS'],
      },
      { delay: Math.floor(params.slotHoldMinutes * 60_000 * 0.5), jobId: `reminder-${booking.id}` },
    );

    return { booking, customer };
  }

  async submitProof(params: {
    tenantId: string;
    bookingId: string;
    paymentSourceId: string;
    amount: number;
    currency: string;
    clientReference?: string;
    proofUrl?: string;
  }) {
    const booking = await this.findById(params.bookingId);
    if (booking.status !== 'PENDING') {
      throw new ValidationError(`Cannot submit proof for a booking in ${booking.status} status`);
    }

    const [payment] = await Promise.all([
      this.db.payment.create({
        data: {
          booking_id: params.bookingId,
          payment_source_id: params.paymentSourceId,
          amount: params.amount,
          currency: params.currency,
          client_reference: params.clientReference ?? null,
          proof_url: params.proofUrl ?? null,
          status: 'AWAITING_REVIEW',
        },
      } as Parameters<typeof this.db.payment.create>[0]),
      this.db.booking.update({
        where: { id: params.bookingId },
        data: { hold_expires_at: null },
      }),
    ]);

    // Cancel the expiry job — proof submitted, hold is now firm
    await bookingExpiryQueue.remove(`expire-${params.bookingId}`).catch(() => null);

    // Notify tenant
    await notificationsQueue.add('send', {
      tenantId: params.tenantId,
      bookingId: params.bookingId,
      template: 'tenant_new_booking_alert',
      recipientType: 'TENANT',
      channels: ['EMAIL', 'SMS'],
      to: {},
      data: { referenceCode: booking.reference_code, amount: params.amount, currency: params.currency },
    } satisfies NotificationJob);

    return payment;
  }

  async confirmBooking(params: {
    tenantId: string;
    bookingId: string;
    paymentId: string;
    reviewerUserId: string;
  }) {
    const booking = await this.findById(params.bookingId);
    if (booking.status !== 'PENDING') {
      throw new ValidationError(`Cannot confirm a booking in ${booking.status} status`);
    }

    const now = new Date();

    await Promise.all([
      this.db.booking.update({
        where: { id: params.bookingId },
        data: {
          status: 'BOOKED',
          confirmed_by_user_id: params.reviewerUserId,
          confirmed_at: now,
        },
      }),
      this.db.payment.update({
        where: { id: params.paymentId },
        data: { status: 'CONFIRMED', reviewed_by_user_id: params.reviewerUserId, reviewed_at: now },
      }),
    ]);

    const customer = await this.db.customer.findFirst({ where: { id: booking.customer_id } });

    await notificationsQueue.add('send', {
      tenantId: params.tenantId,
      bookingId: params.bookingId,
      template: 'booking_confirmed',
      recipientType: 'CLIENT',
      channels: ['EMAIL', 'SMS'],
      to: { email: customer?.email ?? undefined, phone: customer?.phone, name: customer?.full_name },
      data: { referenceCode: booking.reference_code },
    } satisfies NotificationJob);
  }

  async rejectBooking(params: {
    tenantId: string;
    bookingId: string;
    paymentId: string;
    reviewerUserId: string;
    rejectionReason: string;
  }) {
    const booking = await this.findById(params.bookingId);
    if (booking.status !== 'PENDING') {
      throw new ValidationError(`Cannot reject a booking in ${booking.status} status`);
    }

    const now = new Date();

    await Promise.all([
      this.db.booking.update({
        where: { id: params.bookingId },
        data: {
          status: 'REJECTED',
          rejection_reason: params.rejectionReason,
          confirmed_by_user_id: params.reviewerUserId,
          confirmed_at: now,
        },
      }),
      this.db.payment.update({
        where: { id: params.paymentId },
        data: { status: 'REJECTED', reviewed_by_user_id: params.reviewerUserId, reviewed_at: now },
      }),
    ]);

    const customer = await this.db.customer.findFirst({ where: { id: booking.customer_id } });

    await notificationsQueue.add('send', {
      tenantId: params.tenantId,
      bookingId: params.bookingId,
      template: 'booking_rejected',
      recipientType: 'CLIENT',
      channels: ['EMAIL', 'SMS'],
      to: { email: customer?.email ?? undefined, phone: customer?.phone, name: customer?.full_name },
      data: { referenceCode: booking.reference_code, rejectionReason: params.rejectionReason },
    } satisfies NotificationJob);
  }

  async cancelBooking(params: { bookingId: string }) {
    const booking = await this.findById(params.bookingId);
    if (!['PENDING', 'BOOKED'].includes(booking.status)) {
      throw new ValidationError(`Cannot cancel a booking in ${booking.status} status`);
    }
    await this.db.booking.update({
      where: { id: params.bookingId },
      data: { status: 'REJECTED' },
    });
  }

  async getBookingByRef(referenceCode: string) {
    const booking = await this.db.booking.findFirst({
      where: { reference_code: referenceCode },
      include: { service: true, customer: true, payments: { include: { payment_source: true } } },
    });
    if (!booking) throw new NotFoundError('Booking');
    return booking;
  }

  async getBookingById(id: string) {
    const booking = await this.db.booking.findFirst({
      where: { id },
      include: { service: true, customer: true, payments: { include: { payment_source: true } } },
    });
    if (!booking) throw new NotFoundError('Booking');
    return booking;
  }

  async listBookings(filters: { status?: BookingStatus | BookingStatus[] }) {
    return this.db.booking.findMany({
      where: {
        ...(filters.status
          ? { status: Array.isArray(filters.status) ? { in: filters.status } : filters.status }
          : {}),
      },
      include: { service: true, customer: true, payments: true },
      orderBy: { created_at: 'desc' },
    });
  }

  private async findById(id: string) {
    const b = await this.db.booking.findFirst({ where: { id } });
    if (!b) throw new NotFoundError('Booking');
    return b;
  }
}
