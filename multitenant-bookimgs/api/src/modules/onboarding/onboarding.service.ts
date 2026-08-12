import bcrypt from 'bcryptjs';
import { prisma as globalPrisma } from '../../db/prisma';
import { createToken } from '../../middleware/auth.middleware';
import { ConflictError } from '../../core/AppError';
import { resolveCountrySettings } from '../../config/countries';
import { normalizePhone } from '../../utils/phone';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48);
}

async function uniqueSubdomain(base: string): Promise<string> {
  let candidate = base;
  let attempt = 1;
  while (true) {
    const existing = await globalPrisma.tenant.findUnique({ where: { subdomain: candidate } });
    if (!existing) return candidate;
    attempt++;
    candidate = `${base}-${attempt}`;
  }
}

export interface RegisterInput {
  business_name: string;
  logo_url?: string;
  description?: string;
  email: string;
  password: string;
  owner_name: string;
  owner_phone: string;
  country: string;
  timezone?: string;
}

export class OnboardingService {
  async register(input: RegisterInput) {
    const { business_name, logo_url, description, email, password, owner_name, country, timezone } = input;
    const countrySettings = resolveCountrySettings(country, timezone);
    const owner_phone = normalizePhone(input.owner_phone, country);

    const base = slugify(business_name);
    if (!base) throw new ConflictError('Business name could not be converted to a valid subdomain');

    const subdomain = await uniqueSubdomain(base);

    const emailExists = await globalPrisma.tenantUser.findFirst({ where: { email } });
    if (emailExists) throw new ConflictError('An account with this email already exists');

    const password_hash = await bcrypt.hash(password, 12);

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const { tenant, user } = await globalPrisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: business_name,
          subdomain,
          ...countrySettings,
          status: 'ACTIVE',
          subscription_status: 'TRIALING',
          trial_ends_at: trialEndsAt,
          settings: { owner_phone: owner_phone },
        },
      });

      await tx.brand.create({
        data: {
          tenant_id: tenant.id,
          name: business_name,
          logo_url: logo_url ?? null,
          description: description ?? null,
          is_primary: true,
        },
      });

      const user = await tx.tenantUser.create({
        data: {
          tenant_id: tenant.id,
          email,
          password_hash,
          full_name: owner_name,
          role: 'TENANT_OWNER',
          status: 'ACTIVE',
        },
      });

      return { tenant, user };
    });

    const token = createToken(user.id, tenant.id, user.role);

    return {
      token,
      subdomain: tenant.subdomain,
      user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
    };
  }
}
