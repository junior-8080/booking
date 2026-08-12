// Supported countries. Currency is always derived server-side from the country —
// clients can never set it directly.
export interface CountryConfig {
  name: string;
  currency: string;
  timezones: string[];
  defaultTimezone: string;
}

export const COUNTRIES: Record<string, CountryConfig> = {
  US: {
    name: 'United States',
    currency: 'USD',
    timezones: [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Phoenix',
      'America/Los_Angeles',
      'America/Anchorage',
      'Pacific/Honolulu',
    ],
    defaultTimezone: 'America/New_York',
  },
  GH: {
    name: 'Ghana',
    currency: 'GHS',
    timezones: ['Africa/Accra'],
    defaultTimezone: 'Africa/Accra',
  },
  GB: {
    name: 'United Kingdom',
    currency: 'GBP',
    timezones: ['Europe/London'],
    defaultTimezone: 'Europe/London',
  },
};

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
