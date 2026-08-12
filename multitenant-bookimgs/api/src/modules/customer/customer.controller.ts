import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/BaseController';
import { CustomerService } from './customer.service';
import { requireAuth } from '../../middleware/auth.middleware';

export class CustomerController extends BaseController {
  constructor(private readonly customerService: CustomerService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.get('/', requireAuth, this.bind(this.list));
    this.router.get('/:id', requireAuth, this.bind(this.get));
    this.router.get('/:id/history', requireAuth, this.bind(this.history));
    this.router.patch('/:id/notes', requireAuth, this.bind(this.updateNotes));
  }

  private async list(req: Request, res: Response): Promise<void> {
    const search = req.query['search'] as string | undefined;
    const data = await this.customerService.findAll(search);
    this.ok(res, data);
  }

  private async get(req: Request, res: Response): Promise<void> {
    const data = await this.customerService.findById(req.params['id'] as string);
    this.ok(res, data);
  }

  private async history(req: Request, res: Response): Promise<void> {
    const data = await this.customerService.getHistory(req.params['id'] as string);
    this.ok(res, data);
  }

  private async updateNotes(req: Request, res: Response): Promise<void> {
    const { notes } = z.object({ notes: z.string() }).parse(req.body);
    const data = await this.customerService.updateNotes(req.params['id'] as string, notes);
    this.ok(res, data);
  }
}
