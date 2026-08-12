import { Tenant, TenantUser } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      tenantId: string;
      tenant: Tenant;
      tenantDb: PrismaClient; // tenant-scoped Prisma client
      tenantUser?: TenantUser; // set by auth middleware on protected routes
    }
  }
}
