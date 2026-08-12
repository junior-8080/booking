import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/BaseController';
import { BillingService } from './billing.service';
import { requireAuth } from '../../middleware/auth.middleware';

const PaySchema = z.object({
  email: z.string().email(),
  plan:  z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
});
const VerifySchema = z.object({ reference: z.string().min(1) });

export class BillingController extends BaseController {
  constructor(private readonly billingService: BillingService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.get('/status', requireAuth, this.bind(this.getStatus));
    this.router.post('/pay', requireAuth, this.bind(this.pay));
    this.router.post('/verify', requireAuth, this.bind(this.verify));
  }

  private async getStatus(req: Request, res: Response): Promise<void> {
    const data = await this.billingService.getStatus(req.tenantId);
    this.ok(res, data);
  }

  private async pay(req: Request, res: Response): Promise<void> {
    const { email, plan } = PaySchema.parse(req.body);
    const data = await this.billingService.initializePayment(req.tenantId, email, plan);
    this.ok(res, data);
  }

  private async verify(req: Request, res: Response): Promise<void> {
    const { reference } = VerifySchema.parse(req.body);
    await this.billingService.verifyAndActivate(req.tenantId, reference);
    this.ok(res, { activated: true });
  }
}
