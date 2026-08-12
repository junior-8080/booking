import Redis from 'ioredis';
import { env } from '../config/env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('error', err => console.error('[Redis] error:', err.message));
redis.on('connect', () => console.log('[Redis] connected'));

// ─── Slot locking ─────────────────────────────────────────────────────────────
// Key format: lock:slot:{tenant_id}:{service_id}:{slot_start_iso}
export function slotLockKey(tenantId: string, serviceId: string, slotStart: Date): string {
  return `lock:slot:${tenantId}:${serviceId}:${slotStart.toISOString()}`;
}

export async function acquireSlotLock(
  key: string,
  ttlSeconds: number,
): Promise<boolean> {
  const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

export async function releaseSlotLock(key: string): Promise<void> {
  await redis.del(key);
}
