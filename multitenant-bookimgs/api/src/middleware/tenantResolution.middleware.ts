import { Request, Response, NextFunction } from 'express';
import { prisma, createTenantClient } from '../db/prisma';
import { env } from '../config/env';

// Resolves tenant from subdomain and attaches tenantId + tenant-scoped Prisma to req.
// Rejects with 404 if subdomain not found or tenant is not ACTIVE.
export async function tenantResolutionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const host = req.hostname; // e.g. glow-spa.localhost or glow-spa.app.com

  let subdomain: string | undefined;

  const baseDomain = env.APP_BASE_DOMAIN;

  const isIpHost = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

  if (host.endsWith(`.${baseDomain}`)) {
    // Subdomain of the app domain: glow-spa.bookimgs.app
    subdomain = host.slice(0, -(baseDomain.length + 1));
  } else if (host === baseDomain || host === `www.${baseDomain}` || host === `api.${baseDomain}` || isIpHost) {
    // Root domain, bare localhost, or a LAN IP (phone testing) — header override
    subdomain = req.headers['x-tenant-subdomain'] as string | undefined;
  } else if (host.includes('.')) {
    subdomain = host.split('.')[0];
  } else {
    // Single-label host (e.g. "localhost") — use header override
    subdomain = req.headers['x-tenant-subdomain'] as string | undefined;
  }

  if (!subdomain) {
    res.status(404).json({ success: false, error: 'Tenant not found' });
    return;
  }

  const tenant = await prisma.tenant.findUnique({ where: { subdomain } });

  if (!tenant || tenant.status !== 'ACTIVE') {
    res.status(404).json({ success: false, error: 'Tenant not found' });
    return;
  }

  req.tenantId = tenant.id;
  req.tenant = tenant;
  req.tenantDb = createTenantClient(tenant.id);

  next();
}
