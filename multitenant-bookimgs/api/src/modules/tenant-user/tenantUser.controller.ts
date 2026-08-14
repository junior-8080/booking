import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/BaseController';
import { TenantUserService } from './tenantUser.service';
import { requireAuth } from '../../middleware/auth.middleware';

const RegisterPushTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
});

export class TenantUserController extends BaseController {
  constructor(private readonly service: TenantUserService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.post('/me/push-token', requireAuth, this.bind(this.registerPushToken));
  }

  private async registerPushToken(req: Request, res: Response): Promise<void> {
    const dto = RegisterPushTokenSchema.parse(req.body);
    const data = await this.service.registerPushToken({
      tenant_id: req.tenantId,
      tenant_user_id: req.tenantUser!.id,
      token: dto.token,
      platform: dto.platform,
    });
    this.ok(res, data);
  }
}
