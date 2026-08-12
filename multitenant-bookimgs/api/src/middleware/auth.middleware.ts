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

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
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

  // Lazy partial — only id/tenant_id/role are used downstream; type is satisfied via cast
  req.tenantUser = {
    id: payload.sub,
    tenant_id: payload.tenantId,
    role: payload.role,
  } as import('@prisma/client').TenantUser;

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
