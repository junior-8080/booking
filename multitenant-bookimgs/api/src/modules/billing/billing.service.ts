import crypto from 'crypto';
import { prisma } from '../../db/prisma';
import { env } from '../../config/env';
import { AppError } from '../../core/AppError';
import { SubscriptionService } from '../subscription/subscription.service';

const PAYSTACK_BASE = 'https://api.paystack.co';

const PLAN_CONFIG = {
  MONTHLY: { amountPesewas: 40 * 100,  currency: 'GHS' },
  YEARLY:  { amountPesewas: 400 * 100, currency: 'GHS' },
} as const;

type Plan = 'MONTHLY' | 'YEARLY';

const subscriptionService = new SubscriptionService();

async function paystackPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { status: boolean; message: string; data: T };
  if (!json.status) throw new AppError(json.message ?? 'Paystack error', 502, 'PAYSTACK_ERROR');
  return json.data;
}

export class BillingService {
  async getStatus(tenantId: string) {
    let tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

    // Lazy expiry: flip ACTIVE → PAST_DUE if subscription window has passed
    if (
      tenant.subscription_status === 'ACTIVE' &&
      tenant.subscription_expires_at != null &&
      tenant.subscription_expires_at < new Date()
    ) {
      tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: { subscription_status: 'PAST_DUE' },
      });
    }

    const isTrialExpired =
      tenant.subscription_status === 'TRIALING' &&
      tenant.trial_ends_at != null &&
      tenant.trial_ends_at < new Date();

    // Include latest subscription record for plan info
    const latestSubscription = await prisma.subscription.findFirst({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });

    return {
      subscription_status: tenant.subscription_status,
      trial_ends_at: tenant.trial_ends_at,
      subscription_expires_at: tenant.subscription_expires_at,
      is_trial_expired: isTrialExpired,
      needs_payment:
        isTrialExpired ||
        tenant.subscription_status === 'PAST_DUE' ||
        tenant.subscription_status === 'CANCELLED',
      current_plan: latestSubscription?.plan ?? null,
    };
  }

  async initializePayment(tenantId: string, email: string, plan: Plan): Promise<{ checkout_url: string }> {
    if (!env.PAYSTACK_SECRET_KEY) {
      throw new AppError('Paystack not configured', 500, 'PAYSTACK_NOT_CONFIGURED');
    }

    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const { amountPesewas, currency } = PLAN_CONFIG[plan];

    const tx = await paystackPost<{ authorization_url: string }>('/transaction/initialize', {
      email,
      amount: amountPesewas,
      currency,
      callback_url: env.BILLING_CALLBACK_URL ?? `https://${env.APP_BASE_DOMAIN}/billing`,
      metadata: {
        purpose: 'subscription',
        tenant_id: tenantId,
        subdomain: tenant.subdomain,
        plan,
      },
    });

    return { checkout_url: tx.authorization_url };
  }

  async verifyAndActivate(tenantId: string, reference: string): Promise<void> {
    if (!env.PAYSTACK_SECRET_KEY) return;

    // Idempotency: skip if already processed
    const existing = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { paystack_subscription_code: true },
    });
    if (existing?.paystack_subscription_code === reference) return;

    const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
    });
    const json = (await res.json()) as {
      status: boolean;
      data: {
        status: string;
        amount: number;
        currency: string;
        metadata?: { purpose?: string; tenant_id?: string; plan?: string };
      };
    };

    if (!json.status || json.data.status !== 'success') {
      throw new AppError('Payment not successful', 400, 'PAYMENT_NOT_SUCCESS');
    }

    const { purpose, tenant_id, plan } = json.data.metadata ?? {};
    if (purpose !== 'subscription' || tenant_id !== tenantId) {
      throw new AppError('Invalid payment reference', 400, 'INVALID_REFERENCE');
    }

    const resolvedPlan: Plan = plan === 'YEARLY' ? 'YEARLY' : 'MONTHLY';

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { paystack_subscription_code: reference },
    });

    await this.activateSubscription(tenantId, resolvedPlan, json.data.amount, json.data.currency);
  }

  private async activateSubscription(tenantId: string, plan: Plan, amount: number, currency: string): Promise<void> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return;

    // Creates the Subscription record and syncs the tenant's subscription_status + expires_at
    await subscriptionService.create({
      tenant_id: tenantId,
      plan,
      amount,
      currency,
    });
  }

  async handleWebhook(rawBody: string, signature: string): Promise<void> {
    if (!env.PAYSTACK_SECRET_KEY) return;

    const expected = crypto
      .createHmac('sha512', env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest('hex');

    if (expected !== signature) {
      throw new AppError('Invalid webhook signature', 401, 'INVALID_SIGNATURE');
    }

    const event = JSON.parse(rawBody) as {
      event: string;
      data: {
        amount: number;
        currency: string;
        reference?: string;
        status?: string;
        metadata?: { purpose?: string; tenant_id?: string; plan?: string };
      };
    };

    if (event.event !== 'charge.success') return;

    const { purpose, tenant_id, plan } = event.data.metadata ?? {};
    if (purpose !== 'subscription' || !tenant_id) return;

    const ref = event.data.reference;
    if (ref) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenant_id },
        select: { paystack_subscription_code: true },
      });
      if (tenant?.paystack_subscription_code === ref) return;
      await prisma.tenant.update({
        where: { id: tenant_id },
        data: { paystack_subscription_code: ref },
      });
    }

    const resolvedPlan: Plan = plan === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
    await this.activateSubscription(tenant_id, resolvedPlan, event.data.amount, event.data.currency);
  }
}
