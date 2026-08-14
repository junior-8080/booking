// Mirrors admin-app/src/types/index.ts Brand exactly.
export interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  terms_conditions: string | null;
  whatsapp_number: string | null;
  is_primary: boolean;
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

export interface CountryOption {
  code: string;
  name: string;
  currency: string;
  timezones: string[];
  default_timezone: string;
}
