// Mirrors admin-app/src/types/index.ts Service exactly.
export type DepositType = 'PERCENTAGE' | 'FIXED';

export interface Service {
  id: string;
  brand_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  duration_minutes: number;
  price_amount: number;
  price_currency: string;
  deposit_type: DepositType;
  deposit_value: number;
  is_active: boolean;
}

export interface ServiceInput {
  brand_id: string;
  name: string;
  description?: string;
  image_url?: string | null;
  duration_minutes: number;
  price_amount: number;
  price_currency: string;
  deposit_type: DepositType;
  deposit_value: number;
  is_active?: boolean;
}
