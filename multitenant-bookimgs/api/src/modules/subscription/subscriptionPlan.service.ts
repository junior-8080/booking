import { prisma } from '../../db/prisma';
import { NotFoundError } from '../../core/AppError';

export interface CreatePlanDto {
  name: string;
  interval: 'MONTHLY' | 'YEARLY';
  amount: number;
  currency: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdatePlanDto {
  name?: string;
  interval?: 'MONTHLY' | 'YEARLY';
  amount?: number;
  currency?: string;
  description?: string;
  is_active?: boolean;
}

export class SubscriptionPlanService {
  async list(activeOnly = false) {
    return prisma.subscriptionPlan.findMany({
      where: activeOnly ? { is_active: true } : undefined,
      orderBy: { created_at: 'asc' },
    });
  }

  async getById(id: string) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundError('SubscriptionPlan');
    return plan;
  }

  async create(dto: CreatePlanDto) {
    return prisma.subscriptionPlan.create({
      data: {
        name:        dto.name,
        interval:    dto.interval,
        amount:      dto.amount,
        currency:    dto.currency,
        description: dto.description ?? null,
        is_active:   dto.is_active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdatePlanDto) {
    await this.getById(id);
    return prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(dto.name        !== undefined && { name:        dto.name        }),
        ...(dto.interval    !== undefined && { interval:    dto.interval    }),
        ...(dto.amount      !== undefined && { amount:      dto.amount      }),
        ...(dto.currency    !== undefined && { currency:    dto.currency    }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.is_active   !== undefined && { is_active:   dto.is_active   }),
      },
    });
  }

  async remove(id: string) {
    await this.getById(id);
    await prisma.subscriptionPlan.delete({ where: { id } });
  }
}
