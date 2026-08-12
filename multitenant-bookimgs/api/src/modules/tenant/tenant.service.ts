import { prisma as globalPrisma } from '../../db/prisma';
import { NotFoundError } from '../../core/AppError';
import { resolveCountrySettings } from '../../config/countries';

export interface TenantSettingsUpdate {
  name?: string;
  country?: string;
  timezone?: string;
  slot_hold_minutes?: number;
  booking_confirmation_sla_hours?: number;
}

// The tenant model is not tenant-scoped (it has no tenant_id column), so this
// service uses the global client with an explicit id filter.
export class TenantService {
  async getPublicStatus(tenantId: string): Promise<{ is_accepting_bookings: boolean }> {
    const tenant = await globalPrisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundError('Tenant');

    const now = new Date();

    if (tenant.subscription_status === 'TRIALING') {
      return { is_accepting_bookings: !tenant.trial_ends_at || tenant.trial_ends_at > now };
    }
    if (tenant.subscription_status === 'ACTIVE') {
      return { is_accepting_bookings: !tenant.subscription_expires_at || tenant.subscription_expires_at > now };
    }
    return { is_accepting_bookings: false };
  }

  async getSettings(tenantId: string) {
    const tenant = await globalPrisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundError('Tenant');
    return this.toDto(tenant);
  }

  async updateSettings(tenantId: string, update: TenantSettingsUpdate) {
    const tenant = await globalPrisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundError('Tenant');

    // Country change re-derives currency; timezone is validated against the
    // (possibly new) country and falls back to that country's default.
    const country = update.country ?? tenant.country_code;
    const timezone = update.timezone ?? tenant.timezone;
    const countrySettings = resolveCountrySettings(country, timezone);

    const updated = await globalPrisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(update.name !== undefined ? { name: update.name } : {}),
        ...countrySettings,
        ...(update.slot_hold_minutes !== undefined ? { slot_hold_minutes: update.slot_hold_minutes } : {}),
        ...(update.booking_confirmation_sla_hours !== undefined
          ? { booking_confirmation_sla_hours: update.booking_confirmation_sla_hours }
          : {}),
      },
    });
    return this.toDto(updated);
  }

  private toDto(tenant: {
    id: string; name: string; subdomain: string; country_code: string; timezone: string;
    default_currency: string; slot_hold_minutes: number; booking_confirmation_sla_hours: number;
  }) {
    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      country_code: tenant.country_code,
      timezone: tenant.timezone,
      default_currency: tenant.default_currency,
      slot_hold_minutes: tenant.slot_hold_minutes,
      booking_confirmation_sla_hours: tenant.booking_confirmation_sla_hours,
    };
  }
}
