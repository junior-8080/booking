export interface SubscriptionPlan {
  id: string;
  name: string;
  interval: 'MONTHLY' | 'YEARLY';
  amount: number;
  currency: string;
  description: string | null;
  is_active: boolean;
}
