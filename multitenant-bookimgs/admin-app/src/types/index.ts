export interface Brand { id: string; name: string; logo_url: string | null; description: string | null; terms_conditions: string | null; is_primary: boolean; }
export interface Slot { start: string; end: string; available: boolean; }
export interface Service { id: string; brand_id: string; name: string; description: string | null; image_url: string | null; duration_minutes: number; price_amount: number; price_currency: string; deposit_type: 'PERCENTAGE' | 'FIXED'; deposit_value: number; is_active: boolean; brand?: Brand; }
export interface Customer { id: string; full_name: string; email: string | null; phone: string; notes: string | null; }
export interface PaymentSource { id: string; type: string; label: string; details: Record<string, unknown>; instructions: string | null; is_active: boolean; display_order: number; }

export type BookingStatus = 'PENDING' | 'BOOKED' | 'REJECTED';

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  client_reference: string | null;
  proof_url: string | null;
  status: 'AWAITING_REVIEW' | 'CONFIRMED' | 'REJECTED';
  payment_source?: PaymentSource;
}

export interface Booking {
  id: string;
  slot_start: string;
  slot_end: string;
  status: BookingStatus;
  required_amount: number;
  required_currency: string;
  reference_code: string;
  hold_expires_at: string | null;
  client_notes: string | null;
  rejection_reason: string | null;
  confirmed_at: string | null;
  created_at: string;
  service?: Service;
  customer: Customer;
  payments: Payment[];
}

export interface TenantSettings {
  id: string;
  name: string;
  subdomain: string;
  country_code: string;
  timezone: string;
  default_currency: string;
  slot_hold_minutes: number;
  booking_confirmation_sla_hours: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  interval: 'MONTHLY' | 'YEARLY';
  amount: number;
  currency: string;
  description: string | null;
  is_active: boolean;
}

export interface CountryOption {
  code: string;
  name: string;
  currency: string;
  timezones: string[];
  default_timezone: string;
}

export function formatAmount(amount: number, currency: string): string {
  try { return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount / 100); }
  catch { return `${currency} ${(amount / 100).toFixed(2)}`; }
}

export const STATUS_COLORS: Record<BookingStatus, string> = {
  PENDING:  '#f59e0b',
  BOOKED:   '#10b981',
  REJECTED: '#ef4444',
};
