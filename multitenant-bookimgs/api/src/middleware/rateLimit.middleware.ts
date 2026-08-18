import rateLimit from 'express-rate-limit';
import { RedisStore, RedisReply } from 'rate-limit-redis';
import { redis } from '../infrastructure/redis';

// Shared Redis-backed store so limits are enforced consistently across
// multiple API instances rather than per-process in memory.
function redisStore(prefix: string) {
  return new RedisStore({
    prefix,
    sendCommand: (command: string, ...args: string[]) => redis.call(command, ...args) as Promise<RedisReply>,
  });
}

const jsonRateLimitResponse = (req: import('express').Request, res: import('express').Response) => {
  res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
};

// Credential stuffing / brute force protection on login endpoints.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('rl:login:'),
  handler: jsonRateLimitResponse,
});

// Slows down automated/spam tenant signups.
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('rl:register:'),
  handler: jsonRateLimitResponse,
});

// Slows down brute-forcing booking reference codes to enumerate other
// customers' bookings (name/phone/email/payment-proof URLs).
export const bookingLookupRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('rl:booking-ref:'),
  handler: jsonRateLimitResponse,
});
