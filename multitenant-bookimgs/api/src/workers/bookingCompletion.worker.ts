import { Worker } from 'bullmq';
import { env } from '../config/env';

const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: parseInt(new URL(env.REDIS_URL).port || '6379', 10),
};

// No-op: BOOKED bookings remain BOOKED after the appointment — no completion sweep needed.
export const bookingCompletionWorker = new Worker(
  'booking-completion',
  async () => {},
  { connection },
);
