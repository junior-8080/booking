import { apiRequest } from '@/lib/api-client';
import { SubscriptionPlan } from '@/features/billing/types';

export interface BillingStatus {
  subscription_status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  trial_ends_at: string | null;
  subscription_expires_at: string | null;
  is_trial_expired: boolean;
  needs_payment: boolean;
  current_plan: 'MONTHLY' | 'YEARLY' | null;
}

export function getBillingStatus(): Promise<BillingStatus> {
  return apiRequest<BillingStatus>('/billing/status');
}

export function listSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return apiRequest<SubscriptionPlan[]>('/subscription-plans?active=true');
}

export function initializePayment(email: string, plan: 'MONTHLY' | 'YEARLY', callbackUrl: string): Promise<{ checkout_url: string }> {
  return apiRequest<{ checkout_url: string }>('/billing/pay', {
    method: 'POST',
    body: JSON.stringify({ email, plan, callback_url: callbackUrl }),
  });
}

export function verifyPayment(reference: string): Promise<{ activated: boolean }> {
  return apiRequest<{ activated: boolean }>('/billing/verify', { method: 'POST', body: JSON.stringify({ reference }) });
}
