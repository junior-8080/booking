import countriesData from './countries.json';

// Supported countries. Currency is always derived server-side from the country —
// clients can never set it directly. Data lives in countries.json — the single
// source of truth served to web/mobile via GET /api/countries, not duplicated
// in either client.
export interface CountryConfig {
  name: string;
  currency: string;
  timezones: string[];
  defaultTimezone: string;
}

export const COUNTRIES: Record<string, CountryConfig> = countriesData;

export const COUNTRY_CODES = Object.keys(COUNTRIES) as [string, ...string[]];

export function resolveCountrySettings(countryCode: string, timezone?: string) {
  const config = COUNTRIES[countryCode];
  if (!config) throw new Error(`Unsupported country: ${countryCode}`);
  return {
    country_code: countryCode,
    default_currency: config.currency,
    timezone: timezone && config.timezones.includes(timezone) ? timezone : config.defaultTimezone,
  };
}
