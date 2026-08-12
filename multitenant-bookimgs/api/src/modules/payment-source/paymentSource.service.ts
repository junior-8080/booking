import { PrismaClient, PaymentSource, PaymentSourceType } from '@prisma/client';
import { BaseRepository } from '../../core/BaseRepository';
import { NotFoundError } from '../../core/AppError';

interface CreatePaymentSourceDTO {
  type: PaymentSourceType;
  label: string;
  details: Record<string, unknown>;
  instructions?: string;
  display_order?: number;
}

export class PaymentSourceService extends BaseRepository {
  constructor(db: PrismaClient) {
    super(db);
  }

  async list(): Promise<PaymentSource[]> {
    return this.db.paymentSource.findMany({
      where: { is_active: true },
      orderBy: { display_order: 'asc' },
    });
  }

  async listAll(): Promise<PaymentSource[]> {
    return this.db.paymentSource.findMany({ orderBy: { display_order: 'asc' } });
  }

  async create(data: CreatePaymentSourceDTO): Promise<PaymentSource> {
    return this.db.paymentSource.create({
      data: {
        type: data.type,
        label: data.label,
        details: data.details,
        instructions: data.instructions ?? null,
        display_order: data.display_order ?? 0,
        is_active: true,
      },
    } as Parameters<typeof this.db.paymentSource.create>[0]);
  }

  async update(id: string, data: Partial<CreatePaymentSourceDTO> & { is_active?: boolean }): Promise<PaymentSource> {
    await this.findById(id);
    const { details, ...rest } = data;
    return this.db.paymentSource.update({
      where: { id },
      data: { ...rest, ...(details ? { details: details as import('@prisma/client').Prisma.InputJsonValue } : {}) },
    });
  }

  async reorder(orderedIds: string[]): Promise<void> {
    await Promise.all(
      orderedIds.map((id, index) =>
        this.db.paymentSource.update({ where: { id }, data: { display_order: index } }),
      ),
    );
  }

  async toggleActive(id: string): Promise<PaymentSource> {
    const ps = await this.findById(id);
    return this.db.paymentSource.update({ where: { id }, data: { is_active: !ps.is_active } });
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.db.paymentSource.delete({ where: { id } });
  }

  private async findById(id: string): Promise<PaymentSource> {
    const ps = await this.db.paymentSource.findFirst({ where: { id } });
    if (!ps) throw new NotFoundError('PaymentSource');
    return ps;
  }
}
