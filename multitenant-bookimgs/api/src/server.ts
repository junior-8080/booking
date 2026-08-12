import { env } from './config/env';
import { createApp } from './app';
import { prisma } from './db/prisma';
import { redis } from './infrastructure/redis';
import { bookingCompletionQueue, bookingExpiryQueue } from './infrastructure/queue';

// Import workers so they register with BullMQ
import './workers/bookingExpiry.worker';
import './workers/bookingCompletion.worker';
import './workers/notification.worker';
import './workers/analyticsRollup.worker';

async function main() {
  // Verify DB connection
  await prisma.$connect();
  console.log('[DB] connected');

  // Schedule repeatable jobs
  await bookingCompletionQueue.add(
    'sweep',
    { type: 'sweep' },
    { repeat: { every: 60 * 60 * 1000 }, jobId: 'booking-completion-sweep' },
  );

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`[Server] listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

main().catch(err => {
  console.error('[Server] startup error:', err);
  process.exit(1);
});
