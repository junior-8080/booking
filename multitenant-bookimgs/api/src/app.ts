import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env';
import { tenantResolutionMiddleware } from './middleware/tenantResolution.middleware';
import { errorHandlerMiddleware } from './middleware/errorHandler.middleware';

import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { BrandController } from './modules/brand/brand.controller';
import { BrandService } from './modules/brand/brand.service';
import { ServiceController } from './modules/service/service.controller';
import { ServiceService } from './modules/service/service.service';
import { AvailabilityController } from './modules/availability/availability.controller';
import { AvailabilityService } from './modules/availability/availability.service';
import { CustomerController } from './modules/customer/customer.controller';
import { CustomerService } from './modules/customer/customer.service';
import { BookingController } from './modules/booking/booking.controller';
import { BookingService } from './modules/booking/booking.service';
import { PaymentSourceController } from './modules/payment-source/paymentSource.controller';
import { PaymentSourceService } from './modules/payment-source/paymentSource.service';
import { AnalyticsController } from './modules/analytics/analytics.controller';
import { AnalyticsService } from './modules/analytics/analytics.service';
import { OnboardingController } from './modules/onboarding/onboarding.controller';
import { OnboardingService } from './modules/onboarding/onboarding.service';
import { UploadController } from './modules/upload/upload.controller';
import { TenantController } from './modules/tenant/tenant.controller';
import { TenantService } from './modules/tenant/tenant.service';

export function createApp() {
  const app = express();

  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);

  const isAllowedOrigin = (origin: string): boolean => {
    if (allowedOrigins.includes(origin)) return true;
    // Tenant booking pages live on subdomains of the base domain
    try {
      const { hostname } = new URL(origin);
      return hostname === env.APP_BASE_DOMAIN || hostname.endsWith(`.${env.APP_BASE_DOMAIN}`);
    } catch {
      return false;
    }
  };

  // Global middleware
  app.use(helmet());
  app.use(cors({
    // No Origin header (curl, server-to-server, health checks) passes through
    origin: (origin, callback) => callback(null, !origin || isAllowedOrigin(origin)),
    credentials: true,
  }));
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));

  // Health check — no tenant required
  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Onboarding — no tenant required (creates a new tenant)
  app.use('/api/onboarding', (req, res, next) => {
    const ctrl = new OnboardingController(new OnboardingService());
    ctrl.router(req, res, next);
  });

  // Upload presign — no tenant required; open to both public and admin callers
  app.use('/api/upload', (req, res, next) => {
    const ctrl = new UploadController();
    ctrl.router(req, res, next);
  });

  // Global login — no tenant required; looks up tenant by email.
  // Mounted as a direct route (not app.use) to avoid Express stripping the
  // /global-login segment before the controller's router sees it.
  app.use('/api/auth/global-login', (req, res, next) => {
    req.url = '/global-login';
    const ctrl = new AuthController(new AuthService(undefined as never));
    ctrl.router(req, res, next);
  });

  // All routes below require tenant resolution
  app.use(tenantResolutionMiddleware);

  // ── Route registration ───────────────────────────────────────────────────────
  // Services are instantiated per request via tenantDb; controllers receive
  // the service factory and resolve db from req inside the handler.
  //
  // Pattern: controller constructor receives a factory fn so the tenant-scoped
  // Prisma client from req.tenantDb is used for every query.

  app.use('/api/auth', (req, res, next) => {
    const ctrl = new AuthController(new AuthService(req.tenantDb));
    ctrl.router(req, res, next);
  });

  app.use('/api/brands', (req, res, next) => {
    const ctrl = new BrandController(new BrandService(req.tenantDb));
    ctrl.router(req, res, next);
  });

  app.use('/api/services', (req, res, next) => {
    const ctrl = new ServiceController(new ServiceService(req.tenantDb));
    ctrl.router(req, res, next);
  });

  app.use('/api/availability', (req, res, next) => {
    const ctrl = new AvailabilityController(new AvailabilityService(req.tenantDb));
    ctrl.router(req, res, next);
  });

  app.use('/api/customers', (req, res, next) => {
    const ctrl = new CustomerController(new CustomerService(req.tenantDb));
    ctrl.router(req, res, next);
  });

  app.use('/api/bookings', (req, res, next) => {
    const ctrl = new BookingController(new BookingService(req.tenantDb));
    ctrl.router(req, res, next);
  });

  app.use('/api/payment-sources', (req, res, next) => {
    const ctrl = new PaymentSourceController(new PaymentSourceService(req.tenantDb));
    ctrl.router(req, res, next);
  });

  app.use('/api/analytics', (req, res, next) => {
    const ctrl = new AnalyticsController(new AnalyticsService(req.tenantDb));
    ctrl.router(req, res, next);
  });

  app.use('/api/tenant', (req, res, next) => {
    const ctrl = new TenantController(new TenantService());
    ctrl.router(req, res, next);
  });

  // Global error handler
  app.use(errorHandlerMiddleware);

  return app;
}
