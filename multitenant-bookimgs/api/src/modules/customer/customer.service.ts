import { PrismaClient, Customer } from '@prisma/client';
import { BaseRepository } from '../../core/BaseRepository';
import { NotFoundError } from '../../core/AppError';

export class CustomerService extends BaseRepository {
  constructor(db: PrismaClient) {
    super(db);
  }

  async findOrCreate(data: { full_name: string; phone: string; email?: string }): Promise<Customer> {
    const existing = await this.db.customer.findFirst({ where: { phone: data.phone } });
    if (existing) return existing;

    return this.db.customer.create({
      data: {
        full_name: data.full_name,
        phone: data.phone,
        email: data.email ?? null,
      },
    } as Parameters<typeof this.db.customer.create>[0]);
  }

  async findAll(search?: string): Promise<Customer[]> {
    return this.db.customer.findMany({
      where: search
        ? {
            OR: [
              { full_name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: { full_name: 'asc' },
    });
  }

  async findById(id: string): Promise<Customer> {
    const c = await this.db.customer.findFirst({ where: { id } });
    if (!c) throw new NotFoundError('Customer');
    return c;
  }

  async getHistory(customerId: string) {
    return this.db.booking.findMany({
      where: { customer_id: customerId },
      include: { service: true, payments: true },
      orderBy: { slot_start: 'desc' },
    });
  }

  async updateNotes(id: string, notes: string): Promise<Customer> {
    await this.findById(id);
    return this.db.customer.update({ where: { id }, data: { notes } });
  }
}
