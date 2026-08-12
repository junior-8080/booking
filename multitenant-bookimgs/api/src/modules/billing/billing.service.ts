import crypto from 'crypto';
import { prisma } from '../../db/prisma';
import { env } from '../../config/env';
import { AppError } from '../../core/AppError';

const PAYSTACK_BASE = 'https://api.paystack.co';
const SUBSCRIPTION_AMOUNT_PESEWAS = 40 * 100; // GHS 40 = 4000 pesewas
const SUBSCRIPTION_DAYS = 30;

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

    return {
      subscription_status: tenant.subscription_status,
      trial_ends_at: tenant.trial_ends_at,
      subscription_expires_at: tenant.subscription_expires_at,
      is_trial_expired: isTrialExpired,
      needs_payment:
        isTrialExpired ||
        tenant.subscription_status === 'PAST_DUE' ||
        tenant.subscription_status === 'CANCELLED',
    };
  }

  async initializePayment(tenantId: string, email: string): Promise<{ checkout_url: string }> {
    if (!env.PAYSTACK_SECRET_KEY) {
      throw new AppError('Paystack not configured', 500, 'PAYSTACK_NOT_CONFIGURED');
    }

    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

    // One-time transaction — works with MoMo, card, bank transfer
    const tx = await paystackPost<{ authorization_url: string }>('/transaction/initialize', {
      email,
      amount: SUBSCRIPTION_AMOUNT_PESEWAS,
      currency: 'GHS',
      callback_url: env.BILLING_CALLBACK_URL ?? `https://${env.APP_BASE_DOMAIN}/billing`,
      metadata: {
        purpose: 'subscription',
        tenant_id: tenantId,
        subdomain: tenant.subdomain,
      },
    });

    return { checkout_url: tx.authorization_url };
  }

  async verifyAndActivate(tenantId: string, reference: string): Promise<void> {
    if (!env.PAYSTACK_SECRET_KEY) return;

    // Idempotency: skip if this reference was already processed
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
      data: { status: string; metadata?: { purpose?: string; tenant_id?: string } };
    };

    if (!json.status || json.data.status !== 'success') {
      throw new AppError('Payment not successful', 400, 'PAYMENT_NOT_SUCCESS');
    }

    const { purpose, tenant_id } = json.data.metadata ?? {};
    if (purpose !== 'subscription' || tenant_id !== tenantId) {
      throw new AppError('Invalid payment reference', 400, 'INVALID_REFERENCE');
    }

    // Record reference before activating so concurrent webhook calls are deduplicated
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { paystack_subscription_code: reference },
    });

    await this.activateSubscription(tenantId);
  }

  private async activateSubscription(tenantId: string): Promise<void> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return;

    const base =
      tenant.subscription_expires_at && tenant.subscription_expires_at > new Date()
        ? tenant.subscription_expires_at
        : new Date();

    const expiresAt = new Date(base);
    expiresAt.setDate(expiresAt.getDate() + SUBSCRIPTION_DAYS);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { subscription_status: 'ACTIVE', subscription_expires_at: expiresAt, trial_ends_at: null },
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
        metadata?: { purpose?: string; tenant_id?: string };
        reference?: string;
        status?: string;
      };
    };

    if (event.event !== 'charge.success') return;

    const { purpose, tenant_id } = event.data.metadata ?? {};
    if (purpose !== 'subscription' || !tenant_id) return;

    // Idempotency: skip if this reference was already processed by verifyAndActivate or a prior webhook
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

    await this.activateSubscription(tenant_id);
  }
}
