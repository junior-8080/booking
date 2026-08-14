import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/BaseController';
import { OnboardingService } from './onboarding.service';
import { COUNTRY_CODES } from '../../config/countries';

const RegisterSchema = z.object({
  business_name: z.string().min(2).max(80),
  logo_url: z.string().url().optional(),
  description: z.string().max(400).optional(),
  email: z.string().email(),
  password: z.string().min(8),
  owner_name: z.string().min(2).max(120),
  owner_phone: z.string().min(6).max(30),
  country: z.enum(COUNTRY_CODES),
  timezone: z.string().optional(),
});

export class OnboardingController extends BaseController {
  constructor(private readonly service: OnboardingService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.post('/register', this.bind(this.register));
  }

  private async register(req: Request, res: Response): Promise<void> {
    const data = RegisterSchema.parse(req.body);
    const result = await this.service.register(data);
    this.created(res, result);
  }
}
