import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/BaseController';
import { BrandService } from './brand.service';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const BrandSchema = z.object({
  name: z.string().min(1),
  logo_url: z.string().url().nullable().optional(),
  description: z.string().optional(),
  terms_conditions: z.string().optional(),
  whatsapp_number: z.string().regex(/^\+?[0-9\s-]{7,20}$/, 'Enter a valid phone number, e.g. +1 555 000 0000').nullable().optional(),
  is_primary: z.boolean().optional(),
});

export class BrandController extends BaseController {
  constructor(private readonly brandService: BrandService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.get('/', this.bind(this.list));
    this.router.get('/:id', this.bind(this.get));
    this.router.post('/', requireAuth, requireRole('TENANT_OWNER'), this.bind(this.create));
    this.router.patch('/:id', requireAuth, requireRole('TENANT_OWNER'), this.bind(this.update));
  }

  private async list(req: Request, res: Response): Promise<void> {
    const data = await this.brandService.list();
    this.ok(res, data);
  }

  private async get(req: Request, res: Response): Promise<void> {
    const data = await this.brandService.getById(req.params['id'] as string);
    this.ok(res, data);
  }

  private async create(req: Request, res: Response): Promise<void> {
    const dto = BrandSchema.parse(req.body);
    const data = await this.brandService.create(dto);
    this.created(res, data);
  }

  private async update(req: Request, res: Response): Promise<void> {
    const dto = BrandSchema.partial().parse(req.body);
    const data = await this.brandService.update(req.params['id'] as string, dto);
    this.ok(res, data);
  }
}
