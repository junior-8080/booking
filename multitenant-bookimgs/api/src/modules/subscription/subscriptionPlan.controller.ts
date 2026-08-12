import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/BaseController';
import { SubscriptionPlanService } from './subscriptionPlan.service';

const CreateSchema = z.object({
  name:        z.string().min(1),
  interval:    z.enum(['MONTHLY', 'YEARLY']),
  amount:      z.number().int().positive(),
  currency:    z.string().min(2).max(4),
  description: z.string().optional(),
  is_active:   z.boolean().optional(),
});

const UpdateSchema = CreateSchema.partial();

export class SubscriptionPlanController extends BaseController {
  constructor(private readonly service: SubscriptionPlanService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.get('/',       this.bind(this.list));
    this.router.get('/:id',    this.bind(this.getOne));
    this.router.post('/',      this.bind(this.create));
    this.router.put('/:id',    this.bind(this.replace));
    this.router.patch('/:id',  this.bind(this.update));
    this.router.delete('/:id', this.bind(this.remove));
  }

  private async list(req: Request, res: Response): Promise<void> {
    const activeOnly = req.query['active'] === 'true';
    const data = await this.service.list(activeOnly);
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

  private async replace(req: Request, res: Response): Promise<void> {
    const dto = CreateSchema.parse(req.body);
    const data = await this.service.update(req.params['id'] as string, dto);
    this.ok(res, data);
  }

  private async update(req: Request, res: Response): Promise<void> {
    const dto = UpdateSchema.parse(req.body);
    const data = await this.service.update(req.params['id'] as string, dto);
    this.ok(res, data);
  }

  private async remove(req: Request, res: Response): Promise<void> {
    await this.service.remove(req.params['id'] as string);
    this.noContent(res);
  }
}
