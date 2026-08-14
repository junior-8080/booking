import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient, TenantUserRole } from '@prisma/client';
import { BaseRepository } from '../../core/BaseRepository';
import { createToken } from '../../middleware/auth.middleware';
import { UnauthorizedError, NotFoundError } from '../../core/AppError';
import { prisma as globalPrisma } from '../../db/prisma';

export class AuthService extends BaseRepository {
  constructor(db: PrismaClient) {
    super(db);
  }

  async globalLogin(email: string, password: string) {
    const user = await globalPrisma.tenantUser.findFirst({
      where: { email, status: 'ACTIVE' },
      include: { tenant: { select: { subdomain: true } } },
    });

    if (!user) throw new UnauthorizedError('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    const token = createToken(user.id, user.tenant_id, user.role);

    return {
      token,
      subdomain: user.tenant.subdomain,
      user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
    };
  }

  async login(tenantId: string, email: string, password: string) {
    const user = await this.db.tenantUser.findFirst({
      where: { tenant_id: tenantId, email, status: 'ACTIVE' },
    });

    if (!user) throw new UnauthorizedError('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    const token = createToken(user.id, user.tenant_id, user.role);

    return {
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async createOwner(
    tenantId: string,
    email: string,
    password: string,
    full_name: string,
  ) {
    const existing = await this.db.tenantUser.findFirst({
      where: { tenant_id: tenantId, email },
    });

    if (existing) throw new UnauthorizedError('Email already in use');

    const password_hash = await bcrypt.hash(password, 12);

    const user = await this.db.tenantUser.create({
      data: {
        tenant_id: tenantId,
        email,
        password_hash,
        full_name,
        role: 'TENANT_OWNER',
        status: 'ACTIVE',
      },
    });

    return { id: user.id, email: user.email, full_name: user.full_name, role: user.role };
  }

  async getProfile(userId: string) {
    const user = await this.db.tenantUser.findFirst({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');
    return { id: user.id, full_name: user.full_name, email: user.email, role: user.role, permissions: user.permissions };
  }

  // App Store / Play Store require an in-app account deletion path. A
  // TENANT_OWNER's account is the business's only control panel, so deleting
  // it also suspends the tenant (blocks the public booking page and every
  // other login) rather than leaving an unmanageable business running —
  // TENANT_STAFF deletion only disables that one seat. Existing bookings/
  // payments/customers are retained (not erased) as business records; PII
  // on the user row itself is scrubbed and login is permanently blocked.
  async deleteAccount(userId: string, tenantId: string, role: TenantUserRole): Promise<void> {
    const user = await this.db.tenantUser.findFirst({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    const anonymizedEmail = `deleted-${userId}@deleted.bookaata.app`;
    const unusablePasswordHash = await bcrypt.hash(crypto.randomUUID(), 12);

    await this.db.$transaction([
      this.db.tenantUser.update({
        where: { id: userId },
        data: {
          status: 'DISABLED',
          email: anonymizedEmail,
          full_name: 'Deleted user',
          password_hash: unusablePasswordHash,
        },
      }),
      this.db.pushToken.deleteMany({ where: { tenant_user_id: userId } }),
    ]);

    if (role === 'TENANT_OWNER') {
      await globalPrisma.tenant.update({ where: { id: tenantId }, data: { status: 'SUSPENDED' } });
    }
  }
}
