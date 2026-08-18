import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError, ForbiddenError } from '../core/AppError';
import { TenantUserRole } from '@prisma/client';

interface JwtPayload {
  sub: string;       // TenantUser.id
  tenantId: string;
  role: TenantUserRole;
  iat: number;
  exp: number;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }

  const token = header.slice(7);
  let payload: JwtPayload;

  try {
    payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }

  if (payload.tenantId !== req.tenantId) {
    throw new ForbiddenError('Token does not belong to this tenant');
  }

  // Re-checked on every request instead of trusting the JWT for its full
  // lifetime (up to 30d) — otherwise a deleted/disabled account, or a role
  // downgrade, stays in effect until the token naturally expires.
  const user = await req.tenantDb.tenantUser.findFirst({
    where: { id: payload.sub },
    select: { id: true, tenant_id: true, role: true, status: true },
  });
  if (!user || user.status !== 'ACTIVE') {
    throw new UnauthorizedError('Account is no longer active');
  }

  // Lazy partial — only id/tenant_id/role are used downstream; type is satisfied via cast
  req.tenantUser = {
    id: user.id,
    tenant_id: user.tenant_id,
    role: user.role,
  } as import('@prisma/client').TenantUser;

  next();
}

// Gates internal-only routes (e.g. subscription admin CRUD) that have no
// tenant JWT to check because they run before tenant resolution and aren't
// called by any tenant-facing client.
export function requireInternalApiKey(req: Request, _res: Response, next: NextFunction): void {
  const key = req.headers['x-internal-api-key'];
  if (!env.INTERNAL_API_KEY || key !== env.INTERNAL_API_KEY) {
    throw new UnauthorizedError('Invalid or missing internal API key');
  }
  next();
}

export function requireRole(...roles: TenantUserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.tenantUser || !roles.includes(req.tenantUser.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
    next();
  };
}

export function createToken(userId: string, tenantId: string, role: TenantUserRole): string {
  // expiresIn cast needed because @types/jsonwebtoken expects StringValue from ms package
  return jwt.sign({ sub: userId, tenantId, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as unknown as number,
  });
}
