// Mirrors admin-app/src/types/index.ts exactly — same shapes the API returns.
export type BookingStatus = 'PENDING' | 'BOOKED' | 'REJECTED';

export interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_amount: number;
  price_currency: string;
}

export interface Customer {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  notes: string | null;
}

export interface PaymentSource {
  id: string;
  type: string;
  label: string;
  details: Record<string, unknown>;
  instructions: string | null;
}

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
