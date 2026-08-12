import { Worker, Job } from 'bullmq';
import { env } from '../config/env';
import { createTenantClient } from '../db/prisma';
import { NotificationJob } from '../infrastructure/queue';
import { NotificationService } from '../modules/notification/notification.service';

const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: parseInt(new URL(env.REDIS_URL).port || '6379', 10),
};

export const notificationWorker = new Worker<NotificationJob>(
  'notifications',
  async (job: Job<NotificationJob>) => {
    const { tenantId } = job.data;
    const db = createTenantClient(tenantId);
    const service = new NotificationService(db);
    await service.send(job.data);
  },
  { connection, concurrency: 10 },
);

notificationWorker.on('failed', (job, err) => {
  console.error(`[NotificationWorker] job ${job?.id} failed:`, err.message);
});
