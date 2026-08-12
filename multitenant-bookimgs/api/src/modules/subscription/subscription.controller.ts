import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/BaseController';
import { SubscriptionService } from './subscription.service';

const CreateSchema = z.object({
  tenant_id:  z.string().uuid(),
  plan:       z.enum(['MONTHLY', 'YEARLY']),
  amount:     z.number().int().positive(),
  currency:   z.string().min(3).max(3),
  starts_at:  z.string().datetime().optional(),
  reference:  z.string().optional(),
  notes:      z.string().optional(),
});

const UpdateSchema = z.object({
  plan:       z.enum(['MONTHLY', 'YEARLY']).optional(),
  status:     z.enum(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED']).optional(),
  expires_at: z.string().datetime().optional(),
  amount:     z.number().int().positive().optional(),
  currency:   z.string().min(3).max(3).optional(),
  reference:  z.string().optional(),
  notes:      z.string().optional(),
});

export class SubscriptionController extends BaseController {
  constructor(private readonly service: SubscriptionService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.get('/tenant/:tenantId', this.bind(this.listByTenant));
    this.router.get('/:id',             this.bind(this.getOne));
    this.router.post('/',               this.bind(this.create));
    this.router.patch('/:id',           this.bind(this.update));
    this.router.delete('/:id',          this.bind(this.cancel));
  }

  private async listByTenant(req: Request, res: Response): Promise<void> {
    const data = await this.service.listByTenant(req.params['tenantId'] as string);
    this.ok(res, data);
  }

  private async getOne(req: Request, res: Response): Promise<void> {
    const data = await this.service.getById(req.params['id'] as string);
    this.ok(res, data);
  }

  private async create(req: Request, res: Response): Promise<void> {
    const dto = CreateSchema.parse(req.body);
    const data = await this.service.create(dto);
    this.created(res, data);
  }

  private async update(req: Request, res: Response): Promise<void> {
    const dto = UpdateSchema.parse(req.body);
    const data = await this.service.update(req.params['id'] as string, dto);
    this.ok(res, data);
  }

  private async cancel(req: Request, res: Response): Promise<void> {
    const data = await this.service.cancel(req.params['id'] as string);
    this.ok(res, data);
  }
}
