import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/BaseController';
import { PaymentSourceService } from './paymentSource.service';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const CreateSchema = z.object({
  type: z.enum(['MOBILE_MONEY', 'BANK_TRANSFER', 'ZELLE', 'VENMO', 'CASH_APP', 'PAYPAL', 'CASH', 'OTHER']),
  label: z.string().min(1),
  details: z.record(z.unknown()),
  instructions: z.string().optional(),
  display_order: z.number().int().optional(),
});

export class PaymentSourceController extends BaseController {
  constructor(private readonly service: PaymentSourceService) {
    super();
  }

  protected registerRoutes(): void {
    // Public — list active payment sources
    this.router.get('/public', this.bind(this.listPublic));

    // Protected
    this.router.get('/', requireAuth, this.bind(this.list));
    this.router.post('/', requireAuth, requireRole('TENANT_OWNER'), this.bind(this.create));
    this.router.patch('/:id', requireAuth, requireRole('TENANT_OWNER'), this.bind(this.update));
    this.router.post('/reorder', requireAuth, requireRole('TENANT_OWNER'), this.bind(this.reorder));
    this.router.post('/:id/toggle', requireAuth, requireRole('TENANT_OWNER'), this.bind(this.toggle));
    this.router.delete('/:id', requireAuth, requireRole('TENANT_OWNER'), this.bind(this.remove));
  }

  private async listPublic(req: Request, res: Response): Promise<void> {
    const data = await this.service.list();
    this.ok(res, data);
  }

  private async list(req: Request, res: Response): Promise<void> {
    const data = await this.service.listAll();
    this.ok(res, data);
  }

  private async create(req: Request, res: Response): Promise<void> {
    const dto = CreateSchema.parse(req.body);
    const data = await this.service.create(dto);
    this.created(res, data);
  }

  private async update(req: Request, res: Response): Promise<void> {
    const dto = CreateSchema.partial().parse(req.body);
    const data = await this.service.update(req.params['id'] as string, dto);
    this.ok(res, data);
  }

  private async reorder(req: Request, res: Response): Promise<void> {
    const { ids } = z.object({ ids: z.array(z.string().uuid()) }).parse(req.body);
    await this.service.reorder(ids);
    this.noContent(res);
  }

  private async toggle(req: Request, res: Response): Promise<void> {
    const data = await this.service.toggleActive(req.params['id'] as string);
    this.ok(res, data);
  }

  private async remove(req: Request, res: Response): Promise<void> {
    await this.service.delete(req.params['id'] as string);
    this.noContent(res);
  }
}
