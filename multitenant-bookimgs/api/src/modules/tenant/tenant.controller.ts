import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/BaseController';
import { TenantService } from './tenant.service';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { COUNTRY_CODES } from '../../config/countries';

const SettingsUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  country: z.enum(COUNTRY_CODES).optional(),
  timezone: z.string().optional(),
  slot_hold_minutes: z.number().int().min(5).max(240).optional(),
  booking_confirmation_sla_hours: z.number().int().min(1).max(168).optional(),
});

export class TenantController extends BaseController {
  constructor(private readonly tenantService: TenantService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.get('/settings', requireAuth, this.bind(this.getSettings));
    this.router.patch('/settings', requireAuth, requireRole('TENANT_OWNER'), this.bind(this.updateSettings));
  }

  private async getSettings(req: Request, res: Response): Promise<void> {
    const data = await this.tenantService.getSettings(req.tenantId);
    this.ok(res, data);
  }

  private async updateSettings(req: Request, res: Response): Promise<void> {
    const dto = SettingsUpdateSchema.parse(req.body);
    const data = await this.tenantService.updateSettings(req.tenantId, dto);
    this.ok(res, data);
  }
}
