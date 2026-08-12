import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import { ValidationError } from '../core/AppError';

// Normalizes any phone input ("0244123456", "024 412 3456", "+233244123456")
// to E.164 ("+233244123456"). Local-format numbers are interpreted against
// defaultCountry (the tenant's country). E.164 is required for SMS delivery
// and keeps customer dedup (tenant_id + phone) consistent across formats.
export function normalizePhone(raw: string, defaultCountry: string): string {
  const parsed = parsePhoneNumberFromString(raw.trim(), defaultCountry as CountryCode);
  if (!parsed || !parsed.isValid()) {
    throw new ValidationError('Please enter a valid phone number, e.g. +233 24 412 3456 or +1 555 000 0000');
  }
  return parsed.number;
}
