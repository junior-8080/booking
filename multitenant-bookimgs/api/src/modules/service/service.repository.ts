import { PrismaClient, Service } from '@prisma/client';
import { BaseRepository } from '../../core/BaseRepository';
import { NotFoundError } from '../../core/AppError';

export class ServiceRepository extends BaseRepository {
  constructor(db: PrismaClient) {
    super(db);
  }

  async findAll(includeInactive = false): Promise<Service[]> {
    return this.db.service.findMany({
      where: includeInactive ? {} : { is_active: true },
      include: { brand: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<Service> {
    const service = await this.db.service.findFirst({ where: { id } });
    if (!service) throw new NotFoundError('Service');
    return service;
  }

  async create(data: Omit<Service, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<Service> {
    return this.db.service.create({ data } as Parameters<typeof this.db.service.create>[0]);
  }

  async update(id: string, data: Partial<Service>): Promise<Service> {
    await this.findById(id); // throws if not found
    return this.db.service.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.db.service.update({ where: { id }, data: { is_active: false } });
  }
}
