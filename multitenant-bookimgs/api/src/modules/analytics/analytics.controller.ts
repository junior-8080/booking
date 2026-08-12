import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/BaseController';
import { AnalyticsService } from './analytics.service';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const PeriodSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export class AnalyticsController extends BaseController {
  constructor(private readonly analyticsService: AnalyticsService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.use(requireAuth);
    this.router.use(requireRole('TENANT_OWNER', 'TENANT_STAFF'));

    this.router.get('/summary', this.bind(this.summary));
    this.router.get('/revenue-by-service', this.bind(this.revenueByService));
    this.router.get('/bookings-over-time', this.bind(this.bookingsOverTime));
  }

  private defaultRange() {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 30);
    return { from, to };
  }

  private async summary(req: Request, res: Response): Promise<void> {
    const { from: fromStr, to: toStr } = PeriodSchema.parse(req.query);
    const defaults = this.defaultRange();
    const data = await this.analyticsService.getSummary(
      fromStr ? new Date(fromStr) : defaults.from,
      toStr ? new Date(toStr) : defaults.to,
    );
    this.ok(res, data);
  }

  private async revenueByService(req: Request, res: Response): Promise<void> {
    const { from: fromStr, to: toStr } = PeriodSchema.parse(req.query);
    const defaults = this.defaultRange();
    const data = await this.analyticsService.getRevenueByService(
      fromStr ? new Date(fromStr) : defaults.from,
      toStr ? new Date(toStr) : defaults.to,
    );
    this.ok(res, data);
  }

  private async bookingsOverTime(req: Request, res: Response): Promise<void> {
    const { from: fromStr, to: toStr } = PeriodSchema.parse(req.query);
    const groupBy = z.enum(['day', 'week', 'month']).default('day').parse(req.query['group_by']);
    const defaults = this.defaultRange();
    const data = await this.analyticsService.getBookingsByPeriod(
      fromStr ? new Date(fromStr) : defaults.from,
      toStr ? new Date(toStr) : defaults.to,
      groupBy,
    );
    this.ok(res, data);
  }
}
