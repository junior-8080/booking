import { Worker } from 'bullmq';
import { env } from '../config/env';
import { prisma } from '../db/prisma';

const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: parseInt(new URL(env.REDIS_URL).port || '6379', 10),
};

// Nightly job: aggregate booking/revenue stats per tenant per day.
// In v1, analytics queries run live; this worker is scaffolded for future rollup tables.
export const analyticsRollupWorker = new Worker(
  'analytics-rollup',
  async (job) => {
    console.log('[AnalyticsRollupWorker] nightly rollup starting for date:', job.data?.date);
    // TODO: upsert into analytics_daily_rollup table when volume demands it.
  },
  { connection },
);

analyticsRollupWorker.on('failed', (job, err) => {
  console.error(`[AnalyticsRollupWorker] job ${job?.id} failed:`, err.message);
});
