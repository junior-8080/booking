import { Request, Response } from 'express';
import { BaseController } from '../../core/BaseController';
import { COUNTRIES } from '../../config/countries';

// Public, tenant-free — the single source of truth for country/timezone/
// currency data consumed by both admin-app and mobile-app (onboarding and
// Settings' location & currency section).
export class CountryController extends BaseController {
  protected registerRoutes(): void {
    this.router.get('/', this.bind(this.list));
  }

  private async list(_req: Request, res: Response): Promise<void> {
    const data = Object.entries(COUNTRIES).map(([code, c]) => ({
      code,
      name: c.name,
      currency: c.currency,
      timezones: c.timezones,
      default_timezone: c.defaultTimezone,
    }));
    this.ok(res, data);
  }
}
