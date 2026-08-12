import { PrismaClient, Availability, AvailabilityException } from '@prisma/client';
import { BaseRepository } from '../../core/BaseRepository';
import { NotFoundError } from '../../core/AppError';

export class AvailabilityRepository extends BaseRepository {
  constructor(db: PrismaClient) {
    super(db);
  }

  async findByService(serviceId: string): Promise<Availability[]> {
    return this.db.availability.findMany({
      where: { service_id: serviceId },
      orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }],
    });
  }

  async createRange(
    serviceId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    slotDurationMinutes: number,
    capacity: number,
  ): Promise<Availability> {
    return this.db.availability.create({
      data: {
        service_id: serviceId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        slot_duration_minutes: slotDurationMinutes,
        capacity,
      },
    } as Parameters<typeof this.db.availability.create>[0]);
  }

  async updateRange(
    id: string,
    data: { start_time?: string; end_time?: string; slot_duration_minutes?: number; capacity?: number },
  ): Promise<Availability> {
    const existing = await this.db.availability.findFirst({ where: { id } });
    if (!existing) throw new NotFoundError('Availability');
    return this.db.availability.update({ where: { id }, data });
  }

  async deleteRange(id: string): Promise<void> {
    const existing = await this.db.availability.findFirst({ where: { id } });
    if (!existing) throw new NotFoundError('Availability');
    await this.db.availability.delete({ where: { id } });
  }

  async deleteRangesForDay(serviceId: string, dayOfWeek: number): Promise<void> {
    await this.db.availability.deleteMany({ where: { service_id: serviceId, day_of_week: dayOfWeek } });
  }

  // Exceptions
  async findExceptionsByService(serviceId: string, from?: Date, to?: Date): Promise<AvailabilityException[]> {
    return this.db.availabilityException.findMany({
      where: {
        service_id: serviceId,
        ...(from && to ? { date: { gte: from, lte: to } } : {}),
      },
      orderBy: { date: 'asc' },
    });
  }

  async findExceptionsForDate(date: Date, serviceId?: string): Promise<AvailabilityException[]> {
    return this.db.availabilityException.findMany({
      where: {
        date,
        OR: [{ service_id: null }, { service_id: serviceId }],
      },
    });
  }

  async createException(data: Omit<AvailabilityException, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<AvailabilityException> {
    return this.db.availabilityException.create({ data } as Parameters<typeof this.db.availabilityException.create>[0]);
  }

  async deleteException(id: string): Promise<void> {
    const ex = await this.db.availabilityException.findFirst({ where: { id } });
    if (!ex) throw new NotFoundError('AvailabilityException');
    await this.db.availabilityException.delete({ where: { id } });
  }
}
