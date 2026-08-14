import { Worker, Job } from 'bullmq';
import { env } from '../config/env';
import { prisma, createTenantClient } from '../db/prisma';
import { BookingExpiryJob, notificationsQueue, NotificationJob } from '../infrastructure/queue';

const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: parseInt(new URL(env.REDIS_URL).port || '6379', 10),
};

export const bookingExpiryWorker = new Worker<BookingExpiryJob>(
  'booking-expiry',
  async (job: Job<BookingExpiryJob>) => {
    const { bookingId, tenantId } = job.data;

    const db = createTenantClient(tenantId);
    const booking = await db.booking.findFirst({ where: { id: bookingId } });

    // Only expire if still PENDING — proof may have been submitted just before
    if (!booking || booking.status !== 'PENDING') return;

    await db.booking.update({
      where: { id: bookingId },
      data: { status: 'REJECTED' },
    });

    await notificationsQueue.add('send', {
      tenantId,
      bookingId,
      template: 'tenant_booking_expired',
      recipientType: 'TENANT',
      channels: ['PUSH'],
      to: {},
      data: { referenceCode: booking.reference_code },
    } satisfies NotificationJob);

    console.log(`[BookingExpiryWorker] booking ${bookingId} expired`);
  },
  { connection },
);

bookingExpiryWorker.on('failed', (job, err) => {
  console.error(`[BookingExpiryWorker] job ${job?.id} failed:`, err.message);
});
