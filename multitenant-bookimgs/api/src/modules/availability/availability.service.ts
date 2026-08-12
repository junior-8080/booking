import { PrismaClient } from '@prisma/client';
import { AvailabilityRepository } from './availability.repository';
import { ValidationError } from '../../core/AppError';

interface SlotInterval {
  start: Date;
  end: Date;
  available: boolean;
}

export class AvailabilityService {
  private readonly repo: AvailabilityRepository;

  constructor(db: PrismaClient) {
    this.repo = new AvailabilityRepository(db);
  }

  async getSchedule(serviceId: string) {
    return this.repo.findByService(serviceId);
  }

  async createRange(
    serviceId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    slotDurationMinutes: number,
    capacity: number,
  ) {
    if (dayOfWeek < 0 || dayOfWeek > 6) throw new ValidationError('day_of_week must be 0–6');
    if (startTime >= endTime) throw new ValidationError('start_time must be before end_time');
    if (capacity < 1) throw new ValidationError('capacity must be at least 1');
    return this.repo.createRange(serviceId, dayOfWeek, startTime, endTime, slotDurationMinutes, capacity);
  }

  async updateRange(
    id: string,
    data: { start_time?: string; end_time?: string; slot_duration_minutes?: number; capacity?: number },
  ) {
    if (data.start_time && data.end_time && data.start_time >= data.end_time)
      throw new ValidationError('start_time must be before end_time');
    if (data.capacity !== undefined && data.capacity < 1)
      throw new ValidationError('capacity must be at least 1');
    return this.repo.updateRange(id, data);
  }

  async removeRange(id: string) {
    return this.repo.deleteRange(id);
  }

  async clearDay(serviceId: string, dayOfWeek: number) {
    return this.repo.deleteRangesForDay(serviceId, dayOfWeek);
  }

  async getExceptions(serviceId: string, from?: Date, to?: Date) {
    return this.repo.findExceptionsByService(serviceId, from, to);
  }

  async addException(data: {
    service_id?: string;
    date: Date;
    type: 'BLOCKED' | 'CUSTOM_HOURS';
    start_time?: string;
    end_time?: string;
    reason?: string;
  }) {
    if (data.type === 'CUSTOM_HOURS' && (!data.start_time || !data.end_time)) {
      throw new ValidationError('start_time and end_time required for CUSTOM_HOURS exception');
    }
    return this.repo.createException({
      service_id: data.service_id ?? null,
      date: data.date,
      type: data.type,
      start_time: data.start_time ?? null,
      end_time: data.end_time ?? null,
      reason: data.reason ?? null,
    });
  }

  async removeException(id: string) {
    return this.repo.deleteException(id);
  }

  async computeSlots(
    db: PrismaClient,
    serviceId: string,
    date: Date,
    timezone: string,
  ): Promise<SlotInterval[]> {
    const { Intl: IntlNative } = globalThis;

    const formatter = new IntlNative.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const weekdayStr = parts.find(p => p.type === 'weekday')?.value ?? '';
    const DOW: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
    const dayOfWeek = DOW[weekdayStr] ?? 0;

    const [allRanges, exceptions, existingBookings] = await Promise.all([
      this.repo.findByService(serviceId),
      this.repo.findExceptionsForDate(date, serviceId),
      db.booking.findMany({
        where: {
          service_id: serviceId,
          slot_start: { gte: startOfDay(date, timezone), lt: endOfDay(date, timezone) },
          status: { in: ['PENDING', 'BOOKED'] },
        },
      }),
    ]);

    const dayRanges = allRanges.filter(r => r.day_of_week === dayOfWeek);
    if (dayRanges.length === 0) return [];

    const blockedAll = exceptions.some(e => e.type === 'BLOCKED' && e.service_id === null);
    const blockedService = exceptions.some(e => e.type === 'BLOCKED' && e.service_id === serviceId);
    if (blockedAll || blockedService) return [];

    const customHours = exceptions.find(e => e.type === 'CUSTOM_HOURS');

    const allSlots: SlotInterval[] = [];

    for (const range of dayRanges) {
      const effectiveStart = customHours?.start_time ?? range.start_time;
      const effectiveEnd = customHours?.end_time ?? range.end_time;

      const slots = generateSlots(date, effectiveStart, effectiveEnd, range.slot_duration_minutes, timezone);

      for (const slot of slots) {
        const overlapCount = existingBookings.filter(
          b => b.slot_start.getTime() < slot.end.getTime() && b.slot_end.getTime() > slot.start.getTime(),
        ).length;
        allSlots.push({ ...slot, available: overlapCount < range.capacity });
      }
    }

    // Sort by start time; deduplicate same-start slots (keep the most available)
    allSlots.sort((a, b) => a.start.getTime() - b.start.getTime());

    const deduped: SlotInterval[] = [];
    for (const slot of allSlots) {
      const prev = deduped[deduped.length - 1];
      if (prev && prev.start.getTime() === slot.start.getTime()) {
        // Prefer available over unavailable when two ranges produce the same slot start
        if (slot.available && !prev.available) deduped[deduped.length - 1] = slot;
      } else {
        deduped.push(slot);
      }
    }

    return deduped;
  }
}

function startOfDay(date: Date, timezone: string): Date {
  const str = date.toLocaleDateString('en-CA', { timeZone: timezone });
  return new Date(`${str}T00:00:00`);
}

function endOfDay(date: Date, timezone: string): Date {
  const str = date.toLocaleDateString('en-CA', { timeZone: timezone });
  return new Date(`${str}T23:59:59`);
}

function generateSlots(
  date: Date,
  startTime: string,
  endTime: string,
  durationMinutes: number,
  timezone: string,
): SlotInterval[] {
  const dateStr = date.toLocaleDateString('en-CA', { timeZone: timezone });
  const parseLocal = (t: string) => new Date(`${dateStr}T${t}:00`);

  const start = parseLocal(startTime);
  const end = parseLocal(endTime);
  const slots: SlotInterval[] = [];

  let cursor = start;
  while (cursor.getTime() + durationMinutes * 60_000 <= end.getTime()) {
    const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);
    slots.push({ start: new Date(cursor), end: slotEnd, available: true });
    cursor = slotEnd;
  }

  return slots;
}
