import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/BaseController';
import { ServiceService } from './service.service';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const depositPercentageRefine = <T extends { deposit_type?: string; deposit_value?: number }>(d: T) =>
  d.deposit_type !== 'PERCENTAGE' || (d.deposit_value !== undefined && d.deposit_value >= 1 && d.deposit_value <= 100);

const ServiceBaseSchema = z.object({
  brand_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  image_url: z.string().url().nullish(),
  duration_minutes: z.number().int().min(1),
  price_amount: z.number().int().min(0),
  price_currency: z.string().length(3),
  deposit_type: z.enum(['PERCENTAGE', 'FIXED']),
  deposit_value: z.number().int().min(0),
});

const ServiceSchema = ServiceBaseSchema.refine(depositPercentageRefine, {
  message: 'Deposit percentage must be 1–100', path: ['deposit_value'],
});

const ServiceUpdateSchema = ServiceBaseSchema.partial().refine(depositPercentageRefine, {
  message: 'Deposit percentage must be 1–100', path: ['deposit_value'],
});

export class ServiceController extends BaseController {
  constructor(private readonly serviceService: ServiceService) {
    super();
  }

  protected registerRoutes(): void {
    // Public
    this.router.get('/', this.bind(this.list));
    this.router.get('/:id', this.bind(this.get));

    // Protected
    this.router.post('/', requireAuth, requireRole('TENANT_OWNER', 'TENANT_STAFF'), this.bind(this.create));
    this.router.patch('/:id', requireAuth, requireRole('TENANT_OWNER', 'TENANT_STAFF'), this.bind(this.update));
    this.router.delete('/:id', requireAuth, requireRole('TENANT_OWNER'), this.bind(this.remove));
  }

  private async list(req: Request, res: Response): Promise<void> {
    const includeInactive = req.query['include_inactive'] === 'true';
    const data = await this.serviceService.listServices(includeInactive);
    this.ok(res, data);
  }

  private async get(req: Request, res: Response): Promise<void> {
    const data = await this.serviceService.getService(req.params['id'] as string);
    this.ok(res, data);
  }

  private async create(req: Request, res: Response): Promise<void> {
    const dto = ServiceSchema.parse(req.body);
    const data = await this.serviceService.createService(dto);
    this.created(res, data);
  }

  private async update(req: Request, res: Response): Promise<void> {
    const dto = ServiceUpdateSchema.parse(req.body);
    const data = await this.serviceService.updateService(req.params['id'] as string, dto);
    this.ok(res, data);
  }

  private async remove(req: Request, res: Response): Promise<void> {
    await this.serviceService.deleteService(req.params['id'] as string);
    this.noContent(res);
  }
}
