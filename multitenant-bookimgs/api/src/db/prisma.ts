import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Singleton to avoid multiple connections in dev (hot reload)
export const prisma = global.__prisma ?? new PrismaClient({ log: ['error', 'warn'] });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// ─── Tenant-scoped Prisma factory ─────────────────────────────────────────────
// Returns a Prisma client extended with an automatic tenant_id filter on every
// query against a tenant-owned model. Handlers must NEVER filter by tenant_id
// manually — this middleware is the systemic safeguard.
const TENANT_SCOPED_MODELS = new Set([
  'brand',
  'tenantUser',
  'customer',
  'service',
  'availability',
  'availabilityException',
  'paymentSource',
  'booking',
  'payment',
  'notification',
]);

export function createTenantClient(tenantId: string): PrismaClient {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const modelLower = model ? model.charAt(0).toLowerCase() + model.slice(1) : '';
          if (model && TENANT_SCOPED_MODELS.has(modelLower)) {
            const writeOps = ['create', 'createMany', 'upsert'];
            const readOps = ['findFirst', 'findFirstOrThrow', 'findMany', 'findUnique', 'findUniqueOrThrow', 'count', 'aggregate', 'groupBy'];
            const mutateOps = ['update', 'updateMany', 'delete', 'deleteMany', 'upsert'];

            if (writeOps.includes(operation) && operation !== 'upsert') {
              // Inject tenant_id into data on create
              const a = args as Record<string, unknown>;
              if (a.data && typeof a.data === 'object' && !Array.isArray(a.data)) {
                (a.data as Record<string, unknown>).tenant_id = tenantId;
              }
              if (operation === 'createMany' && a.data && Array.isArray(a.data)) {
                (a.data as Array<Record<string, unknown>>).forEach(d => (d.tenant_id = tenantId));
              }
            }

            if (readOps.includes(operation) || mutateOps.includes(operation)) {
              const a = args as Record<string, unknown>;
              a.where = { ...(a.where as Record<string, unknown> | undefined), tenant_id: tenantId };
            }
          }
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
}
