import { PrismaClient, BookingStatus, Prisma } from '@prisma/client';
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

    const customer = await this.customerService.findOrCreate(params.customer);

    const requiredAmount = this.serviceService.computeDepositAmount(
      service.price_amount,
      service.deposit_type,
      service.deposit_value,
    );

    const referenceCode = await generateUniqueRef();

    const booking = await this.reserveSlot({
      serviceId: params.serviceId,
      slotStart: params.slotStart,
      slotEnd,
      capacity,
      customerId: customer.id,
      requiredAmount,
      currency: service.price_currency,
      referenceCode,
      holdExpiresAt,
      clientNotes: params.clientNotes,
    });

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

    // Push-alert the tenant — a slot was just held, faster awareness than waiting on proof
    await notificationsQueue.add('send', {
      tenantId: params.tenantId,
      bookingId: booking.id,
      template: 'tenant_booking_created',
      recipientType: 'TENANT',
      channels: ['PUSH'],
      to: {},
      data: { referenceCode, serviceName: service.name, holdExpiresAt: holdExpiresAt.toISOString() },
    } satisfies NotificationJob);

    return { booking, customer };
  }

  // Runs the overlap-capacity check and the booking insert inside a single
  // SERIALIZABLE transaction, so two concurrent requests for the same slot
  // can't both pass the count check before either commits (overbooking).
  // Postgres aborts the loser with a serialization failure (P2034), which we
  // retry a couple of times before finally reporting the slot as taken.
  private async reserveSlot(input: {
    serviceId: string;
    slotStart: Date;
    slotEnd: Date;
    capacity: number;
    customerId: string;
    requiredAmount: number;
    currency: string;
    referenceCode: string;
    holdExpiresAt: Date;
    clientNotes?: string;
  }) {
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await this.db.$transaction(
          async (tx) => {
            const overlapCount = await tx.booking.count({
              where: {
                service_id: input.serviceId,
                status: { in: ['PENDING', 'BOOKED'] },
                slot_start: { lt: input.slotEnd },
                slot_end: { gt: input.slotStart },
              },
            });
            if (overlapCount >= input.capacity) {
              throw new ConflictError('This slot is fully booked. Please choose another time.');
            }

            return tx.booking.create({
              data: {
                customer_id: input.customerId,
                service_id: input.serviceId,
                slot_start: input.slotStart,
                slot_end: input.slotEnd,
                status: 'PENDING',
                required_amount: input.requiredAmount,
                required_currency: input.currency,
                reference_code: input.referenceCode,
                hold_expires_at: input.holdExpiresAt,
                client_notes: input.clientNotes ?? null,
              },
            } as Parameters<typeof tx.booking.create>[0]);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (err) {
        const isSerializationFailure = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034';
        if (!isSerializationFailure) throw err;
        if (attempt < MAX_ATTEMPTS) continue;
        throw new ConflictError('This slot just filled up. Please choose another time.');
      }
    }
    throw new Error('unreachable');
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
    if (params.currency !== booking.required_currency) {
      throw new ValidationError(`Payment currency must be ${booking.required_currency}`);
    }
    if (params.amount < booking.required_amount) {
      throw new ValidationError(`Payment amount is below the required deposit`);
    }

    // Prevent duplicate proof submissions while one is still under review
    const pendingProof = await this.db.payment.findFirst({
      where: { booking_id: params.bookingId, status: 'AWAITING_REVIEW' },
    } as Parameters<typeof this.db.payment.findFirst>[0]);
    if (pendingProof) {
      throw new ConflictError('A payment proof is already under review for this booking');
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
      channels: ['EMAIL', 'SMS', 'PUSH'],
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

    const payment = await this.db.payment.findFirst({
      where: { id: params.paymentId },
    } as Parameters<typeof this.db.payment.findFirst>[0]);
    if (!payment || payment.booking_id !== params.bookingId) throw new NotFoundError('Payment');
    if (payment.status !== 'AWAITING_REVIEW') {
      throw new ValidationError(`Payment has already been ${payment.status.toLowerCase()}`);
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

    const payment = await this.db.payment.findFirst({
      where: { id: params.paymentId },
    } as Parameters<typeof this.db.payment.findFirst>[0]);
    if (!payment || payment.booking_id !== params.bookingId) throw new NotFoundError('Payment');
    if (payment.status !== 'AWAITING_REVIEW') {
      throw new ValidationError(`Payment has already been ${payment.status.toLowerCase()}`);
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
