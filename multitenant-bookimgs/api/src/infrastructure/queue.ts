import { Queue } from 'bullmq';
import { env } from '../config/env';

const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: parseInt(new URL(env.REDIS_URL).port || '6379', 10),
};

export const bookingExpiryQueue = new Queue('booking-expiry', { connection });
export const bookingCompletionQueue = new Queue('booking-completion', { connection });
export const notificationsQueue = new Queue('notifications', { connection });
export const analyticsRollupQueue = new Queue('analytics-rollup', { connection });

// ─── Job type definitions ──────────────────────────────────────────────────────

export interface BookingExpiryJob {
  bookingId: string;
  tenantId: string;
}

export interface BookingCompletionJob {
  type: 'sweep'; // cron-style sweep, no specific booking
}

export interface NotificationJob {
  tenantId: string;
  bookingId?: string;
  template: string;
  recipientType: 'CLIENT' | 'TENANT';
  channels: Array<'EMAIL' | 'SMS'>;
  to: {
    email?: string;
    phone?: string;
    name?: string;
  };
  data: Record<string, unknown>;
}

export interface AnalyticsRollupJob {
  type: 'nightly';
  date: string; // ISO date yyyy-mm-dd
}
