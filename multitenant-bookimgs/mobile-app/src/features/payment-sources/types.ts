export type PaymentSourceType =
  | 'MOBILE_MONEY'
  | 'BANK_TRANSFER'
  | 'ZELLE'
  | 'VENMO'
  | 'CASH_APP'
  | 'PAYPAL'
  | 'CASH'
  | 'OTHER';

export interface PaymentSource {
  id: string;
  type: PaymentSourceType;
  label: string;
  details: Record<string, string>;
  instructions: string | null;
  is_active: boolean;
  display_order: number;
}

export interface PaymentSourceInput {
  type: PaymentSourceType;
  label: string;
  details: Record<string, string>;
  instructions?: string;
}

export const PAYMENT_SOURCE_TYPES: PaymentSourceType[] = [
  'MOBILE_MONEY', 'BANK_TRANSFER', 'ZELLE', 'VENMO', 'CASH_APP', 'PAYPAL', 'CASH', 'OTHER',
];

export const PAYMENT_SOURCE_TYPE_LABELS: Record<PaymentSourceType, string> = {
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Bank Transfer',
  ZELLE: 'Zelle',
  VENMO: 'Venmo',
  CASH_APP: 'Cash App',
  PAYPAL: 'PayPal',
  CASH: 'Cash',
  OTHER: 'Other',
};

// Field key -> display label shown to the tenant while editing.
export const PAYMENT_SOURCE_DETAIL_FIELDS: Record<PaymentSourceType, Array<{ key: string; label: string }>> = {
  MOBILE_MONEY: [
    { key: 'network', label: 'Network' },
    { key: 'number', label: 'Number' },
    { key: 'account_name', label: 'Account name' },
  ],
  BANK_TRANSFER: [
    { key: 'bank_name', label: 'Bank name' },
    { key: 'account_name', label: 'Account name' },
    { key: 'account_number', label: 'Account number' },
    { key: 'routing_number', label: 'Routing number' },
  ],
  ZELLE: [
    { key: 'email_or_phone', label: 'Email or phone' },
    { key: 'account_name', label: 'Account name' },
  ],
  VENMO: [{ key: 'handle', label: 'Handle' }],
  CASH_APP: [{ key: 'cashtag', label: 'Cashtag' }],
  PAYPAL: [{ key: 'email', label: 'Email' }],
  CASH: [],
  OTHER: [{ key: 'description', label: 'Description' }],
};
