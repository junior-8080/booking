import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/BaseController';
import { AvailabilityService } from './availability.service';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const RangeSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  slot_duration_minutes: z.number().int().min(5),
  capacity: z.number().int().min(1).default(1),
});

const RangeUpdateSchema = z.object({
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  slot_duration_minutes: z.number().int().min(5).optional(),
  capacity: z.number().int().min(1).optional(),
});

const ExceptionSchema = z.object({
  service_id: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['BLOCKED', 'CUSTOM_HOURS']),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reason: z.string().optional(),
});

export class AvailabilityController extends BaseController {
  constructor(private readonly availabilityService: AvailabilityService) {
    super();
  }

  protected registerRoutes(): void {
    // Public
    this.router.get('/slots', this.bind(this.getSlots));

    // Schedule — ranges
    this.router.get('/schedule/:serviceId', requireAuth, this.bind(this.getSchedule));
    this.router.post('/schedule/:serviceId', requireAuth, requireRole('TENANT_OWNER', 'TENANT_STAFF'), this.bind(this.createRange));
    this.router.patch('/schedule/:id', requireAuth, requireRole('TENANT_OWNER', 'TENANT_STAFF'), this.bind(this.updateRange));
    this.router.delete('/schedule/:id', requireAuth, requireRole('TENANT_OWNER', 'TENANT_STAFF'), this.bind(this.removeRange));
    this.router.delete('/schedule/:serviceId/day/:dayOfWeek', requireAuth, requireRole('TENANT_OWNER', 'TENANT_STAFF'), this.bind(this.clearDay));

    // Exceptions
    this.router.get('/exceptions/:serviceId', requireAuth, this.bind(this.getExceptions));
    this.router.post('/exceptions', requireAuth, requireRole('TENANT_OWNER', 'TENANT_STAFF'), this.bind(this.addException));
    this.router.delete('/exceptions/:id', requireAuth, requireRole('TENANT_OWNER', 'TENANT_STAFF'), this.bind(this.removeException));
  }

  private async getSlots(req: Request, res: Response): Promise<void> {
    const serviceId = z.string().uuid().parse(req.query['service_id']);
    const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query['date']);
    const slots = await this.availabilityService.computeSlots(req.tenantDb, serviceId, new Date(dateStr), req.tenant.timezone);
    this.ok(res, slots);
  }

  private async getSchedule(req: Request, res: Response): Promise<void> {
    const data = await this.availabilityService.getSchedule(req.params['serviceId'] as string);
    this.ok(res, data);
  }

  private async createRange(req: Request, res: Response): Promise<void> {
    const dto = RangeSchema.parse(req.body);
    const data = await this.availabilityService.createRange(
      req.params['serviceId'] as string,
      dto.day_of_week,
      dto.start_time,
      dto.end_time,
      dto.slot_duration_minutes,
      dto.capacity,
    );
    this.created(res, data);
  }

  private async updateRange(req: Request, res: Response): Promise<void> {
    const dto = RangeUpdateSchema.parse(req.body);
    const data = await this.availabilityService.updateRange(req.params['id'] as string, dto);
    this.ok(res, data);
  }

  private async removeRange(req: Request, res: Response): Promise<void> {
    await this.availabilityService.removeRange(req.params['id'] as string);
    this.noContent(res);
  }

  private async clearDay(req: Request, res: Response): Promise<void> {
    const dayOfWeek = z.number().int().min(0).max(6).parse(Number(req.params['dayOfWeek']));
    await this.availabilityService.clearDay(req.params['serviceId'] as string, dayOfWeek);
    this.noContent(res);
  }

  private async getExceptions(req: Request, res: Response): Promise<void> {
    const from = req.query['from'] ? new Date(req.query['from'] as string) : undefined;
    const to = req.query['to'] ? new Date(req.query['to'] as string) : undefined;
    const data = await this.availabilityService.getExceptions(req.params['serviceId'] as string, from, to);
    this.ok(res, data);
  }

  private async addException(req: Request, res: Response): Promise<void> {
    const dto = ExceptionSchema.parse(req.body);
    const data = await this.availabilityService.addException({ ...dto, date: new Date(dto.date) });
    this.created(res, data);
  }

  private async removeException(req: Request, res: Response): Promise<void> {
    await this.availabilityService.removeException(req.params['id'] as string);
    this.noContent(res);
  }
}
