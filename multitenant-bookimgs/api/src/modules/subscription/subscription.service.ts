import { PlanInterval } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { NotFoundError } from '../../core/AppError';

const PLAN_DAYS = { MONTHLY: 30, YEARLY: 365 } as const;

export interface CreateSubscriptionDto {
  tenant_id: string;
  plan: PlanInterval;
  amount: number;
  currency: string;
  starts_at?: string;
  reference?: string;
  notes?: string;
}

export interface UpdateSubscriptionDto {
  plan?: PlanInterval;
  status?: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  expires_at?: string;
  amount?: number;
  currency?: string;
  reference?: string;
  notes?: string;
}

export class SubscriptionService {
  async listByTenant(tenantId: string) {
    await this.assertTenantExists(tenantId);
    return prisma.subscription.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
  }

  async getById(id: string) {
    const sub = await prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundError('Subscription');
    return sub;
  }

  async create(dto: CreateSubscriptionDto) {
    await this.assertTenantExists(dto.tenant_id);

    const startsAt = dto.starts_at ? new Date(dto.starts_at) : new Date();
    const expiresAt = new Date(startsAt);
    expiresAt.setDate(expiresAt.getDate() + PLAN_DAYS[dto.plan]);

    const sub = await prisma.subscription.create({
      data: {
        tenant_id: dto.tenant_id,
        plan: dto.plan,
        status: 'ACTIVE',
        starts_at: startsAt,
        expires_at: expiresAt,
        amount: dto.amount,
        currency: dto.currency,
        reference: dto.reference ?? null,
        notes: dto.notes ?? null,
      },
    });

    // Keep the tenant's top-level subscription fields in sync
    await prisma.tenant.update({
      where: { id: dto.tenant_id },
      data: {
        subscription_status: 'ACTIVE',
        subscription_expires_at: expiresAt,
        trial_ends_at: null,
      },
    });

    return sub;
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    const sub = await this.getById(id);

    // Recompute expires_at when plan changes but no explicit expires_at given
    let expiresAt: Date | undefined;
    if (dto.expires_at) {
      expiresAt = new Date(dto.expires_at);
    } else if (dto.plan && dto.plan !== sub.plan) {
      expiresAt = new Date(sub.starts_at);
      expiresAt.setDate(expiresAt.getDate() + PLAN_DAYS[dto.plan]);
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        ...(dto.plan       !== undefined && { plan: dto.plan }),
        ...(dto.status     !== undefined && { status: dto.status }),
        ...(dto.amount     !== undefined && { amount: dto.amount }),
        ...(dto.currency   !== undefined && { currency: dto.currency }),
        ...(dto.reference  !== undefined && { reference: dto.reference }),
        ...(dto.notes      !== undefined && { notes: dto.notes }),
        ...(expiresAt      !== undefined && { expires_at: expiresAt }),
      },
    });

    // Sync tenant status when status or expiry changes
    if (dto.status || expiresAt) {
      await prisma.tenant.update({
        where: { id: sub.tenant_id },
        data: {
          ...(dto.status && { subscription_status: dto.status }),
          ...(expiresAt  && { subscription_expires_at: expiresAt }),
        },
      });
    }

    return updated;
  }

  async cancel(id: string) {
    const sub = await this.getById(id);

    const cancelled = await prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await prisma.tenant.update({
      where: { id: sub.tenant_id },
      data: { subscription_status: 'CANCELLED' },
    });

    return cancelled;
  }

  private async assertTenantExists(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundError('Tenant');
  }
}
